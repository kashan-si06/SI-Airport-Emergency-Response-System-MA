import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * ENS Mobile app configuration.
 *
 * ENS_IOS_CRITICAL_ALERTS=1 adds Apple's Critical Alerts entitlement. Only set
 * it once Apple has granted the entitlement to the team (PRD MOB-PUSH-02);
 * provisioning fails without it. Until then iOS falls back to time-sensitive
 * notifications, and IVRS stays mandatory for Critical alerts.
 */
const criticalAlerts = process.env.ENS_IOS_CRITICAL_ALERTS === '1';
const bundleId = process.env.ENS_BUNDLE_ID ?? 'in.sourceintegreta.ens';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'ENS',
  slug: 'ens-mobile',
  version: '1.0.0',
  orientation: 'default',
  icon: './assets/images/icon.png',
  scheme: bundleId,
  userInterfaceStyle: 'dark',
  backgroundColor: '#08090B',
  ios: {
    bundleIdentifier: bundleId,
    supportsTablet: true,
    icon: './assets/expo.icon',
    entitlements: {
      'aps-environment': 'production',
      ...(criticalAlerts ? { 'com.apple.developer.usernotifications.critical-alerts': true } : {}),
      'com.apple.developer.usernotifications.time-sensitive': true,
    },
    infoPlist: {
      UIBackgroundModes: ['remote-notification', 'audio'],
      ITSAppUsesNonExemptEncryption: false,
    },
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
    },
  },
  android: {
    package: bundleId,
    adaptiveIcon: {
      backgroundColor: '#08090B',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: true,
    permissions: ['android.permission.ACCESS_NOTIFICATION_POLICY', 'android.permission.VIBRATE'],
    blockedPermissions: ['android.permission.RECORD_AUDIO', 'android.permission.ACCESS_BACKGROUND_LOCATION'],
  },
  web: {
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#08090B',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    'expo-secure-store',
    [
      'expo-notifications',
      {
        color: '#CF1A20',
        sounds: ['./assets/sounds/ens_critical.wav', './assets/sounds/ens_high.wav', './assets/sounds/ens_drill.wav', './assets/sounds/ens_info.wav'],
        enableBackgroundRemoteNotifications: true,
      },
    ],
    [
      'expo-image-picker',
      {
        cameraPermission: 'ENS uses the camera to attach photo evidence to checklist steps and field reports.',
        photosPermission: 'ENS lets you attach existing photos to checklist steps and field reports.',
        microphonePermission: false,
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'ENS attaches your position to field reports and "On scene" updates only when you choose. It never tracks you in the background.',
        isIosBackgroundLocationEnabled: false,
        isAndroidBackgroundLocationEnabled: false,
      },
    ],
    ['expo-local-authentication', { faceIDPermission: 'ENS uses Face ID to unlock the app and to confirm operator actions.' }],
    ['expo-audio', { microphonePermission: false, recordAudioAndroid: false, enableBackgroundPlayback: false }],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    ...config.extra,
    eas: { projectId: '6f40bfa8-cf9f-46ef-9eb0-68cebac53733' },
  },
});
