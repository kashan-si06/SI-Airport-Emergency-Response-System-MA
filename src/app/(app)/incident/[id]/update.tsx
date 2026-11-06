import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { newIdempotencyKey } from '@/api/client';
import { opsApi } from '@/api/endpoints';
import { qk, useIncident, useIncidentTemplate } from '@/api/queries';
import type { Channel, UpdateType } from '@/api/schemas';
import { DispatchPreviewPanel, useDispatchPreview } from '@/features/ops/dispatch-preview';
import { initialTagValues, ManualTagFields, missingMandatory } from '@/features/ops/manual-tags';
import { updateTypeLabel } from '@/domain/presentation';
import { haptic } from '@/lib/haptics';
import { authenticate } from '@/security/app-lock';
import { gutter, space } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { ChannelPicker } from '@/ui/channel-picker';
import { ChoiceGroup } from '@/ui/choice';
import { Banner, describeError, ErrorState, SkeletonRows } from '@/ui/feedback';
import { PageHead } from '@/ui/page-head';
import { ScrollScreen } from '@/ui/screen';
import { Text } from '@/ui/text';
import { toast } from '@/ui/toast';

export default function SendUpdate() {
  const { id, type } = useLocalSearchParams<{ id: string; type?: UpdateType }>();
  const qc = useQueryClient();
  const incident = useIncident(id);
  const template = useIncidentTemplate(id);
  const idempotencyKey = useRef(newIdempotencyKey()).current;

  const stages = useMemo(() => {
    const allowed = new Set(incident.data?.availableStages.map((s) => s.levelNo) ?? []);
    return (template.data?.levels ?? []).filter((l) => allowed.has(l.levelNo) && l.updateType !== 'INITIAL');
  }, [incident.data, template.data]);

  const [levelNo, setLevelNo] = useState<number | null>(null);
  const level = stages.find((l) => l.levelNo === levelNo) ?? null;
  const [channels, setChannels] = useState<Channel[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);

  // Preselect the stage requested by the caller (Update / AEOC / Termination).
  useEffect(() => {
    if (levelNo !== null || stages.length === 0) return;
    const pick = stages.find((s) => s.updateType === type) ?? stages[0];
    setLevelNo(pick.levelNo);
  }, [stages, type, levelNo]);

  useEffect(() => {
    if (!level) return;
    setChannels(level.channels);
    setValues(initialTagValues(level.manualTags));
    setShowErrors(false);
  }, [level?.levelNo]);

  const preview = useDispatchPreview(
    level && template.data
      ? { templateId: template.data.id, notificationId: id, levelNo: level.levelNo, channels, placeholderValues: values, scope: 'DEFAULT' }
      : null,
  );

  const send = useMutation({
    mutationFn: async () => {
      const ok = await authenticate(`Confirm ${level ? updateTypeLabel[level.updateType] : 'update'}`);
      if (!ok) throw new Error('cancelled');
      return opsApi.sendUpdate(id, { type: level!.updateType, levelNo: level!.levelNo, channels, placeholderValues: values }, idempotencyKey);
    },
    onSuccess: (detail) => {
      qc.setQueryData(qk.incident(id), detail);
      void qc.invalidateQueries({ queryKey: qk.home });
      void qc.invalidateQueries({ queryKey: qk.command(id) });
      haptic.success();
      toast.success(`${level ? updateTypeLabel[level.updateType] : 'Update'} sent`, `${detail.displayId} · ${preview.data?.recipientCount ?? ''} recipients`);
      router.back();
    },
    onError: (e) => {
      if (e instanceof Error && e.message === 'cancelled') return;
      haptic.error();
    },
  });

  if (!incident.data || !template.data) {
    if (incident.isPending || template.isPending) return <SkeletonRows rows={5} />;
    return <ErrorState error={incident.error ?? template.error} onRetry={() => void template.refetch()} />;
  }

  if (stages.length === 0) {
    return <ErrorState error={new Error('No further stages are configured on this template. Use the web console for custom messages.')} />;
  }

  const missing = level ? missingMandatory(level.manualTags, values) : [];
  const isTermination = level?.updateType === 'TERMINATION';
  const err = send.error && !(send.error instanceof Error && send.error.message === 'cancelled') ? describeError(send.error) : null;

  return (
    <>
      <Stack.Screen options={{ title: level ? updateTypeLabel[level.updateType] : 'Send update' }} />
      <ScrollScreen
        footer={
          <Button
            label={level ? `Send ${updateTypeLabel[level.updateType].toLowerCase()}` : 'Send'}
            icon="send"
            variant={isTermination ? 'success' : 'primary'}
            size="lg"
            fullWidth
            loading={send.isPending}
            caption={preview.data ? `To ${preview.data.recipientCount} people · confirm with biometrics` : undefined}
            onPress={() => {
              if (missing.length > 0) {
                setShowErrors(true);
                haptic.warning();
                return;
              }
              send.mutate();
            }}
          />
        }>
        <PageHead compact title={incident.data.title} id={incident.data.displayId} />

        {err ? <Banner tone="danger" icon="warning" title={err.title} message={err.message} /> : null}
        {isTermination ? (
          <Banner tone="info" icon="info" title="Termination stands everyone down" message="All pending retries and escalations stop. Everyone previously alerted receives it." />
        ) : null}
        {level?.updateType === 'AEOC_ACTIVATION' ? (
          <Banner tone="caution" icon="aeoc" title="Activates the AEOC" message="The AEOC member group is alerted and acknowledgement is required." />
        ) : null}

        <View style={styles.block}>
          <Text variant="section">
            Stage
          </Text>
          <ChoiceGroup<string>
            accessibilityLabel="Stage to send"
            value={levelNo !== null ? String(levelNo) : null}
            onChange={(v) => setLevelNo(Number(v))}
            options={stages.map((s) => ({
              value: String(s.levelNo),
              label: s.name,
              description: `Level ${s.levelNo} · ${s.ackRequired ? 'Acknowledgement required' : 'Information only'}`,
            }))}
          />
        </View>

        {level && level.manualTags.length > 0 ? (
          <View style={styles.block}>
            <Text variant="section">
              Incident facts
            </Text>
            <ManualTagFields tags={level.manualTags} values={values} onChange={setValues} showErrors={showErrors} />
          </View>
        ) : null}

        {level ? (
          <View style={styles.block}>
            <Text variant="section">
              Channels
            </Text>
            <ChannelPicker available={level.channels} value={channels} onChange={setChannels} />
          </View>
        ) : null}

        <View style={{ marginTop: space[6] }}>
          <DispatchPreviewPanel preview={preview.data} loading={preview.isFetching} error={preview.error} />
        </View>
      </ScrollScreen>
    </>
  );
}

const styles = StyleSheet.create({
  block: { paddingHorizontal: gutter, marginTop: space[5], gap: space[2] },
});
