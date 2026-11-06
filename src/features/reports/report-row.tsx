import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { FieldReport } from '@/api/schemas';
import { severityMeta } from '@/domain/presentation';
import { formatElapsed, formatRelative } from '@/domain/time';
import { haptic } from '@/lib/haptics';
import { useNow } from '@/lib/use-now';
import { useColors } from '@/theme/theme';
import { gutter, space, type Palette } from '@/theme/tokens';
import { Tag } from '@/ui/tags';
import { Text } from '@/ui/text';

const statusText: Record<FieldReport['status'], { label: string; fg: keyof Palette }> = {
  PENDING: { label: 'With AOCC', fg: 'caution' },
  BROADCAST: { label: 'Broadcast', fg: 'textSecondary' },
  REJECTED: { label: 'Rejected', fg: 'textSecondary' },
};

/** Status for the report detail header. */
export function ReportStatusTag({ report: r }: { report: FieldReport }) {
  if (r.status === 'BROADCAST') return <Tag label={`Broadcast · ${r.notificationDisplayId ?? ''}`} fg="textSecondary" />;
  if (r.status === 'REJECTED') return <Tag label="Rejected" fg="textSecondary" />;
  return <Tag label="With AOCC" fg="caution" />;
}

/**
 * Field report at a glance. Validators see how long it has waited
 * (FR-RAISE-04, overdue after 2 min); reporters see where it stands.
 */
export function ReportRow({ report: r, showSla }: { report: FieldReport; showSla?: boolean }) {
  const colors = useColors();
  const nowMs = useNow();
  const sev = severityMeta[r.severity];
  const overdue = showSla && r.status === 'PENDING' && r.validationDueAt ? nowMs > Date.parse(r.validationDueAt) : false;
  const st = statusText[r.status];
  const context = showSla ? `${r.location.text} · ${r.reporter.name}` : r.location.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${sev.label} severity. ${r.headline}. ${context}. ${showSla ? `Waiting ${formatElapsed(r.createdAt, nowMs)}` : st.label}`}
      onPress={() => {
        haptic.tap();
        router.push({ pathname: '/field-report/[id]', params: { id: r.id } });
      }}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfacePressed }]}>
      <View style={styles.titleLine}>
        <Text variant="title2" numberOfLines={2} style={styles.shrink}>
          {r.headline}
        </Text>
        {showSla && r.status === 'PENDING' ? (
          <Text variant="subhead" style={{ color: colors[overdue ? 'danger' : 'caution'], fontVariant: ['tabular-nums'] }} dense>
            {formatElapsed(r.createdAt, nowMs)}
          </Text>
        ) : (
          <Text variant="subhead" tone="textSecondary" dense>
            {formatRelative(r.createdAt)}
          </Text>
        )}
      </View>
      <Text variant="subhead" tone="textSecondary" numberOfLines={1}>
        {context}
      </Text>
      <Text variant="footnote" tone="textSecondary" numberOfLines={1}>
        <Text variant="footnote" style={{ color: r.status === 'PENDING' ? colors[sev.tone.fg] : colors.textSecondary }}>
          {sev.label}
        </Text>
        {' · '}
        <Text variant="footnote" style={{ color: colors[st.fg] }}>
          {st.label}
        </Text>
        {overdue ? (
          <Text variant="footnote" tone="danger">
            {' · Overdue'}
          </Text>
        ) : null}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: gutter, paddingVertical: space[4], gap: space[1] },
  titleLine: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space[3] },
  shrink: { flexShrink: 1 },
});
