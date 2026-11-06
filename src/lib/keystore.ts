import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * Hardware-backed secret storage (Keychain / Keystore).
 * `AFTER_FIRST_UNLOCK` lets push-action acknowledgements run while the device
 * is locked (PRD MOB-ONB-06: Acknowledge must not require unlock).
 */
const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

const CACHE_KEY = 'ens.cacheKey.v1';

export async function getSecret(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key, options);
}

export async function setSecret(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value, options);
}

export async function deleteSecret(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key, options);
}

export async function getOrCreateCacheKey(): Promise<string | null> {
  const existing = await getSecret(CACHE_KEY);
  if (existing) return existing;
  // MMKV AES-256 accepts keys up to 32 bytes; 24 random bytes → 32 base64 chars.
  const bytes = Crypto.getRandomBytes(24);
  const key = btoa(String.fromCharCode(...bytes));
  await setSecret(CACHE_KEY, key);
  return key;
}
