import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { appVersion } from '@/api/client';
import { deviceApi } from '@/api/endpoints';
import { installationId } from '@/lib/installation';
import { log } from '@/lib/log';

import type { PermissionHealth } from './permission-health';
import { pushSupported } from './setup';

export { installationId };


/**
 * Registers (or refreshes) this device with ENS: native FCM/APNs token plus
 * the permission picture, so the server knows whether app alerts are reliable
 * for this person (MOB-ONB-02, MOB-ONB-05).
 */
export async function registerDevice(health: PermissionHealth) {
  if (!pushSupported) return null;
  let pushToken: string | null = null;
  if (health.notifications === 'granted' && Device.isDevice) {
    try {
      pushToken = (await Notifications.getDevicePushTokenAsync()).data as string;
    } catch (e) {
      log.warn('push.token', e instanceof Error ? e.message : e);
    }
  }
  const device = await deviceApi.register({
    installationId: installationId(),
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    pushToken,
    pushProvider: pushToken ? (Platform.OS === 'ios' ? 'apns' : 'fcm') : null,
    model: Device.modelName,
    osVersion: Device.osVersion,
    appVersion: `${appVersion} (${Application.nativeBuildVersion ?? '0'})`,
    permissions: {
      notifications: health.notifications === 'granted',
      criticalAlerts: health.criticalAlerts,
      dndBypass: health.dndBypass,
      batteryUnrestricted: null,
      location: health.location === 'granted',
      camera: health.camera === 'granted',
    },
  });
  log.info('device.registered', { verified: !!device.verifiedAt, degraded: device.degraded });
  return device;
}
