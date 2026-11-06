import { create } from 'zustand';

import { setClientListeners } from '@/api/client';
import { authApi, meApi } from '@/api/endpoints';
import { ApiError } from '@/api/errors';
import { qk } from '@/api/queries';
import { queryClient } from '@/api/query-client';
import type { LoginResult, Me, Permission } from '@/api/schemas';
import { log } from '@/lib/log';
import { clearUserData, prefs } from '@/lib/storage';
import { useOutbox } from '@/offline/outbox';

import { clearTokens, loadTokens, saveTokens } from './tokens';

const LAST_USER_KEY = 'ens.lastUserId';

type Status = 'booting' | 'signedOut' | 'signedIn';

/** Where sign-in stands after each server response. */
export type SignInStep = { step: 'done' } | { step: 'mfa'; challenge: string } | { step: 'newPassword'; challenge: string };

type SessionState = {
  status: Status;
  me: Me | null;
  /** Set when the server rejects this app build (HTTP 426, NFR-M7). */
  upgradeRequired: { minVersion: string | null } | null;
  sessionExpired: boolean;
  /** Permissions wizard + test alert completed for this user on this device. */
  onboarded: boolean;
  markOnboarded: () => void;
  boot: () => Promise<void>;
  signIn: (credentials: { username: string; password: string }) => Promise<SignInStep>;
  verifyMfa: (args: { challenge: string; code: string }) => Promise<SignInStep>;
  /** Replaces a temporary password; there is no session until this succeeds. */
  setNewPassword: (args: { challenge: string; newPassword: string }) => Promise<SignInStep>;
  changePassword: (args: { currentPassword: string; newPassword: string }) => Promise<void>;
  setMe: (me: Me) => void;
  signOut: (opts?: { expired?: boolean }) => Promise<void>;
};

export const useSession = create<SessionState>((set, get) => ({
  status: 'booting',
  me: null,
  upgradeRequired: null,
  sessionExpired: false,
  onboarded: false,

  markOnboarded: () => {
    const id = get().me?.user.id ?? prefs.getString(LAST_USER_KEY);
    if (id) prefs.set(onboardingKey(id), true);
    set({ onboarded: true });
  },

  boot: async () => {
    const tokens = await loadTokens();
    if (!tokens) {
      set({ status: 'signedOut' });
      return;
    }
    // Restored cache lets responders open the app and act with no signal.
    const cached = queryClient.getQueryData<Me>(qk.me) ?? null;
    if (cached) set({ status: 'signedIn', me: cached, onboarded: isOnboarded(cached.user.id) });
    try {
      const me = await meApi.get();
      queryClient.setQueryData(qk.me, me);
      prefs.set(LAST_USER_KEY, me.user.id);
      set({ status: 'signedIn', me, onboarded: isOnboarded(me.user.id) });
    } catch (e) {
      if (e instanceof ApiError && e.kind === 'unauthorized') {
        await get().signOut({ expired: true });
      } else if (!cached) {
        // Tokens exist but no profile and no network: stay signed in and let
        // screens show their offline states; profile loads on reconnect.
        log.warn('session.bootOffline', { kind: e instanceof ApiError ? e.kind : 'unknown' });
        set({ status: 'signedIn', me: null, onboarded: isOnboarded(prefs.getString(LAST_USER_KEY)) });
      }
    }
  },

  signIn: async (credentials) => advance(await authApi.login(credentials)),
  verifyMfa: async (args) => advance(await authApi.verifyMfa(args)),
  setNewPassword: async (args) => advance(await authApi.setNewPassword(args)),

  // The server ends every other session and this one's tokens, so the new pair replaces them.
  changePassword: async (args) => saveTokens(await authApi.changePassword(args)),

  setMe: (me) => set({ me }),

  signOut: async (opts) => {
    const tokens = await loadTokens();
    if (tokens && !opts?.expired) {
      // Server revokes refresh token and unbinds this device's push token.
      await authApi.logout(tokens.refreshToken).catch(() => { });
    }
    await clearTokens();
    useOutbox.getState().reset();
    queryClient.clear();
    clearUserData();
    set({ status: 'signedOut', me: null, onboarded: false, sessionExpired: !!opts?.expired });
  },
}));

/** Moves to the next sign-in step, or establishes the session once the server issues tokens. */
async function advance(result: LoginResult): Promise<SignInStep> {
  if ('mfaRequired' in result) return { step: 'mfa', challenge: result.challenge };
  if ('passwordChangeRequired' in result) return { step: 'newPassword', challenge: result.challenge };
  await saveTokens(result);
  try {
    const me = await meApi.get();
    queryClient.setQueryData(qk.me, me);
    prefs.set(LAST_USER_KEY, me.user.id);
    useSession.setState({ status: 'signedIn', me, sessionExpired: false, onboarded: isOnboarded(me.user.id) });
    log.info('session.signedIn', { roles: me.user.roles });
    return { step: 'done' };
  } catch (e) {
    await clearTokens();
    throw e;
  }
}

setClientListeners({
  onSessionExpired: () => {
    if (useSession.getState().status === 'signedIn') void useSession.getState().signOut({ expired: true });
  },
  onUpgradeRequired: (minVersion) => useSession.setState({ upgradeRequired: { minVersion } }),
});

/* ───────────── capabilities ───────────── */

export function useCan(permission: Permission): boolean {
  return useSession((s) => !!s.me?.permissions.includes(permission));
}

export function can(me: Me | null, permission: Permission): boolean {
  return !!me?.permissions.includes(permission);
}

/** Per-user onboarding completion (permissions wizard + test alert). */
export function onboardingKey(userId: string) {
  return `ens.onboarded.${userId}`;
}

export function isOnboarded(userId: string | undefined): boolean {
  return !!userId && prefs.getBoolean(onboardingKey(userId)) === true;
}
