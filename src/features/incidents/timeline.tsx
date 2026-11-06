import { StyleSheet, View } from 'react-native';

import type { TimelineEntry } from '@/api/schemas';
import { channelMeta, updateTypeLabel } from '@/domain/presentation';
import { formatDate, formatTimeSeconds } from '@/domain/time';
import { useColors } from '@/theme/theme';
import { gutter, space, type Palette } from '@/theme/tokens';
import { EmptyState } from '@/ui/feedback';
import { Text } from '@/ui/text';

const kindTone: Record<TimelineEntry['kind'], keyof Palette> = {
  STAGE: 'accent',
  BROADCAST: 'caution',
  FIELD_UPDATE: 'textSecondary',
  CHECKLIST: 'textSecondary',
  STATUS: 'textSecondary',
};

function stageTone(e: TimelineEntry): keyof Palette {
  switch (e.updateType) {
    case 'INITIAL':
      return 'danger';
    case 'AEOC_ACTIVATION':
      return 'caution';
    case 'TERMINATION':
      return 'textSecondary';
    case 'IGNORE':
      return 'textTertiary';
    default:
      return kindTone[e.kind];
  }
}

/** Chronological incident log: stages, broadcasts, field updates, checklist milestones. */
export function Timeline({ entries, plain }: { entries: TimelineEntry[]; plain?: boolean }) {
  const colors = useColors();
  if (entries.length === 0) return <EmptyState icon="history" title="No events yet" />;
  const sorted = [...entries].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  // Day header shown on the first entry of each IST calendar day.
  const days = sorted.map((e) => formatDate(e.at));

  return (
    <View style={[styles.wrap, plain ? null : styles.inset]}>
      {sorted.map((e, i) => {
        const tone = stageTone(e);
        const day = days[i];
        const showDay = i === 0 || day !== days[i - 1];
        return (
          <View key={e.id}>
            {showDay ? (
              <Text variant="overline" tone="textTertiary" style={styles.day}>
                {day}
              </Text>
            ) : null}
            <View
              style={styles.entry}
              accessible
              accessibilityLabel={`${formatTimeSeconds(e.at)}. ${e.title}. ${e.body ?? ''} ${e.by ? `By ${e.by.name}` : ''}`}>
              <View style={styles.timeCol}>
                <Text variant="monoSmall" tone="textSecondary" dense>
                  {formatTimeSeconds(e.at)}
                </Text>
              </View>
              <View style={styles.railCol}>
                <View style={[styles.node, { backgroundColor: colors[tone] }]} />
                {i < sorted.length - 1 ? <View style={[styles.rail, { backgroundColor: colors.separator }]} /> : null}
              </View>
              <View style={styles.content}>
                {e.updateType && e.kind === 'STAGE' ? (
                  <Text variant="footnote" style={{ color: colors[tone] }}>
                    {updateTypeLabel[e.updateType]}
                    {e.ackRequired ? ' · Acknowledgement required' : ''}
                  </Text>
                ) : null}
                <Text variant="body">
                  {e.title}
                </Text>
                {e.body ? (
                  <Text variant="footnote" tone="textSecondary">
                    {e.body}
                  </Text>
                ) : null}
                {e.by || e.channels?.length ? (
                  <Text variant="caption" tone="textTertiary">
                    {[e.by?.name, e.channels?.map((c) => channelMeta[c].label).join(', ')].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: space[2] },
  inset: { overflow: 'hidden' },
  day: { paddingHorizontal: gutter, paddingTop: space[3], paddingBottom: space[1] },
  entry: { flexDirection: 'row', paddingHorizontal: gutter },
  timeCol: { width: 62, paddingTop: 5 },
  railCol: { width: 20, alignItems: 'center', paddingTop: 7 },
  node: { width: 7, height: 7, borderRadius: 4 },
  rail: { flex: 1, width: StyleSheet.hairlineWidth, minHeight: 12, marginTop: space[1] },
  content: { flex: 1, gap: 2, paddingBottom: space[4], paddingLeft: space[2], paddingTop: 2 },
});
