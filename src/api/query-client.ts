import { QueryClient, onlineManager, focusManager } from '@tanstack/react-query';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import * as Network from 'expo-network';
import { AppState, Platform } from 'react-native';

import { secureCache } from '@/lib/storage';

import { ApiError } from './errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      gcTime: 24 * 60 * 60 * 1000,
      networkMode: 'offlineFirst',
      retry: (count, error) => {
        if (error instanceof ApiError && !error.transient) return false;
        return count < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
    mutations: {
      networkMode: 'always',
      retry: false,
    },
  },
});

/** Keys persisted to the encrypted cache for offline reading (MOB-OFF-01). */
const PERSISTED_ROOTS = new Set(['me', 'home', 'incident', 'checklists', 'checklist', 'catalog', 'broadcasts', 'fieldReports', 'command']);

export function shouldPersistQuery(key: readonly unknown[]): boolean {
  return typeof key[0] === 'string' && PERSISTED_ROOTS.has(key[0]);
}

const CACHE_KEY = 'ens.queryCache.v1';

export function createEncryptedPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      secureCache().set(CACHE_KEY, JSON.stringify(client));
    },
    restoreClient: async () => {
      const raw = secureCache().getString(CACHE_KEY);
      if (!raw) return undefined;
      try {
        return JSON.parse(raw) as PersistedClient;
      } catch {
        secureCache().remove(CACHE_KEY);
        return undefined;
      }
    },
    removeClient: async () => {
      secureCache().remove(CACHE_KEY);
    },
  };
}

/** Bridge OS connectivity and app focus into TanStack Query. */
export function wireQueryEnvironment() {
  onlineManager.setEventListener((setOnline) => {
    const sub = Network.addNetworkStateListener((s) => {
      setOnline(!!s.isConnected && s.isInternetReachable !== false);
    });
    return () => sub.remove();
  });

  if (Platform.OS !== 'web') {
    focusManager.setEventListener((handleFocus) => {
      const sub = AppState.addEventListener('change', (state) => handleFocus(state === 'active'));
      return () => sub.remove();
    });
  }
}
