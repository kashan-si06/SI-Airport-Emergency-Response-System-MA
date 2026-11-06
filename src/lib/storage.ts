import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { SQLiteStorage } from 'expo-sqlite/kv-store';

import { getOrCreateCacheKey } from './keystore';

/**
 * Synchronous key-value store used for preferences, the encrypted query
 * cache and the offline outbox.
 *
 * Backends:
 *  - MMKV (AES-256) — development and production builds. Required for release.
 *  - SQLite KV — fallback only inside Expo Go / __DEV__, which ships without
 *    the MMKV native module. Not encrypted; never acceptable for release.
 */
export interface KVStore {
  getString(key: string): string | undefined;
  getBoolean(key: string): boolean | undefined;
  set(key: string, value: string | boolean | number): void;
  remove(key: string): void;
  clearAll(): void;
}

type MMKVModule = typeof import('react-native-mmkv');

/** Loaded lazily: importing MMKV throws when its native module is absent (Expo Go). */
function loadMMKV(): MMKVModule | null {
  try {
    return require('react-native-mmkv') as MMKVModule;
  } catch {
    return null;
  }
}

const mmkv = loadMMKV();
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const fallbackAllowed = isExpoGo || __DEV__;

export const storageBackend: 'mmkv' | 'sqlite-dev' = mmkv ? 'mmkv' : 'sqlite-dev';

class SQLiteKV implements KVStore {
  private readonly db: SQLiteStorage;
  constructor(name: string) {
    const { SQLiteStorage: Store } = require('expo-sqlite/kv-store') as typeof import('expo-sqlite/kv-store');
    this.db = new Store(name);
  }
  getString(key: string) {
    return this.db.getItemSync(key) ?? undefined;
  }
  getBoolean(key: string) {
    const v = this.db.getItemSync(key);
    return v == null ? undefined : v === 'true';
  }
  set(key: string, value: string | boolean | number) {
    this.db.setItemSync(key, String(value));
  }
  remove(key: string) {
    this.db.removeItemSync(key);
  }
  clearAll() {
    this.db.clearSync();
  }
}

function open(id: string, encryptionKey?: string | null): KVStore {
  if (mmkv) {
    return mmkv.createMMKV({
      id,
      encryptionKey: encryptionKey ?? undefined,
      encryptionType: encryptionKey ? 'AES-256' : undefined,
    });
  }
  if (!fallbackAllowed) {
    // Release builds must never hold incident data unencrypted (MOB-SEC-02).
    throw new Error('Encrypted storage (MMKV) is not available in this build.');
  }
  return new SQLiteKV(`${id}.db`);
}

/**
 * Non-sensitive device preferences (theme, onboarding flags, install id).
 * Never store incident content or tokens here.
 */
export const prefs: KVStore = open('ens.prefs');

let secure: KVStore | null = null;

/**
 * Encrypted store for cached incident data and the offline outbox
 * (PRD MOB-OFF-01, MOB-SEC-02). The AES-256 key lives in the platform
 * keystore (iOS Keychain / Android Keystore) and never touches disk in clear.
 */
export async function initSecureCache(): Promise<KVStore> {
  if (secure) return secure;
  const encryptionKey = mmkv ? await getOrCreateCacheKey() : null;
  secure = open('ens.secure', encryptionKey);
  return secure;
}

export function secureCache(): KVStore {
  if (!secure) throw new Error('Secure cache accessed before initSecureCache() resolved');
  return secure;
}

export function readJSON<T>(store: KVStore, key: string): T | undefined {
  const raw = store.getString(key);
  if (raw == null) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    store.remove(key);
    return undefined;
  }
}

export function writeJSON(store: KVStore, key: string, value: unknown): void {
  store.set(key, JSON.stringify(value));
}

/** Wipes everything tied to the signed-in user (sign-out, remote revoke). */
export function clearUserData(): void {
  secure?.clearAll();
}
