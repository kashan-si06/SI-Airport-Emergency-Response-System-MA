import { qk } from '@/api/queries';
import { queryClient } from '@/api/query-client';
import type { GeoPoint, Home, IncidentDetail, IncidentSummary, MyIncidentState, ResponderStatus } from '@/api/schemas';
import { newIdempotencyKey } from '@/api/client';
import { useOutbox } from '@/offline/outbox';

type AckInput = {
  notificationId: string;
  displayId: string;
  updateId: string | null;
  status: ResponderStatus;
  reason?: string | null;
  location?: GeoPoint | null;
};

/**
 * Records a responder status. Any status counts as acknowledgement
 * (PRD §5.8): first valid response stops retries and escalation for this
 * person. The UI reflects it instantly; delivery to AOCC is tracked by the
 * outbox and labelled until confirmed (MOB-OFF-03).
 */
export function submitResponderStatus(input: AckInput) {
  const occurredAt = new Date().toISOString();

  const patchMy = (my: MyIncidentState): MyIncidentState => ({
    ...my,
    recipientStatus: 'ACKNOWLEDGED',
    // Re-acknowledging a new stage does not undo being on the way or on scene (the server keeps it too).
    responderStatus: input.status === 'ACKNOWLEDGED' && (my.responderStatus === 'RESPONDING' || my.responderStatus === 'ON_SCENE') ? my.responderStatus : input.status,
    pendingAckUpdateId: null,
    ackedAt: my.ackedAt ?? occurredAt,
    ackChannel: my.ackChannel ?? 'PUSH',
    unableReason: input.status === 'UNABLE' ? (input.reason ?? null) : null,
  });

  const patchSummary = (s: IncidentSummary): IncidentSummary =>
    s.id === input.notificationId ? { ...s, my: patchMy(s.my) } : s;

  queryClient.setQueryData<Home>(qk.home, (home) => {
    if (!home) return home;
    const acked = home.pendingAck.find((s) => s.id === input.notificationId);
    return {
      ...home,
      pendingAck: home.pendingAck.filter((s) => s.id !== input.notificationId),
      active: acked
        ? [patchSummary(acked), ...home.active.filter((s) => s.id !== input.notificationId)]
        : home.active.map(patchSummary),
    };
  });

  queryClient.setQueryData<IncidentDetail>(qk.incident(input.notificationId), (d) =>
    d ? { ...d, my: patchMy(d.my) } : d,
  );

  useOutbox.getState().enqueue({
    kind: 'ack',
    key: newIdempotencyKey(),
    payload: {
      notificationId: input.notificationId,
      displayId: input.displayId,
      updateId: input.updateId,
      status: input.status,
      reason: input.reason ?? null,
      location: input.location ?? null,
      occurredAt,
    },
  });
}
