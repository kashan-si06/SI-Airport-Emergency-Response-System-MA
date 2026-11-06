import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { haptic } from '@/lib/haptics';
import { useColors } from '@/theme/theme';
import { space } from '@/theme/tokens';

import { Text } from './text';

type Option<T extends string> = { value: T; label: string; count?: number };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
};

/** Equal-width underlined choices for 2–4 mutually exclusive views. */
export function SegmentedControl<T extends string>({ options, value, onChange, accessibilityLabel }: Props<T>) {
  const colors = useColors();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, { borderColor: colors.borderStrong }]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={o.count != null ? `${o.label}, ${o.count}` : o.label}
            onPress={() => {
              if (!selected) {
                haptic.tap();
                onChange(o.value);
              }
            }}
            style={[
              styles.segment,
              { borderBottomColor: selected ? colors.accent : 'transparent' },
            ]}>
            <Text variant="subhead" weight={selected ? '500' : '400'} tone={selected ? 'text' : 'textSecondary'} dense numberOfLines={1}>
              {o.label}
              {o.count != null ? <Text variant="caption" tone="textSecondary">{`  ${o.count}`}</Text> : null}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Scrollable underline tabs for in-screen sections when labels exceed what a
 * segmented control can hold (incident detail: Summary / Timeline / …).
 */
export function UnderlineTabs<T extends string>({ options, value, onChange, accessibilityLabel }: Props<T>) {
  const colors = useColors();
  return (
    <View style={[styles.underlineWrap, { borderColor: colors.borderStrong }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        accessibilityLabel={accessibilityLabel}
        contentContainerStyle={styles.underlineContent}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => {
                if (!selected) {
                  haptic.tap();
                  onChange(o.value);
                }
              }}
              style={styles.underlineTab}>
              <View style={styles.underlineLabel}>
                <Text variant="subhead" weight={selected ? '500' : '400'} tone={selected ? 'text' : 'textSecondary'} dense>
                  {o.label}
                </Text>
                {o.count != null && o.count > 0 ? (
                  <Text variant="caption" weight="500" tone={selected ? 'text' : 'textSecondary'} dense>
                    {o.count}
                  </Text>
                ) : null}
              </View>
              <View style={[styles.indicator, { backgroundColor: selected ? colors.accent : 'transparent' }]} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  segment: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    marginBottom: -StyleSheet.hairlineWidth,
    paddingHorizontal: space[2],
  },
  underlineWrap: { borderBottomWidth: StyleSheet.hairlineWidth, marginTop: space[4] },
  underlineContent: { paddingHorizontal: space[2] },
  underlineTab: { paddingHorizontal: space[3], paddingTop: space[3], minHeight: 48, justifyContent: 'space-between' },
  underlineLabel: { flexDirection: 'row', alignItems: 'center', gap: space[1.5] },
  indicator: { height: 2, marginTop: space[2] },
});
