import * as Location from 'expo-location';

import type { GeoPoint } from '@/api/schemas';

/**
 * One-shot position for "On scene" and field reports (MOB-INC-04,
 * MOB-RSE-02). Never prompts mid-emergency and never tracks continuously
 * (PRD §1.3); returns null quickly if unavailable.
 */
export async function currentPositionIfPermitted(timeoutMs = 5000): Promise<GeoPoint | null> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== 'granted') return null;
    const last = await Location.getLastKnownPositionAsync({ maxAge: 60_000, requiredAccuracy: 100 });
    if (last) return { lat: last.coords.latitude, lng: last.coords.longitude, accuracy: last.coords.accuracy ?? null };
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((r) => setTimeout(() => r(null), timeoutMs)),
    ]);
    return pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy ?? null } : null;
  } catch {
    return null;
  }
}
