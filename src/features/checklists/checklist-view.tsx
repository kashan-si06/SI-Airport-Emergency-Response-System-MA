import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import type { DeptStatus, IncidentChecklist, Task } from '@/api/schemas';
import { taskStatusMeta } from '@/domain/presentation';
import { formatTime } from '@/domain/time';
import { haptic } from '@/lib/haptics';
import { selectPendingTasks, useOutbox } from '@/offline/outbox';
import { useColors } from '@/theme/theme';
import { gutter, space } from '@/theme/tokens';
import { ProgressBar } from '@/ui/feedback';
import { Icon } from '@/ui/icon';
import { SegmentedControl } from '@/ui/segmented';
import { Tag } from '@/ui/tags';
import { Text } from '@/ui/text';

import { mandatoryOpen, submitDeptStatus } from './actions';

type Props = {
  checklist: IncidentChecklist;
  notificationId: string;
  /** Read-only for viewers and closed incidents. */
  editable: boolean;
};

const deptOptions: { value: Exclude<DeptStatus, 'PENDING'>; label: string }[] = [
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'DEPLOYED', label: 'Deployed' },
  { value: 'COMPLETED', label: 'Completed' },
];

export function ChecklistView({ checklist, notificationId, editable }: Props) {
  const colors = useColors();
  const pending = useOutbox(useShallow(selectPendingTasks(notificationId)));
  const queuedIds = new Set(pending.map((p) => p.payload.taskId));
  const tasks = [...checklist.tasks].sort((a, b) => a.order - b.order);
  const done = tasks.filter((t) => t.status === 'COMPLETED' || t.status === 'SKIPPED').length;
  const openMandatory = mandatoryOpen(tasks);

  return (
    <View>
      <View style={styles.head}>
        <View style={styles.headLine}>
          <Text variant="mono" weight="500">
            {checklist.department.code}
          </Text>
          <Text variant="section" style={{ flex: 1 }} numberOfLines={2}>
            {checklist.title}
          </Text>
          <Text variant="mono" tone="textSecondary">
            {done}/{tasks.length}
          </Text>
        </View>
        <ProgressBar value={done} total={tasks.length} height={2} />
        {editable ? (
          <>
            <SegmentedControl
              accessibilityLabel="Department status"
              options={deptOptions}
              value={checklist.deptStatus === 'PENDING' ? 'IN_PROGRESS' : checklist.deptStatus}
              onChange={(v) => {
                if (v === 'COMPLETED' && openMandatory > 0) {
                  haptic.warning();
                  return;
                }
                submitDeptStatus(notificationId, checklist.id, v);
              }}
            />
            {openMandatory > 0 ? (
              <Text variant="footnote" tone="danger">
                {openMandatory} required step{openMandatory > 1 ? 's' : ''} open
              </Text>
            ) : null}
          </>
        ) : null}
      </View>

      <View style={[styles.list, { borderColor: colors.separator }]}>
        {tasks.map((t, i) => (
          <TaskRow
            key={t.id}
            task={t}
            first={i === 0}
            queued={queuedIds.has(t.id)}
            onPress={() =>
              router.push({ pathname: '/incident/[id]/task/[taskId]', params: { id: notificationId, taskId: t.id, checklistId: checklist.id } })
            }
          />
        ))}
      </View>
    </View>
  );
}

function TaskRow({ task: t, first, queued, onPress }: { task: Task; first: boolean; queued: boolean; onPress: () => void }) {
  const colors = useColors();
  const m = taskStatusMeta[t.status];
  const closed = t.status !== 'PENDING';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Step ${t.order}. ${t.text}. ${m.label}${t.mandatory ? ', mandatory' : ''}${queued ? ', not yet sent' : ''}`}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.task,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
        pressed && { backgroundColor: colors.surfacePressed },
      ]}>
      <View style={styles.taskIcon}>
        <Icon name={queued ? 'sync' : m.icon} size={22} color={queued ? colors.caution : colors[m.fg]} />
      </View>
      <View style={styles.taskBody}>
        <View style={styles.taskTop}>
          <Text variant="monoSmall" tone="textTertiary" dense>
            {String(t.order).padStart(2, '0')}
          </Text>
          {t.mandatory ? <Tag label="Required" fg="danger" /> : null}
          {t.photoRequired ? <Icon name="camera" size={12} color={colors.textTertiary} accessibilityLabel="Photo required" /> : null}
          {t.adHoc ? <Tag label="Added by IC" fg="textSecondary" /> : null}
          {t.estMinutes ? (
            <Text variant="monoSmall" tone="textTertiary" dense style={{ marginLeft: 'auto' }}>
              ~{t.estMinutes}m
            </Text>
          ) : null}
        </View>
        <Text
          variant="body"
          tone={closed ? 'textSecondary' : 'text'}
          style={t.status === 'COMPLETED' ? { textDecorationLine: 'line-through' } : undefined}>
          {t.text}
        </Text>
        {closed && t.completedBy ? (
          <Text variant="caption" tone="textTertiary">
            {m.label} by {t.completedBy.name} · {formatTime(t.completedAt)}
            {queued ? ' · not yet sent' : ''}
          </Text>
        ) : null}
        {t.status === 'SKIPPED' && t.skipReason ? (
          <Text variant="caption" tone="caution">
            Skipped: {t.skipReason}
          </Text>
        ) : null}
      </View>
      <Icon name="chevronRight" size={14} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: gutter, paddingVertical: space[4], gap: space[3] },
  headLine: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  list: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  task: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: gutter, paddingVertical: space[3], minHeight: 60 },
  taskIcon: { width: 26, alignItems: 'center' },
  taskBody: { flex: 1, gap: 3 },
  taskTop: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
