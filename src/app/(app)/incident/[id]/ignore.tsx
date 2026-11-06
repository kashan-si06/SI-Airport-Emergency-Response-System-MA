import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { newIdempotencyKey } from '@/api/client';
import { opsApi } from '@/api/endpoints';
import { qk, useIncident } from '@/api/queries';
import { haptic } from '@/lib/haptics';
import { authenticate } from '@/security/app-lock';
import { gutter, space } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { ChoiceGroup } from '@/ui/choice';
import { Banner, describeError, ErrorState, SkeletonRows } from '@/ui/feedback';
import { TextField } from '@/ui/field';
import { KeyValue, Section } from '@/ui/list';
import { ScrollScreen } from '@/ui/screen';
import { Text } from '@/ui/text';
import { toast } from '@/ui/toast';

type Reason = 'FALSE_ALARM' | 'SENT_IN_ERROR' | 'DUPLICATE';

export default function IgnoreAlert() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const incident = useIncident(id);
  const key = useRef(newIdempotencyKey()).current;
  const [reason, setReason] = useState<Reason | null>(null);
  const [note, setNote] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const ignore = useMutation({
    mutationFn: async () => {
      if (!(await authenticate('Confirm retraction'))) throw new Error('cancelled');
      return opsApi.ignore(id, { reason: reason!, note: note.trim() || null }, key);
    },
    onSuccess: (detail) => {
      qc.setQueryData(qk.incident(id), detail);
      void qc.invalidateQueries({ queryKey: qk.home });
      haptic.success();
      toast.success('Alert retracted', `${detail.displayId} · retraction sent on every channel`);
      router.back();
    },
    onError: (e) => {
      if (!(e instanceof Error && e.message === 'cancelled')) haptic.error();
    },
  });

  const d = incident.data;
  if (!d) return incident.isPending ? <SkeletonRows rows={4} /> : <ErrorState error={incident.error} />;

  const confirmTarget = d.displayId;
  const ready = !!reason && confirmText.trim().toUpperCase() === confirmTarget.toUpperCase();
  const err = ignore.error && !(ignore.error instanceof Error && ignore.error.message === 'cancelled') ? describeError(ignore.error) : null;

  return (
    <ScrollScreen
      footer={
        <Button
          label="Retract alert"
          icon="unable"
          variant="danger"
          size="lg"
          fullWidth
          disabled={!ready}
          loading={ignore.isPending}
          onPress={() => ignore.mutate()}
        />
      }>
      <Banner
        tone="danger"
        icon="warning"
        title={`Retract ${d.displayId} for everyone`}
        message="Every recipient of every stage gets a retraction. Alarms stop, retries end, checklists are cancelled and the incident is closed as Cancelled."
      />
      {err ? <Banner tone="danger" icon="warning" title={err.title} message={err.message} /> : null}

      <Section title="What recipients receive">
        <KeyValue label="Email" value={`Subject prefixed "IGNORE –" with the last message`} />
        <KeyValue label="SMS" value="Registered IGNORE template: alert sent in error" />
        <KeyValue label="WhatsApp" value="Approved Ignore template" />
        <KeyValue label="Voice" value="Short retraction call to those who were called" />
        <KeyValue label="App" value="Replaces the alert and clears the alarm" />
      </Section>

      <View style={styles.block}>
        <Text variant="section">
          Reason (required)
        </Text>
        <ChoiceGroup<Reason>
          accessibilityLabel="Reason for retraction"
          value={reason}
          onChange={setReason}
          options={[
            { value: 'FALSE_ALARM', label: 'False alarm', description: 'Situation verified — no emergency' },
            { value: 'SENT_IN_ERROR', label: 'Sent in error', description: 'Wrong template, type or recipients' },
            { value: 'DUPLICATE', label: 'Duplicate', description: 'Already covered by another incident' },
          ]}
        />
        <TextField label="Note for the audit log" value={note} onChangeText={setNote} maxLength={300} multiline placeholder="Optional" />
        <TextField
          label={`Type ${confirmTarget} to confirm`}
          required
          value={confirmText}
          onChangeText={setConfirmText}
          autoCapitalize="characters"
          autoCorrect={false}
          mono
          counter={false}
        />
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  block: { paddingHorizontal: gutter, paddingVertical: space[4], gap: space[3], marginTop: space[2] },
});
