import { onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { useOutbox } from './outbox';

const RETRY_MS = 15_000;

/** Replays the outbox on reconnect, on foreground, and on a timer while items wait. */
export function useOutboxSync() {
  const pending = useOutbox((s) => s.items.some((i) => !i.failed));

  useEffect(() => {
    const flush = () => void useOutbox.getState().flush();
    const net = Network.addNetworkStateListener((s) => {
      if (s.isConnected) flush();
    });
    const app = AppState.addEventListener('change', (s) => {
      if (s === 'active') flush();
    });
    flush();
    return () => {
      net.remove();
      app.remove();
    };
  }, []);

  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => void useOutbox.getState().flush(), RETRY_MS);
    return () => clearInterval(t);
  }, [pending]);
}

/** Online state as TanStack Query sees it (shared single source). */
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
    () => true,
  );
}
