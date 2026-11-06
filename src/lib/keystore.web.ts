/**
 * Web build is a development preview only — ENS ships to Android and iOS
 * (PRD §7.1). Browsers have no hardware keystore, so secrets are held in
 * sessionStorage (cleared when the tab closes) and the cache is unencrypted.
 */
const store = typeof window !== 'undefined' ? window.sessionStorage : undefined;

export async function getSecret(key: string): Promise<string | null> {
  return store?.getItem(key) ?? null;
}

export async function setSecret(key: string, value: string): Promise<void> {
  store?.setItem(key, value);
}

export async function deleteSecret(key: string): Promise<void> {
  store?.removeItem(key);
}

export async function getOrCreateCacheKey(): Promise<string | null> {
  return null;
}
