import { StyleSheet, View } from 'react-native';

import { useColors } from '@/theme/theme';
import { gutter, space } from '@/theme/tokens';
import { Text } from '@/ui/text';

export function StepHeader({ step, total, title }: { step: number; total: number; title: string }) {
  const colors = useColors();
  return (
    <View style={styles.wrap} accessible accessibilityRole="header" accessibilityLabel={`Step ${step} of ${total}: ${title}`}>
      <View style={styles.bars}>
        {Array.from({ length: total }).map((_, i) => (
          <View key={i} style={[styles.bar, { backgroundColor: i < step ? colors.ink : colors.borderStrong }]} />
        ))}
      </View>
      <Text variant="overline" tone="textSecondary">
        Step {step} of {total}
      </Text>
      <Text variant="largeTitle">{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: gutter, paddingTop: space[3], paddingBottom: space[5], gap: space[1] },
  bars: { flexDirection: 'row', gap: space[1], marginBottom: space[3] },
  bar: { flex: 1, height: 2 },
});
