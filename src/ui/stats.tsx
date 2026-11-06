import { StyleSheet, View } from 'react-native';

import { useColors } from '@/theme/theme';
import { radius, space, type Palette } from '@/theme/tokens';

import { Text } from './text';

export type Stat = { label: string; value: string | number; tone?: keyof Palette; sub?: string };

/** Headline figures: equal columns divided by hairlines. */
export function StatStrip({ stats }: { stats: Stat[] }) {
  const colors = useColors();
  return (
    <View style={[styles.strip, { borderColor: colors.separator }]}>
      {stats.map((s, i) => (
        <View
          key={s.label}
          accessible
          accessibilityLabel={`${s.label}: ${s.value}${s.sub ? `, ${s.sub}` : ''}`}
          style={[styles.cell, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.separator }]}>
          <Text variant="caption" tone="textSecondary" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} dense>
            {s.label}
          </Text>
          <Text variant="figure" tone={s.tone ?? 'text'} dense numberOfLines={1}>
            {s.value}
          </Text>
          {s.sub ? (
            <Text variant="caption" tone="textTertiary" dense numberOfLines={1} style={styles.tabular}>
              {s.sub}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/** Key for a chart. Empty categories are left out: a row of zeros only adds noise. */
export function Legend({ items }: { items: { label: string; value: number; tone: keyof Palette }[] }) {
  const colors = useColors();
  return (
    <View style={styles.legend}>
      {items
        .filter((it) => it.value > 0)
        .map((it) => (
          <View key={it.label} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: colors[it.tone] }]} />
            <Text variant="footnote" tone="textSecondary" dense>
              {it.label}
            </Text>
            <Text variant="footnote" weight="500" dense style={styles.tabular}>
              {it.value}
            </Text>
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  cell: { flex: 1, paddingHorizontal: space[3], paddingVertical: space[4], gap: space[1] },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space[4], rowGap: space[2] },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space[1.5] },
  swatch: { width: 8, height: 8, borderRadius: radius.xs },
  tabular: { fontVariant: ['tabular-nums'] },
});
