import { StyleSheet, View } from 'react-native';

import { useColors } from '@/theme/theme';
import { radius } from '@/theme/tokens';
import { sansFace } from '@/theme/typography';

import { Text } from './text';

/** ENS mark: a rounded ink tile holding three stepped bars, an outgoing signal. */
export function BrandMark({ size = 32 }: { size?: number }) {
  const colors = useColors();
  const bar = Math.max(2, Math.round(size / 9));
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.mark, { width: size, height: size, backgroundColor: colors.ink, padding: Math.round(size / 4.5), borderRadius: Math.round(size / 4) }]}>
      <View style={{ height: bar, width: '100%', borderRadius: radius.xs, backgroundColor: colors.onInk }} />
      <View style={{ height: bar, width: '68%', borderRadius: radius.xs, backgroundColor: colors.onInk }} />
      <View style={{ height: bar, width: '38%', borderRadius: radius.xs, backgroundColor: colors.onInk }} />
    </View>
  );
}

/** The console's wordmark, so a person sees one product on both surfaces. */
export function Wordmark({ size = 18 }: { size?: number }) {
  const colors = useColors();
  return (
    <Text accessibilityLabel="Emergency Notification" style={{ fontSize: size, lineHeight: size * 1.3, fontFamily: sansFace['400'], letterSpacing: -0.2, color: colors.text }}>
      Emergency<Text style={{ fontSize: size, lineHeight: size * 1.3, fontFamily: sansFace['400'], letterSpacing: -0.2, color: colors.textSecondary }}>Notification</Text>
    </Text>
  );
}

export function BrandLockup({ subtitle }: { subtitle?: string }) {
  return (
    <View style={styles.lockup} accessible accessibilityLabel={`Emergency Notification. ${subtitle ?? 'Noida International Airport'}`}>
      <BrandMark size={40} />
      <View style={styles.text}>
        <Wordmark />
        <Text variant="footnote" tone="textSecondary">
          {subtitle ?? 'Noida International Airport'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { justifyContent: 'space-between', alignItems: 'flex-start' },
  lockup: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flexShrink: 1 },
});
