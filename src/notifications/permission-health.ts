import * as Application from 'expo-application';
import * as ImagePicker from 'expo-image-picker';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import { create } from 'zustand';

import { log } from '@/lib/log';

import { CHANNELS } from './payload';
import { pushSupported } from './setup';

type Grant = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export type PermissionHealth = {
  notifications: Grant;
  /** iOS Critical Alerts entitlement granted by the user. null = not applicable. */
  criticalAlerts: boolean | null;
  /** Android: user allowed the critical channel to override Do Not Disturb. */
  dndBypass: boolean | null;
  location: Grant;
  camera: Grant;
  checkedAt: number;
};

/**
 * Degraded = this device cannot be relied on to wake the user. The server
 * is told so telecom channels stay primary for this person (MOB-ONB-05).
 */
export function isDegraded(h: PermissionHealth | null): boolean {
  if (!h || !pushSupported) return false;
  if (h.notifications !== 'granted') return true;
  if (Platform.OS === 'ios' && h.criticalAlerts === false) return true;
  if (Platform.OS === 'android' && h.dndBypass === false) return true;
  return false;
}

function grant(status: string | undefined): Grant {
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

export async function readPermissionHealth(): Promise<PermissionHealth> {
  if (!pushSupported) {
    return { notifications: 'unsupported', criticalAlerts: null, dndBypass: null, location: 'unsupported', camera: 'unsupported', checkedAt: Date.now() };
  }
  const [n, loc, cam] = await Promise.all([
    Notifications.getPermissionsAsync(),
    Location.getForegroundPermissionsAsync(),
    ImagePicker.getCameraPermissionsAsync(),
  ]);

  let notifications: Grant;
  if (Platform.OS === 'ios') {
    const s = n.ios?.status;
    notifications =
      s === Notifications.IosAuthorizationStatus.AUTHORIZED ||
      s === Notifications.IosAuthorizationStatus.PROVISIONAL ||
      s === Notifications.IosAuthorizationStatus.EPHEMERAL
        ? 'granted'
        : s === Notifications.IosAuthorizationStatus.DENIED
          ? 'denied'
          : 'undetermined';
  } else {
    notifications = grant(n.status);
  }

  let dndBypass: boolean | null = null;
  if (Platform.OS === 'android' && notifications === 'granted') {
    try {
      const ch = await Notifications.getNotificationChannelAsync(CHANNELS.critical);
      dndBypass = ch ? ch.bypassDnd : null;
    } catch (e) {
      // Unreadable channel (e.g. created without its sound resource): report unknown, never crash.
      log.warn('notifications.channelRead', e instanceof Error ? e.message : e);
    }
  }

  return {
    notifications,
    criticalAlerts: Platform.OS === 'ios' ? (n.ios?.allowsCriticalAlerts ?? false) : null,
    dndBypass,
    location: grant(loc.status),
    camera: grant(cam.status),
    checkedAt: Date.now(),
  };
}

export async function requestNotificationPermission(): Promise<void> {
  if (!pushSupported) return;
  await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
      // Granted only when the build carries Apple's Critical Alerts entitlement.
      allowCriticalAlerts: true,
    },
  });
}

/** Android: open the critical channel's settings where "Override Do Not Disturb" lives. */
export async function openDndSettings(): Promise<void> {
  if (Platform.OS !== 'android') return Linking.openSettings();
  try {
    await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.CHANNEL_NOTIFICATION_SETTINGS, {
      extra: {
        'android.provider.extra.APP_PACKAGE': Application.applicationId,
        'android.provider.extra.CHANNEL_ID': CHANNELS.critical,
      },
    });
  } catch {
    await Linking.openSettings();
  }
}

/** Android: battery optimisation can delay high-priority FCM on some OEM builds. */
export async function openBatterySettings(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
  } catch {
    await Linking.openSettings();
  }
}

export function openAppSettings(): Promise<void> {
  return Linking.openSettings();
}

type HealthState = {
  health: PermissionHealth | null;
  refresh: () => Promise<PermissionHealth>;
};

export const usePermissionHealth = create<HealthState>((set, get) => ({
  health: null,
  refresh: async () => {
    try {
      const health = await readPermissionHealth();
      set({ health });
      return health;
    } catch (e) {
      log.warn('permissions.refresh', e instanceof Error ? e.message : e);
      const fallback = get().health ?? {
        notifications: 'undetermined' as const,
        criticalAlerts: null,
        dndBypass: null,
        location: 'undetermined' as const,
        camera: 'undetermined' as const,
        checkedAt: Date.now(),
      };
      set({ health: fallback });
      return fallback;
    }
  },
}));
