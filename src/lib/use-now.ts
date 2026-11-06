import { useSyncExternalStore } from 'react';

import { now } from '@/domain/time';

/** One shared 1 Hz ticker for every elapsed timer on screen. */
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let current = now();

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) {
    timer = setInterval(() => {
      current = now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function useNow(): number {
  return useSyncExternalStore(subscribe, () => current, () => current);
}
