import { create } from 'zustand';

import { uploadBinary } from '@/api/client';
import { attachmentApi, checklistApi, fieldReportApi, incidentApi, meApi, type FieldReportInput } from '@/api/endpoints';
import { ApiError } from '@/api/errors';
import { qk } from '@/api/queries';
import { queryClient } from '@/api/query-client';
import type { DeptStatus, GeoPoint, ResponderStatus } from '@/api/schemas';
import { log } from '@/lib/log';
import { readJSON, secureCache, writeJSON } from '@/lib/storage';

/**
 * Offline outbox (PRD MOB-OFF-02/03, MOB-RSE-05).
 *
 * Every user action that changes server state is written here first with
 * the device timestamp it happened at, then replayed in order. Each item
 * carries an idempotency key, so a request that reached the server but whose
 * response was lost is safely re-sent.
 */

export type LocalAttachment = {
  localUri: string;
  mime: string;
  size: number;
  takenAt: string | null;
  /** Set once uploaded so retries never upload twice. */
  attachmentId?: string;
};

type Base = { id: string; key: string; createdAt: string; attempts: number; lastError: string | null; failed: boolean };

export type OutboxItem = Base &
  (
    | {
        kind: 'ack';
        payload: {
          notificationId: string;
          displayId: string;
          updateId: string | null;
          status: ResponderStatus;
          reason: string | null;
          location: GeoPoint | null;
          occurredAt: string;
        };
      }
    | {
        kind: 'task';
        payload: {
          notificationId: string;
          taskId: string;
          taskText: string;
          action: 'COMPLETE' | 'SKIP' | 'REOPEN';
          remarks: string | null;
          skipReason: string | null;
          attachments: LocalAttachment[];
          expectedVersion: number;
          occurredAt: string;
        };
      }
    | {
        kind: 'deptStatus';
        payload: { notificationId: string; checklistId: string; status: DeptStatus; occurredAt: string };
      }
    | {
        kind: 'fieldReport';
        payload: { input: Omit<FieldReportInput, 'attachmentIds'>; attachments: LocalAttachment[] };
      }
    | { kind: 'duty'; payload: { onDuty: boolean } }
  );

export type NewOutboxItem = Omit<OutboxItem, keyof Base> & { key: string };

const STORE_KEY = 'ens.outbox.v1';

type State = {
  items: OutboxItem[];
  flushing: boolean;
  hydrate: () => void;
  enqueue: (item: NewOutboxItem) => OutboxItem;
  discard: (id: string) => void;
  retry: (id: string) => void;
  flush: () => Promise<void>;
  reset: () => void;
};

function persist(items: OutboxItem[]) {
  writeJSON(secureCache(), STORE_KEY, items);
}

let seq = 0;
const newId = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`;

export const useOutbox = create<State>((set, get) => ({
  items: [],
  flushing: false,

  hydrate: () => {
    set({ items: readJSON<OutboxItem[]>(secureCache(), STORE_KEY) ?? [] });
  },

  enqueue: (input) => {
    const item = {
      ...input,
      id: newId(),
      createdAt: new Date().toISOString(),
      attempts: 0,
      lastError: null,
      failed: false,
    } as OutboxItem;
    const items = [...get().items, item];
    persist(items);
    set({ items });
    void get().flush();
    return item;
  },

  discard: (id) => {
    const items = get().items.filter((i) => i.id !== id);
    persist(items);
    set({ items });
  },

  retry: (id) => {
    const items = get().items.map((i) => (i.id === id ? { ...i, failed: false, lastError: null } : i));
    persist(items);
    set({ items });
    void get().flush();
  },

  flush: async () => {
    if (get().flushing) return;
    set({ flushing: true });
    try {
      // FIFO; a transient failure halts the run so causal order is preserved.
      for (const item of get().items.filter((i) => !i.failed)) {
        try {
          await execute(item, (patch) => update(item.id, patch));
          remove(item.id);
          onSynced(item);
        } catch (e) {
          const err = e instanceof ApiError ? e : new ApiError('server', e instanceof Error ? e.message : 'Unknown error');
          log.warn('outbox.failed', { kind: item.kind, error: err.kind, attempts: item.attempts + 1 });
          if (err.transient || err.kind === 'unauthorized') {
            update(item.id, { attempts: item.attempts + 1, lastError: err.message });
            break;
          }
          // Permanent: surface to the user; do not block later items.
          update(item.id, { attempts: item.attempts + 1, lastError: err.message, failed: true });
          onRejected(item);
        }
      }
    } finally {
      set({ flushing: false });
    }
  },

  reset: () => {
    persist([]);
    set({ items: [] });
  },
}));

function update(id: string, patch: Partial<OutboxItem>) {
  const items = useOutbox.getState().items.map((i) => (i.id === id ? ({ ...i, ...patch } as OutboxItem) : i));
  persist(items);
  useOutbox.setState({ items });
}

function remove(id: string) {
  const items = useOutbox.getState().items.filter((i) => i.id !== id);
  persist(items);
  useOutbox.setState({ items });
}

async function uploadAll(
  attachments: LocalAttachment[],
  owner: { ownerType: 'TASK' | 'FIELD_REPORT'; ownerId: string | null },
  save: (next: LocalAttachment[]) => void,
): Promise<string[]> {
  const next = [...attachments];
  for (let i = 0; i < next.length; i++) {
    const a = next[i];
    if (a.attachmentId) continue;
    const ticket = await attachmentApi.createUpload({ ...owner, mime: a.mime, size: a.size, takenAt: a.takenAt });
    await uploadBinary(ticket.uploadUrl, a.localUri, a.mime, ticket.method, ticket.headers);
    await attachmentApi.confirm(ticket.attachmentId);
    next[i] = { ...a, attachmentId: ticket.attachmentId };
    save(next);
  }
  return next.map((a) => a.attachmentId!);
}

async function execute(item: OutboxItem, patch: (p: Partial<OutboxItem>) => void): Promise<void> {
  switch (item.kind) {
    case 'ack': {
      const p = item.payload;
      await incidentApi.ack(
        {
          notificationId: p.notificationId,
          updateId: p.updateId,
          status: p.status,
          reason: p.reason,
          location: p.location,
          occurredAt: p.occurredAt,
        },
        item.key,
      );
      return;
    }
    case 'task': {
      const p = item.payload;
      const attachmentIds = await uploadAll(p.attachments, { ownerType: 'TASK', ownerId: p.taskId }, (attachments) =>
        patch({ payload: { ...p, attachments } } as Partial<OutboxItem>),
      );
      await checklistApi.updateTask(
        p.taskId,
        {
          action: p.action,
          remarks: p.remarks,
          skipReason: p.skipReason,
          attachmentIds,
          occurredAt: p.occurredAt,
          expectedVersion: p.expectedVersion,
        },
        item.key,
      );
      return;
    }
    case 'deptStatus': {
      const p = item.payload;
      await checklistApi.setDeptStatus(p.checklistId, { status: p.status, occurredAt: p.occurredAt }, item.key);
      return;
    }
    case 'fieldReport': {
      const p = item.payload;
      const attachmentIds = await uploadAll(p.attachments, { ownerType: 'FIELD_REPORT', ownerId: null }, (attachments) =>
        patch({ payload: { ...p, attachments } } as Partial<OutboxItem>),
      );
      await fieldReportApi.create({ ...p.input, attachmentIds }, item.key);
      return;
    }
    case 'duty': {
      await meApi.setDuty(item.payload.onDuty, item.key);
      return;
    }
  }
}

function invalidateFor(item: OutboxItem) {
  switch (item.kind) {
    case 'ack':
      void queryClient.invalidateQueries({ queryKey: qk.home });
      void queryClient.invalidateQueries({ queryKey: qk.incident(item.payload.notificationId) });
      return;
    case 'task':
    case 'deptStatus':
      void queryClient.invalidateQueries({ queryKey: qk.incidentChecklists(item.payload.notificationId) });
      void queryClient.invalidateQueries({ queryKey: ['checklists'] });
      void queryClient.invalidateQueries({ queryKey: qk.command(item.payload.notificationId) });
      return;
    case 'fieldReport':
      void queryClient.invalidateQueries({ queryKey: ['fieldReports'] });
      return;
    case 'duty':
      void queryClient.invalidateQueries({ queryKey: qk.me });
      void queryClient.invalidateQueries({ queryKey: qk.home });
      return;
  }
}

function onSynced(item: OutboxItem) {
  log.info('outbox.synced', { kind: item.kind });
  invalidateFor(item);
}

function onRejected(item: OutboxItem) {
  // Server state wins: drop optimistic values and refetch.
  invalidateFor(item);
}

/* ───────────── selectors ───────────── */

export const selectPendingAck = (notificationId: string) => (s: State) =>
  s.items.find((i) => i.kind === 'ack' && i.payload.notificationId === notificationId) as
    | Extract<OutboxItem, { kind: 'ack' }>
    | undefined;

export const selectPendingTasks = (notificationId: string) => (s: State) =>
  s.items.filter((i): i is Extract<OutboxItem, { kind: 'task' }> => i.kind === 'task' && i.payload.notificationId === notificationId);

export const selectPendingCount = (s: State) => s.items.filter((i) => !i.failed).length;
export const selectFailed = (s: State) => s.items.filter((i) => i.failed);
