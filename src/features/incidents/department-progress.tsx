import { Linking, Pressable, StyleSheet, View } from 'react-native';

import type { DepartmentProgress } from '@/api/schemas';
import { deptStatusMeta } from '@/domain/presentation';
import { useColors } from '@/theme/theme';
import { gutter, space } from '@/theme/tokens';
import { ProgressBar } from '@/ui/feedback';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';

/** Per-department response status with checklist progress (FR-CMD-03). */
export function DepartmentProgressList({ items, plain }: { items: DepartmentProgress[]; /** Inside a Section that already provides the surface. */ plain?: boolean }) {
  const colors = useColors();
  return (
    <View style={[styles.wrap, plain ? null : styles.inset]}>
      {items.map((d, i) => {
        const m = deptStatusMeta[d.deptStatus];
        return (
          <View
            key={d.department.id}
            style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator }]}>
            <View style={styles.code}>
              <Text variant="mono" weight="500" dense>
                {d.department.code}
              </Text>
            </View>
            <View style={styles.main}>
              <View style={styles.line}>
                <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
                  {d.department.name}
                </Text>
                <Text variant="footnote" style={{ color: colors[m.fg] }}>
                  {m.label}
                </Text>
              </View>
              <View style={styles.line}>
                <View style={{ flex: 1 }}>
                  <ProgressBar value={d.done} total={d.total} height={2} />
                </View>
                <Text variant="caption" tone="textSecondary" dense style={styles.tabular}>
                  {d.done}/{d.total}
                </Text>
              </View>
            </View>
            {d.spoc?.phone ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Call ${d.department.code} SPOC ${d.spoc.name}`}
                hitSlop={6}
                onPress={() => void Linking.openURL(`tel:${d.spoc!.phone}`)}
                style={({ pressed }) => [styles.call, { opacity: pressed ? 0.6 : 1 }]}>
                <Icon name="phone" size={16} color={colors.accent} />
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  inset: { overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: gutter, paddingVertical: space[3] },
  code: { width: 48 },
  main: { flex: 1, gap: space[1.5] },
  line: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  tabular: { fontVariant: ['tabular-nums'] },
  call: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
