import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { log } from '@/lib/log';

import { ACTIONS, CATEGORIES, CHANNELS, parsePushData } from './payload';

export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
export const pushSupported = !isExpoGo && (Platform.OS === 'ios' || Platform.OS === 'android');

/** Why push is off on this runtime — shown wherever alert features are hidden. */
export const pushUnavailableCopy = isExpoGo
  ? {
      title: 'Running in Expo Go',
      message:
        'Push alerts, lock-screen actions and alert permissions need an ENS development or release build. Everything else works here.',
    }
  : {
      title: 'Web preview',
      message: 'Push alerts, lock-screen actions and device permissions are available only in the Android and iOS apps.',
    };

/**
 * Foreground presentation: ENS alerts are shown by the in-app full-screen
 * alert instead of a banner, so the banner is suppressed for ALERT/REALERT
 * and the in-app alarm takes over (see notifications/wiring.ts).
 */
export function installForegroundHandler() {
  if (!pushSupported) return;
  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      const data = parsePushData(n.request.content.data);
      const takeover = data?.type === 'ALERT' || data?.type === 'REALERT';
      return {
        shouldShowBanner: !takeover,
        shouldShowList: true,
        shouldPlaySound: !takeover,
        shouldSetBadge: true,
      };
    },
  });
}

/**
 * Android channels (MOB-PUSH-03). Critical and High request DND bypass and
 * alarm audio usage; Android honours bypass only once the user grants
 * "Override Do Not Disturb", which onboarding walks them through.
 */
export async function ensureChannels() {
  if (!pushSupported || Platform.OS !== 'android') return;
  const alarmAudio = {
    usage: Notifications.AndroidAudioUsage.ALARM,
    contentType: Notifications.AndroidAudioContentType.SONIFICATION,
    flags: { enforceAudibility: true, requestHardwareAudioVideoSynchronization: false },
  };
  try {
    await Notifications.setNotificationChannelAsync(CHANNELS.critical, {
      name: 'Critical emergency alerts',
      description: 'Life-safety alerts. Sounds even in Do Not Disturb when permitted.',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'ens_critical.wav',
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      vibrationPattern: [0, 800, 300, 800, 300, 800],
      audioAttributes: alarmAudio,
      enableVibrate: true,
      lightColor: '#FF4D4F',
    });
    await Notifications.setNotificationChannelAsync(CHANNELS.high, {
      name: 'High-severity alerts',
      description: 'Urgent operational alerts that require acknowledgement.',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'ens_high.wav',
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      vibrationPattern: [0, 500, 250, 500],
      audioAttributes: alarmAudio,
      enableVibrate: true,
      lightColor: '#FF8A3D',
    });
    await Notifications.setNotificationChannelAsync(CHANNELS.standard, {
      name: 'Updates and broadcasts',
      description: 'Incident updates, stand-downs and coordinator broadcasts.',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'ens_info.wav',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
    await Notifications.setNotificationChannelAsync(CHANNELS.drill, {
      name: 'Drills and exercises',
      description: 'Exercise traffic. Uses a softer tone and never bypasses Do Not Disturb.',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'ens_drill.wav',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
  } catch (e) {
    log.error('notifications.channels', e instanceof Error ? e.message : e);
  }
}

/**
 * Lock-screen actions (MOB-PUSH-05). Acknowledge and Responding work without
 * unlocking; Unable opens the app so a reason can be captured.
 */
export async function ensureCategories() {
  if (!pushSupported) return;
  try {
    await Notifications.setNotificationCategoryAsync(
      CATEGORIES.alert,
      [
        {
          identifier: ACTIONS.acknowledge,
          buttonTitle: 'Acknowledge',
          options: { opensAppToForeground: false, isAuthenticationRequired: false, isDestructive: false },
        },
        {
          identifier: ACTIONS.responding,
          buttonTitle: 'Responding',
          options: { opensAppToForeground: false, isAuthenticationRequired: false, isDestructive: false },
        },
        {
          identifier: ACTIONS.unable,
          buttonTitle: 'Unable…',
          options: { opensAppToForeground: true, isAuthenticationRequired: false, isDestructive: true },
        },
      ],
      { previewPlaceholder: 'Emergency alert', showTitle: true, allowAnnouncement: true },
    );
    if (Platform.OS === 'ios') {
      await Notifications.setNotificationCategoryAsync(CATEGORIES.info, [], { showTitle: true });
    }
  } catch (e) {
    log.error('notifications.categories', e instanceof Error ? e.message : e);
  }
}
