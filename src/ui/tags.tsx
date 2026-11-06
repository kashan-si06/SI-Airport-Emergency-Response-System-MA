import { StyleSheet, View } from 'react-native';

import type { IncidentStatus, Severity } from '@/api/schemas';
import { incidentStatusMeta, severityMeta } from '@/domain/presentation';
import { useColors } from '@/theme/theme';
import { radius, type Palette } from '@/theme/tokens';

import type { IconName } from './icon';
import { Text } from './text';

type TagProps = {
  label: string;
  fg: keyof Palette;
  /** Older call sites still name a fill, a glyph or a solid style. Status is words now, so these are ignored. */
  bg?: keyof Palette;
  icon?: IconName;
  solid?: boolean;
};

/** Status: a coloured word, and nothing around it. */
export function Tag({ label, fg }: TagProps) {
  return (
    <Text variant="footnote" tone={fg} dense numberOfLines={1}>
      {label}
    </Text>
  );
}

export function SeverityTag({ severity, solid }: { severity: Severity; solid?: boolean }) {
  const m = severityMeta[severity];
  // `solid` says whether the emergency is live: once it isn't, red no longer applies.
  return <Tag label={m.label} fg={solid === false ? 'textSecondary' : m.tone.fg} />;
}

export function StatusTag({ status }: { status: IncidentStatus }) {
  const m = incidentStatusMeta[status];
  return <Tag label={m.label} fg={m.tone.fg} bg={m.tone.bg} />;
}

/** Yellow means a drill, and only a drill. */
export function DrillTag() {
  return <Tag label="Drill" fg="drill" />;
}

/** Compact numeric badge (tab counts, pending items). */
export function CountBadge({ count, tone = 'alarm' }: { count: number; tone?: keyof Palette }) {
  const colors = useColors();
  if (count <= 0) return null;
  return (
    <View style={[styles.badge, { backgroundColor: colors[tone] }]}>
      <Text variant="caption" weight="500" style={styles.badgeText} dense>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#FFFFFF', fontVariant: ['tabular-nums'] },
});
