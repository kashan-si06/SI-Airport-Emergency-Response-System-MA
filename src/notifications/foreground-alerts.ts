import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useHome } from '@/api/queries';
import { alertKey, nextAlertToOpen } from '@/domain/alert-takeover';

/**
 * Opens the full-screen alert (and so its alarm) as soon as a refresh shows a
 * new alert needing a response. Push normally does this; this also covers a
 * missed push and runtimes without push, such as Expo Go.
 *
 * Only runs while the app is in the foreground. With the app closed, sound
 * can only come from a push notification.
 */
export function useForegroundAlerts() {
  const home = useHome();
  const pathname = usePathname();
  const shown = useRef(new Set<string>());

  // Saved data from an earlier session may be out of date, so wait for a live response.
  const pending = home.isFetchedAfterMount ? home.data?.pendingAck : undefined;

  useEffect(() => {
    if (!pending) return;
    if (pathname.startsWith('/alert/')) {
      // Already on screen, whether opened by a tap, a push or this hook.
      const openId = pathname.slice('/alert/'.length);
      pending.filter((i) => i.id === openId).forEach((i) => shown.current.add(alertKey(i)));
      return;
    }
    const next = nextAlertToOpen(pending, shown.current);
    if (!next || AppState.currentState !== 'active') return;
    // Deferred one tick so the navigator is mounted on a cold start.
    const t = setTimeout(() => {
      shown.current.add(alertKey(next));
      router.push({ pathname: '/alert/[id]', params: { id: next.id } });
    }, 0);
    return () => clearTimeout(t);
  }, [pending, pathname]);
}
