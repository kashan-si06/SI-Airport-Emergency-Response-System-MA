import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { useIncident } from '@/api/queries';
import type { ResponderStatus } from '@/api/schemas';
import { submitResponderStatus } from '@/features/incidents/acknowledge';
import { currentPositionIfPermitted } from '@/features/incidents/location';
import { responderMeta } from '@/domain/presentation';
import { haptic } from '@/lib/haptics';
import { stopAlarm } from '@/notifications/alarm';
import { useColors } from '@/theme/theme';
import { gutter, space } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { ChoiceGroup } from '@/ui/choice';
import { ErrorState, SkeletonRows } from '@/ui/feedback';
import { TextField } from '@/ui/field';
import { PageHead } from '@/ui/page-head';
import { ScrollScreen } from '@/ui/screen';
import { Text } from '@/ui/text';
import { toast } from '@/ui/toast';

const UNABLE_REASONS = [
  { value: 'OFF_SITE', label: 'Off site / on leave' },
  { value: 'COMMITTED', label: 'Committed to another emergency task' },
  { value: 'NO_TRANSPORT', label: 'No transport to the scene' },
  { value: 'UNWELL', label: 'Unwell / injured' },
  { value: 'OTHER', label: 'Other — explain below' },
] as const;
type ReasonCode = (typeof UNABLE_REASONS)[number]['value'];

export default function StatusSheet() {
  const { id, preset } = useLocalSearchParams<{ id: string; preset?: ResponderStatus }>();
  const colors = useColors();
  const incident = useIncident(id);
  const [status, setStatus] = useState<ResponderStatus | null>(preset ?? null);
  const [reason, setReason] = useState<ReasonCode | null>(null);
  const [note, setNote] = useState('');
  const [attachLocation, setAttachLocation] = useState(true);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  const d = incident.data;
  if (!d) {
    return incident.isPending ? <SkeletonRows rows={4} /> : <ErrorState error={incident.error} onRetry={() => void incident.refetch()} />;
  }

  const reasonText =
    status === 'UNABLE' && reason
      ? [UNABLE_REASONS.find((r) => r.value === reason)!.label, note.trim()].filter(Boolean).join(' — ')
      : null;
  const invalid = !status || (status === 'UNABLE' && (!reason || (reason === 'OTHER' && note.trim().length < 3)));

  const submit = async () => {
    setTouched(true);
    if (invalid || !status) {
      haptic.warning();
      return;
    }
    setBusy(true);
    const location = status === 'ON_SCENE' && attachLocation ? await currentPositionIfPermitted() : null;
    stopAlarm(d.id);
    submitResponderStatus({
      notificationId: d.id,
      displayId: d.displayId,
      updateId: d.my.pendingAckUpdateId,
      status,
      reason: reasonText,
      location,
    });
    setBusy(false);
    haptic.success();
    toast.success(responderMeta[status].label, `${d.displayId} · sent to AOCC`);
    router.back();
  };

  return (
    <ScrollScreen
      footer={<Button label="Update status" size="lg" fullWidth loading={busy} disabled={touched && invalid} onPress={() => void submit()} />}>
      <PageHead compact title={d.title} id={d.displayId} />
      <View style={styles.pad}>
        <ChoiceGroup<ResponderStatus>
          accessibilityLabel="Your status"
          value={status}
          onChange={setStatus}
          options={(['ACKNOWLEDGED', 'RESPONDING', 'ON_SCENE', 'UNABLE'] as const).map((s) => ({
            value: s,
            label: responderMeta[s].label,
            icon: responderMeta[s].icon,
            description:
              s === 'ACKNOWLEDGED'
                ? 'Received and understood'
                : s === 'RESPONDING'
                  ? 'Moving to the scene / your post'
                  : s === 'ON_SCENE'
                    ? 'Arrived and active'
                    : 'You cannot respond — AOCC will escalate',
          }))}
        />
      </View>

      {status === 'ON_SCENE' ? (
        <View style={[styles.pad, styles.toggleRow, { borderColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text variant="body">Attach my location</Text>
            <Text variant="footnote" tone="textSecondary">
              One-time position sent with this update. Not tracked.
            </Text>
          </View>
          <Switch value={attachLocation} onValueChange={setAttachLocation} trackColor={{ true: colors.accent, false: colors.borderStrong }} accessibilityLabel="Attach my location" />
        </View>
      ) : null}

      {status === 'UNABLE' ? (
        <View style={[styles.pad, { gap: space[3] }]}>
          <Text variant="section">
            Reason (required)
          </Text>
          <ChoiceGroup<ReasonCode>
            accessibilityLabel="Reason you are unable to respond"
            value={reason}
            onChange={setReason}
            options={UNABLE_REASONS.map((r) => ({ value: r.value, label: r.label }))}
          />
          {touched && !reason ? (
            <Text variant="footnote" tone="danger">
              Choose a reason so AOCC can escalate correctly.
            </Text>
          ) : null}
          <TextField
            label="Details"
            required={reason === 'OTHER'}
            value={note}
            onChangeText={setNote}
            maxLength={200}
            multiline
            placeholder="Optional for AOCC"
            error={touched && reason === 'OTHER' && note.trim().length < 3 ? 'Describe why you cannot respond.' : null}
          />
        </View>
      ) : null}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: gutter, paddingTop: space[4], gap: space[1] },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
});
