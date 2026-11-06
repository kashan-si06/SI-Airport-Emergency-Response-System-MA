import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { IncidentSummary } from '@/api/schemas';
import { incidentStatusMeta, isLive, responderMeta, severityMeta, titleWithoutPlace } from '@/domain/presentation';
import { formatElapsed, formatRelative } from '@/domain/time';
import { haptic } from '@/lib/haptics';
import { useNow } from '@/lib/use-now';
import { selectPendingAck, useOutbox } from '@/offline/outbox';
import { useColors } from '@/theme/theme';
import { gutter, severityBands, space } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { HazardStripe } from '@/ui/hazard';
import { Icon } from '@/ui/icon';
import { DrillTag, SeverityTag } from '@/ui/tags';
import { Text } from '@/ui/text';

import { submitResponderStatus } from './acknowledge';

type RowProps = {
  incident: IncidentSummary;
  onPress?: () => void;
};

function spokenSummary(i: IncidentSummary) {
  return [i.isDrill ? 'Drill' : `${i.severity.toLowerCase()} severity`, i.title, i.location, i.displayId].filter(Boolean).join('. ');
}

/** The running clock on a live incident. Tabular, so it holds still as it counts. */
export function Elapsed({ from, color }: { from: string; color?: string }) {
  const nowMs = useNow();
  const colors = useColors();
  const text = formatElapsed(from, nowMs);
  return (
    <Text variant="subhead" dense accessibilityLabel={`Elapsed ${text}`} style={{ color: color ?? colors.textSecondary, fontVariant: ['tabular-nums'] }}>
      {text}
    </Text>
  );
}

/** One incident, read at a glance: what kind, what, where, how long. Detail lives one tap away. */
export const IncidentRow = memo(function IncidentRow({ incident: i, onPress }: RowProps) {
  const colors = useColors();
  const live = isLive(i.status);
  const queuedAck = useOutbox(selectPendingAck(i.id));
  const my = i.my.responderStatus ? responderMeta[i.my.responderStatus] : null;

  const open = () => {
    haptic.tap();
    if (onPress) return onPress();
    router.push({ pathname: '/incident/[id]', params: { id: i.id } });
  };

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={[spokenSummary(i), i.aeocActive ? 'AEOC active' : null, my?.label].filter(Boolean).join('. ')}
      accessibilityHint="Opens the incident"
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfacePressed }]}>
      <View style={styles.titleLine}>
        <Text variant="title2" numberOfLines={2} style={styles.shrink}>
          {titleWithoutPlace(i)}
        </Text>
        {live ? (
          <Elapsed from={i.createdAt} />
        ) : (
          <Text variant="subhead" tone="textSecondary" dense>
            {formatRelative(i.lastActivityAt)}
          </Text>
        )}
      </View>
      {i.location ? (
        <Text variant="subhead" tone="textSecondary" numberOfLines={1}>
          {i.location}
        </Text>
      ) : null}
      {/* One quiet line of facts. Only a live incident's severity, and an unsent response, carry colour. */}
      <Text variant="footnote" tone="textSecondary" numberOfLines={2}>
        <Text variant="footnote" style={{ color: i.isDrill ? colors.drill : live ? colors[severityMeta[i.severity].tone.fg] : colors.textSecondary }}>
          {i.isDrill ? 'Drill' : severityMeta[i.severity].label}
        </Text>
        {!live ? ` · ${incidentStatusMeta[i.status].label}` : ''}
        {i.aeocActive ? ' · AEOC active' : ''}
        {my && !queuedAck ? ` · ${my.label}` : ''}
        {my && queuedAck ? (
          <Text variant="footnote" tone="caution">
            {` · ${my.label}, sending…`}
          </Text>
        ) : null}
        {' · '}
        <Text variant="monoSmall" tone="textTertiary" dense>
          {i.displayId}
        </Text>
      </Text>
    </Pressable>
  );
});

/**
 * An alert still waiting for this person. A live critical alert fills the card
 * with emergency red, so it outranks everything else on the screen before a word
 * is read. `lead` marks the most urgent card, the only one with a filled button.
 */
export const PendingAlertCard = memo(function PendingAlertCard({ incident: i, lead }: { incident: IncidentSummary; lead: boolean }) {
  const colors = useColors();
  const filled = !i.isDrill && i.severity === 'CRITICAL';
  const band = severityBands.CRITICAL;
  const fg = filled ? band.fg : colors.text;
  const muted = filled ? band.muted : colors.textSecondary;

  const open = () => {
    haptic.tap();
    router.push({ pathname: '/alert/[id]', params: { id: i.id } });
  };
  const acknowledge = () =>
    submitResponderStatus({ notificationId: i.id, displayId: i.displayId, updateId: i.my.pendingAckUpdateId, status: 'ACKNOWLEDGED' });

  return (
    <View style={[styles.card, filled ? { backgroundColor: band.bg } : { borderColor: colors.separator, borderBottomWidth: StyleSheet.hairlineWidth, borderTopWidth: StyleSheet.hairlineWidth }]}>
      {i.isDrill ? <HazardStripe /> : null}
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${spokenSummary(i)}. Needs your response`}
        accessibilityHint="Opens the full alert"
        style={({ pressed }) => [styles.cardBody, pressed && { opacity: 0.7 }]}>
        <View style={styles.topLine}>
          {i.isDrill ? (
            <DrillTag />
          ) : filled ? (
            <View style={styles.filledLabel}>
              <Icon name="critical" size={16} color={fg} />
              <Text variant="subhead" weight="500" style={{ color: fg }}>
                Critical
              </Text>
            </View>
          ) : (
            <SeverityTag severity={i.severity} />
          )}
          <Elapsed from={i.createdAt} color={filled ? fg : undefined} />
        </View>
        <Text variant="title1" numberOfLines={3} style={{ color: fg }}>
          {titleWithoutPlace(i)}
        </Text>
        {i.location ? (
          <Text variant="subhead" numberOfLines={2} style={{ color: muted }}>
            {i.location}
          </Text>
        ) : null}
      </Pressable>
      <View style={styles.cardAction}>
        {filled ? (
          <Button label="Acknowledge" variant="inverse" band={band} size="lg" fullWidth hapticStyle="heavy" onPress={acknowledge} />
        ) : (
          <Button label="Acknowledge" variant={lead ? 'primary' : 'secondary'} size="lg" fullWidth hapticStyle="heavy" onPress={acknowledge} />
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { paddingHorizontal: gutter, paddingVertical: space[4], gap: space[1] },
  titleLine: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space[3] },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2], minHeight: 22 },
  shrink: { flexShrink: 1 },
  card: { marginTop: space[3], overflow: 'hidden' },
  cardBody: { paddingHorizontal: gutter, paddingTop: space[4], paddingBottom: space[4], gap: space[2] },
  cardAction: { paddingHorizontal: gutter, paddingBottom: space[4] },
  filledLabel: { flexDirection: 'row', alignItems: 'center', gap: space[1.5] },
});
