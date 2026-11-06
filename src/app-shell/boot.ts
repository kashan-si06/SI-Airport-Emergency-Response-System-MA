import { Platform } from 'react-native';

import { wireQueryEnvironment } from '@/api/query-client';
import { env } from '@/config/env';
import { log } from '@/lib/log';
import { initSecureCache } from '@/lib/storage';
import { useOutbox } from '@/offline/outbox';

/**
 * Work that must finish before the first screen renders: certificate pinning
 * (before any request leaves the device), encrypted cache, offline outbox.
 */
export async function bootstrap(): Promise<void> {
  const { apiBaseUrl, certPins, environment } = env();

  if (Platform.OS !== 'web' && certPins.length > 0) {
    // Loaded lazily: the native module is absent in Expo Go.
    const pinning = require('react-native-ssl-public-key-pinning') as typeof import('react-native-ssl-public-key-pinning');
    if (pinning.isSslPinningAvailable()) {
      const host = new URL(apiBaseUrl).hostname;
      await pinning.initializeSslPinning({ [host]: { includeSubdomains: false, publicKeyHashes: certPins } });
    } else if (environment === 'production') {
      // Production builds must never run unpinned (MOB-SEC-01).
      throw new Error('Certificate pinning is configured but unavailable in this build.');
    }
  }

  await initSecureCache();
  useOutbox.getState().hydrate();
  wireQueryEnvironment();
  log.info('boot.complete', { environment, platform: Platform.OS });
}
