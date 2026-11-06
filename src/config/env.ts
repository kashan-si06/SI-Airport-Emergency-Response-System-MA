import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { z } from 'zod';

/**
 * Build-time configuration (EXPO_PUBLIC_* is inlined by Metro).
 * The app refuses to run against an undefined backend rather than falling
 * back to sample data — see ConfigErrorScreen.
 */
const schema = z.object({
  apiBaseUrl: z.url({ message: 'EXPO_PUBLIC_ENS_API_URL must be an absolute URL' }),
  environment: z.enum(['production', 'uat', 'development']),
  /** Comma-separated base64 SPKI SHA-256 pins (≥2 on iOS). Empty disables pinning. */
  certPins: z.array(z.string()).default([]),
});

export type Env = z.infer<typeof schema>;

/**
 * Development only: on a phone or emulator `localhost` is the device itself.
 * Route localhost URLs through Metro's dev proxy (metro.config.js → /__ens),
 * i.e. the exact address the app bundle was loaded from — LAN or tunnel —
 * so no second port needs to be reachable. Never applies to release builds.
 */
function devHost(url: string | undefined): string | undefined {
  if (!__DEV__ || !url || Platform.OS === 'web') return url;
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.exec(url);
  const hostUri = Constants.expoConfig?.hostUri;
  if (!local || !hostUri) return url;
  const proto = /:\d+$/.test(hostUri) ? 'http' : 'https';
  return url.replace(local[0], `${proto}://${hostUri}/__ens`);
}

const parsed = schema.safeParse({
  apiBaseUrl: devHost(process.env.EXPO_PUBLIC_ENS_API_URL),
  environment: process.env.EXPO_PUBLIC_ENS_ENVIRONMENT ?? 'production',
  certPins: (process.env.EXPO_PUBLIC_ENS_CERT_PINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
});

export const envResult = parsed;

export function env(): Env {
  if (!parsed.success) throw new Error('ENS environment is not configured');
  return parsed.data;
}

export function envProblems(): string[] {
  return parsed.success ? [] : parsed.error.issues.map((i) => i.message);
}
