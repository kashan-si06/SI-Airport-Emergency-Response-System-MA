import { newIdempotencyKey } from '@/api/client';
import { qk } from '@/api/queries';
import { queryClient } from '@/api/query-client';
import type { DeptStatus, IncidentChecklist, Me, Task } from '@/api/schemas';
import { useSession } from '@/auth/session';
import { useOutbox, type LocalAttachment } from '@/offline/outbox';

export type TaskAction = 'COMPLETE' | 'SKIP' | 'REOPEN';

/** A checklist may move to Completed only when every mandatory step is closed (FR-CHK-05). */
export function mandatoryOpen(tasks: Task[]): number {
  return tasks.filter((t) => t.mandatory && t.status === 'PENDING').length;
}

function patchChecklist(notificationId: string, checklistId: string, fn: (c: IncidentChecklist) => IncidentChecklist) {
  queryClient.setQueryData<IncidentChecklist[]>(qk.incidentChecklists(notificationId), (list) =>
    list?.map((c) => (c.id === checklistId ? fn(c) : c)),
  );
}

export function submitTaskAction(args: {
  notificationId: string;
  checklistId: string;
  task: Task;
  action: TaskAction;
  remarks: string | null;
  skipReason: string | null;
  attachments: LocalAttachment[];
}) {
  const me = useSession.getState().me as Me | null;
  const occurredAt = new Date().toISOString();
  // A mandatory skip is only a request; the step stays open until the IC approves (FR-CHK-03).
  const nextStatus: Task['status'] =
    args.action === 'COMPLETE' ? 'COMPLETED' : args.action === 'SKIP' && !args.task.mandatory ? 'SKIPPED' : 'PENDING';

  patchChecklist(args.notificationId, args.checklistId, (c) => ({
    ...c,
    tasks: c.tasks.map((t) =>
      t.id === args.task.id
        ? {
            ...t,
            status: nextStatus,
            remarks: args.remarks ?? t.remarks,
            skipReason: args.action === 'SKIP' ? args.skipReason : null,
            completedBy: nextStatus === 'PENDING' || !me ? null : { id: me.user.id, name: me.user.name },
            completedAt: nextStatus === 'PENDING' ? null : occurredAt,
          }
        : t,
    ),
  }));

  useOutbox.getState().enqueue({
    kind: 'task',
    key: newIdempotencyKey(),
    payload: {
      notificationId: args.notificationId,
      taskId: args.task.id,
      taskText: args.task.text,
      action: args.action,
      remarks: args.remarks,
      skipReason: args.skipReason,
      attachments: args.attachments,
      expectedVersion: args.task.version,
      occurredAt,
    },
  });
}

export function submitDeptStatus(notificationId: string, checklistId: string, status: DeptStatus) {
  patchChecklist(notificationId, checklistId, (c) => ({ ...c, deptStatus: status }));
  useOutbox.getState().enqueue({
    kind: 'deptStatus',
    key: newIdempotencyKey(),
    payload: { notificationId, checklistId, status, occurredAt: new Date().toISOString() },
  });
}
