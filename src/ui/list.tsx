import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { haptic } from '@/lib/haptics';
import { useColors } from '@/theme/theme';
import { gutter, space, type Palette } from '@/theme/tokens';

import { Icon, type IconName } from './icon';
import { Text } from './text';

type SectionProps = {
  title?: string;
  /** Right-aligned header accessory: count, "See all", status. */
  accessory?: ReactNode;
  footer?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Grouped content, set directly on the page: a light title, hairlines
 * running the full width above and below, and inset hairlines between rows.
 */
export function Section({ title, accessory, footer, children, style }: SectionProps) {
  const colors = useColors();
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[styles.section, style]}>
      {title || accessory ? (
        <View style={styles.header}>
          {title ? (
            <Text variant="section" accessibilityRole="header">
              {title}
            </Text>
          ) : (
            <View />
          )}
          {accessory}
        </View>
      ) : null}
      <View style={[styles.body, { borderColor: colors.separator }]}>
        {items.map((child, i) => (
          <Fragment key={child.key ?? i}>
            {i > 0 ? <View style={[styles.separator, { backgroundColor: colors.separator }]} /> : null}
            {child}
          </Fragment>
        ))}
      </View>
      {footer ? (
        <Text variant="footnote" tone="textSecondary" style={styles.footer}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

type RowProps = {
  title: string;
  subtitle?: string | null;
  /** Value at the trailing edge. */
  value?: string | null;
  valueTone?: keyof Palette;
  leading?: ReactNode;
  icon?: IconName;
  iconTone?: keyof Palette;
  trailing?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  numberOfLines?: number;
};

export function Row({
  title,
  subtitle,
  value,
  valueTone = 'textSecondary',
  leading,
  icon,
  iconTone = 'textSecondary',
  trailing,
  onPress,
  chevron = !!onPress,
  destructive,
  disabled,
  accessibilityHint,
  numberOfLines = 2,
}: RowProps) {
  const colors = useColors();
  const content = (
    <>
      {leading ?? (icon ? <Icon name={icon} size={20} color={colors[destructive ? 'danger' : iconTone]} /> : null)}
      <View style={styles.rowText}>
        <Text variant="body" tone={destructive ? 'danger' : 'text'} numberOfLines={numberOfLines}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="footnote" tone="textSecondary" numberOfLines={numberOfLines}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="subhead" tone={valueTone} dense numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {trailing}
      {chevron ? <Icon name="chevronRight" size={14} color={colors.textTertiary} /> : null}
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.row} accessible accessibilityLabel={[title, subtitle, value].filter(Boolean).join(', ')}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, value].filter(Boolean).join(', ')}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.surfacePressed : 'transparent', opacity: disabled ? 0.45 : 1 },
      ]}>
      {content}
    </Pressable>
  );
}

/** Two-column label/value line for fact sheets. */
export function KeyValue({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <View style={styles.kv} accessible accessibilityLabel={`${label}: ${value ?? 'not available'}`}>
      <Text variant="footnote" tone="textSecondary" style={styles.kvLabel}>
        {label}
      </Text>
      <Text variant={mono ? 'mono' : 'callout'} tone={value ? 'text' : 'textTertiary'} style={styles.kvValue}>
        {value ?? 'N/A'}
      </Text>
    </View>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const colors = useColors();
  return <View style={[styles.separator, { marginLeft: inset, backgroundColor: colors.separator }]} />;
}

const styles = StyleSheet.create({
  section: { marginTop: space[8] },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: gutter,
    paddingBottom: space[3],
    minHeight: 22,
  },
  body: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: gutter },
  footer: { paddingHorizontal: gutter, paddingTop: space[2] },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: gutter,
    paddingVertical: space[3],
  },
  rowText: { flex: 1, gap: 2 },
  kv: {
    flexDirection: 'row',
    paddingHorizontal: gutter,
    paddingVertical: space[3],
    gap: space[3],
    alignItems: 'flex-start',
  },
  kvLabel: { width: 128, paddingTop: 1 },
  kvValue: { flex: 1 },
});
