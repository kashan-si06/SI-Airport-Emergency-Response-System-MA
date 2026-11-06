import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useIncident, useIncidentChecklists } from '@/api/queries';
import { useCan, useSession } from '@/auth/session';
import { submitTaskAction, type TaskAction } from '@/features/checklists/actions';
import { AttachmentsGrid } from '@/features/incidents/attachments-grid';
import { PhotoStrip } from '@/features/media/photo-strip';
import { isLive, taskStatusMeta } from '@/domain/presentation';
import { formatDateTime } from '@/domain/time';
import { haptic } from '@/lib/haptics';
import type { LocalAttachment } from '@/offline/outbox';
import { useColors } from '@/theme/theme';
import { gutter, space } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { Banner, ErrorState, SkeletonRows } from '@/ui/feedback';
import { TextField } from '@/ui/field';
import { Section } from '@/ui/list';
import { PageHead } from '@/ui/page-head';
import { ScrollScreen } from '@/ui/screen';
import { Tag } from '@/ui/tags';
import { Text } from '@/ui/text';
import { toast } from '@/ui/toast';

export default function TaskDetail() {
  const { id, taskId, checklistId } = useLocalSearchParams<{ id: string; taskId: string; checklistId: string }>();
  const colors = useColors();
  const me = useSession((s) => s.me);
  const incident = useIncident(id);
  const checklists = useIncidentChecklists(id);
  const canReopen = useCan('incident.update');

  const [mode, setMode] = useState<'complete' | 'skip'>('complete');
  const [remarks, setRemarks] = useState('');
  const [skipReason, setSkipReason] = useState('');
  const [photos, setPhotos] = useState<LocalAttachment[]>([]);
  const [touched, setTouched] = useState(false);

  const checklist = checklists.data?.find((c) => c.id === checklistId);
  const task = checklist?.tasks.find((t) => t.id === taskId);

  if (!task || !checklist) {
    if (checklists.isPending) return <SkeletonRows rows={4} />;
    return <ErrorState error={checklists.error ?? new Error('This step is no longer part of the checklist.')} onRetry={() => void checklists.refetch()} />;
  }

  const live = incident.data ? isLive(incident.data.status) : true;
  const editable = live && task.status === 'PENDING';
  const m = taskStatusMeta[task.status];
  const doneByOther = task.status !== 'PENDING' && task.completedBy && task.completedBy.id !== me?.user.id;

  const photoMissing = task.photoRequired && photos.length === 0 && mode === 'complete';
  const skipInvalid = mode === 'skip' && skipReason.trim().length < 5;

  const act = (action: TaskAction) => {
    setTouched(true);
    if (action === 'COMPLETE' && photoMissing) return haptic.warning();
    if (action === 'SKIP' && skipInvalid) return haptic.warning();
    submitTaskAction({
      notificationId: id,
      checklistId: checklist.id,
      task,
      action,
      remarks: remarks.trim() || null,
      skipReason: action === 'SKIP' ? skipReason.trim() : null,
      attachments: photos,
    });
    haptic.success();
    toast.success(
      action === 'COMPLETE' ? 'Step completed' : action === 'SKIP' ? (task.mandatory ? 'Skip sent for IC approval' : 'Step skipped') : 'Step reopened',
      photos.length > 0 ? `${photos.length} photo${photos.length > 1 ? 's' : ''} uploading` : undefined,
    );
    router.back();
  };

  return (
    <ScrollScreen
      footer={
        editable ? (
          mode === 'complete' ? (
            <>
              <Button label="Mark complete" icon="check" variant="success" size="lg" fullWidth onPress={() => act('COMPLETE')} />
              <Button label="Can't do this step — skip" variant="ghost" onPress={() => setMode('skip')} />
            </>
          ) : (
            <>
              <Button
                label={task.mandatory ? 'Request skip approval' : 'Skip step'}
                icon="skip"
                variant="secondary"
                size="lg"
                fullWidth
                onPress={() => act('SKIP')}
              />
              <Button label="Back to complete" variant="ghost" onPress={() => setMode('complete')} />
            </>
          )
        ) : task.status !== 'PENDING' && live && canReopen ? (
          <Button label="Reopen step" icon="reopen" variant="secondary" size="lg" fullWidth onPress={() => act('REOPEN')} />
        ) : undefined
      }>
      <PageHead
        title={task.text}
        compact
        status={
          <>
            <Text variant="mono" tone="textTertiary">
              {checklist.department.code} · Step {task.order}
            </Text>
            {task.mandatory ? <Tag label="Mandatory" fg="danger" /> : null}
            {task.photoRequired ? <Tag label="Photo required" fg="textSecondary" /> : null}
          </>
        }>
        <Text variant="subhead" tone="textSecondary">
          <Text variant="subhead" style={{ color: colors[m.fg] }}>
            {m.label}
          </Text>
          {task.estMinutes ? ` · est. ${task.estMinutes} min` : ''}
          {task.assigneeRole ? ` · ${task.assigneeRole}` : ''}
        </Text>
      </PageHead>

      {task.tip ? (
        <Section title="SOP tip">
          <View style={styles.pad}>
            <Text variant="callout">{task.tip}</Text>
          </View>
        </Section>
      ) : null}

      {doneByOther ? (
        <Banner
          tone="info"
          icon="people"
          title={`${m.label} by ${task.completedBy!.name}`}
          message={`${formatDateTime(task.completedAt)} — no further action needed from you.`}
        />
      ) : null}

      {task.status === 'SKIPPED' && task.skipReason ? (
        <Section title="Skip reason">
          <View style={styles.pad}>
            <Text variant="callout">{task.skipReason}</Text>
            {task.mandatory ? (
              <Text variant="footnote" tone={task.skipApprovedBy ? 'textSecondary' : 'caution'}>
                {task.skipApprovedBy ? `Approved by ${task.skipApprovedBy.name}` : 'Awaiting Incident Commander approval'}
              </Text>
            ) : null}
          </View>
        </Section>
      ) : null}

      {task.remarks && !editable ? (
        <Section title="Remarks">
          <View style={styles.pad}>
            <Text variant="callout">{task.remarks}</Text>
          </View>
        </Section>
      ) : null}

      {editable ? (
        <View style={styles.form}>
          {mode === 'complete' ? (
            <>
              <PhotoStrip photos={photos} onChange={setPhotos} max={5} required={task.photoRequired} />
              {touched && photoMissing ? (
                <Text variant="footnote" tone="danger">
                  This step needs at least one photo as evidence.
                </Text>
              ) : null}
            </>
          ) : (
            <>
              {task.mandatory ? (
                <Banner flush tone="caution" icon="warning" title="Mandatory step" message="Skipping needs Incident Commander approval. The step stays open until approved." />
              ) : null}
              <TextField
                label="Reason for skipping"
                required
                value={skipReason}
                onChangeText={setSkipReason}
                maxLength={300}
                multiline
                placeholder="e.g. Not applicable — no fuel spill observed"
                error={touched && skipInvalid ? 'Give a reason of at least 5 characters.' : null}
              />
            </>
          )}
          <TextField label="Remarks" value={remarks} onChangeText={setRemarks} maxLength={300} multiline placeholder="Optional notes for command" />
        </View>
      ) : null}

      {task.attachments.length > 0 ? (
        <Section title="Evidence">
          <View style={{ paddingVertical: space[3] }}>
            <AttachmentsGrid items={task.attachments} />
          </View>
        </Section>
      ) : null}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: gutter, paddingVertical: space[4], gap: space[1] },
  form: { paddingHorizontal: gutter, paddingVertical: space[4], gap: space[5] },
});
