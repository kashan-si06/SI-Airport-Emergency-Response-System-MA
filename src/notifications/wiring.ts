import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { deviceApi } from '@/api/endpoints';
import { qk } from '@/api/queries';
import { queryClient } from '@/api/query-client';
import type { Home } from '@/api/schemas';
import { submitResponderStatus } from '@/features/incidents/acknowledge';
import { log } from '@/lib/log';

import { stopAlarm, openAlert } from './alarm';
import { ACTIONS, parsePushData, type PushData } from './payload';
import { usePermissionHealth } from './permission-health';
import { registerDevice } from './registration';
import { ensureCategories, ensureChannels, installForegroundHandler, pushSupported } from './setup';

installForegroundHandler();

/** Test-alert receipts observed on this device (onboarding + settings). */
export const useTestAlertSignal = create<{ received: string[]; mark: (id: string) => void }>((set) => ({
  received: [],
  mark: (id) => set((s) => ({ received: [...s.received, id] })),
}));

function receipt(data: PushData, event: 'DELIVERED' | 'OPENED') {
  if (!data.notificationId) return;
  deviceApi
    .pushReceipt({ notificationId: data.notificationId, updateId: data.updateId ?? null, event, at: new Date().toISOString() })
    .catch((e) => log.warn('push.receipt', e instanceof Error ? e.message : e));
}

function refreshIncident(id: string | undefined) {
  void queryClient.invalidateQueries({ queryKey: qk.home });
  if (id) {
    void queryClient.invalidateQueries({ queryKey: qk.incident(id) });
    void queryClient.invalidateQueries({ queryKey: qk.command(id) });
  }
}

/** Clears every presented notification belonging to an incident (MOB-PUSH-09). */
async function clearPresentedFor(notificationId: string) {
  try {
    const presented = await Notifications.getPresentedNotificationsAsync();
    await Promise.all(
      presented
        .filter((n) => parsePushData(n.request.content.data)?.notificationId === notificationId)
        .map((n) => Notifications.dismissNotificationAsync(n.request.identifier)),
    );
  } catch (e) {
    log.warn('push.clear', e instanceof Error ? e.message : e);
  }
}

function onReceived(data: PushData) {
  receipt(data, 'DELIVERED');
  switch (data.type) {
    case 'ALERT':
    case 'REALERT':
      refreshIncident(data.notificationId);
      if (data.notificationId && AppState.currentState === 'active' && openAlert.id !== data.notificationId) {
        router.push({ pathname: '/alert/[id]', params: { id: data.notificationId } });
      }
      return;
    case 'IGNORE':
    case 'TERMINATION':
      if (data.notificationId) {
        stopAlarm(data.notificationId);
        void clearPresentedFor(data.notificationId);
      }
      refreshIncident(data.notificationId);
      return;
    case 'TEST':
      if (data.testId) useTestAlertSignal.getState().mark(data.testId);
      return;
    case 'BROADCAST':
      void queryClient.invalidateQueries({ queryKey: qk.broadcasts });
      refreshIncident(data.notificationId);
      return;
    case 'FIELD_REPORT':
      void queryClient.invalidateQueries({ queryKey: ['fieldReports'] });
      void queryClient.invalidateQueries({ queryKey: qk.home });
      return;
    default:
      refreshIncident(data.notificationId);
  }
}

function onResponse(response: Notifications.NotificationResponse) {
  const data = parsePushData(response.notification.request.content.data);
  if (!data) return;
  receipt(data, 'OPENED');
  const id = data.notificationId;

  if (data.type === 'TEST' && data.testId) {
    useTestAlertSignal.getState().mark(data.testId);
    return;
  }
  if (data.type === 'FIELD_REPORT' && data.fieldReportId) {
    router.push({ pathname: '/field-report/[id]', params: { id: data.fieldReportId } });
    return;
  }
  if (!id) return;

  const ackFromLockScreen = (status: 'ACKNOWLEDGED' | 'RESPONDING') => {
    submitResponderStatus({
      notificationId: id,
      displayId: data.displayId ?? id,
      updateId: data.updateId ?? null,
      status,
    });
    stopAlarm(id);
    void Notifications.dismissNotificationAsync(response.notification.request.identifier).catch(() => {});
  };

  switch (response.actionIdentifier) {
    case ACTIONS.acknowledge:
      ackFromLockScreen('ACKNOWLEDGED');
      return;
    case ACTIONS.responding:
      ackFromLockScreen('RESPONDING');
      return;
    case ACTIONS.unable:
      router.push({ pathname: '/incident/[id]/status', params: { id, preset: 'UNABLE' } });
      return;
    default: {
      const pending = queryClient.getQueryData<Home>(qk.home)?.pendingAck.some((s) => s.id === id);
      const isAlert = data.type === 'ALERT' || data.type === 'REALERT';
      if (openAlert.id === id) return;
      if (isAlert || pending) router.push({ pathname: '/alert/[id]', params: { id } });
      else router.push({ pathname: '/incident/[id]', params: { id } });
    }
  }
}

/**
 * Mounted once inside the signed-in shell. Owns channel/category setup,
 * device registration, and routing of push events.
 */
// The hook reads a native module, so web builds get a stand-in that never reports a response.
const useLastResponse: typeof Notifications.useLastNotificationResponse = pushSupported ? Notifications.useLastNotificationResponse : () => null;

export function useNotificationWiring() {
  const handled = useRef(new Set<string>());
  const lastResponse = useLastResponse();

  useEffect(() => {
    if (!pushSupported) return;
    let cancelled = false;

    (async () => {
      await ensureChannels();
      await ensureCategories();
      const health = await usePermissionHealth.getState().refresh();
      if (!cancelled) await registerDevice(health).catch((e) => log.warn('device.register', e?.message));
    })();

    let tokenSub: { remove: () => void } | null = null;
    try {
      tokenSub = Notifications.addPushTokenListener(() => {
        const h = usePermissionHealth.getState().health;
        if (h) void registerDevice(h).catch(() => {});
      });
    } catch (e) {
      log.warn('notifications.tokenListener', e instanceof Error ? e.message : e);
    }

    const recvSub = Notifications.addNotificationReceivedListener((n) => {
      const data = parsePushData(n.request.content.data);
      if (data) onReceived(data);
    });
    const respSub = Notifications.addNotificationResponseReceivedListener((r) => {
      handled.current.add(r.notification.request.identifier + r.actionIdentifier);
      onResponse(r);
    });
    // Re-check permissions every time the app returns to the foreground (MOB-ONB-05).
    const appSub = AppState.addEventListener('change', async (s) => {
      if (s !== 'active') return;
      const before = usePermissionHealth.getState().health;
      const after = await usePermissionHealth.getState().refresh();
      if (JSON.stringify({ ...before, checkedAt: 0 }) !== JSON.stringify({ ...after, checkedAt: 0 })) {
        void registerDevice(after).catch(() => {});
      }
    });

    return () => {
      cancelled = true;
      tokenSub?.remove();
      recvSub.remove();
      respSub.remove();
      appSub.remove();
    };
  }, []);

  // Cold start from a notification tap or lock-screen action.
  useEffect(() => {
    if (!lastResponse) return;
    const key = lastResponse.notification.request.identifier + lastResponse.actionIdentifier;
    if (handled.current.has(key)) return;
    handled.current.add(key);
    onResponse(lastResponse);
    void Notifications.clearLastNotificationResponseAsync().catch(() => {});
  }, [lastResponse]);
}
