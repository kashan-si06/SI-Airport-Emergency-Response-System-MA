import * as LocalAuthentication from 'expo-local-authentication';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { create } from 'zustand';

import { log } from '@/lib/log';

/**
 * App lock (PRD MOB-ONB-06): after N minutes in the background the app
 * requires biometrics / device credential. The full-screen alert and the
 * Acknowledge action are exempt so a locked phone never delays a response.
 */

type LockState = {
  locked: boolean;
  backgroundedAt: number | null;
  lock: () => void;
  unlock: () => Promise<boolean>;
};

export const useAppLock = create<LockState>((set) => ({
  locked: false,
  backgroundedAt: null,
  lock: () => set({ locked: true }),
  unlock: async () => {
    const ok = await authenticate('Unlock ENS');
    if (ok) set({ locked: false });
    return ok;
  },
}));

export async function deviceSupportsAuth(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const level = await LocalAuthentication.getEnrolledLevelAsync();
  return level !== LocalAuthentication.SecurityLevel.NONE;
}

/**
 * Biometric / passcode prompt. Also used to re-authenticate before an
 * operator sends Update, Termination or Ignore from mobile (MOB-OPS-03).
 * Devices with no credential enrolled cannot be gated; that is reported to
 * the caller as success but logged for the device-compliance report.
 */
export async function authenticate(promptMessage: string): Promise<boolean> {
  if (!(await deviceSupportsAuth())) {
    log.warn('auth.noDeviceCredential');
    return true;
  }
  const r = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });
  return r.success;
}

export function useAppLockTimer(minutes: number | undefined) {
  useEffect(() => {
    if (Platform.OS === 'web' || !minutes) return;
    const sub = AppState.addEventListener('change', async (state) => {
      const s = useAppLock.getState();
      if (state === 'background') {
        useAppLock.setState({ backgroundedAt: Date.now() });
      } else if (state === 'active' && s.backgroundedAt) {
        const away = Date.now() - s.backgroundedAt;
        useAppLock.setState({ backgroundedAt: null });
        if (away >= minutes * 60_000 && (await deviceSupportsAuth())) s.lock();
      }
    });
    return () => sub.remove();
  }, [minutes]);
}
