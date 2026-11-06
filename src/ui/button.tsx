import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { haptic } from '@/lib/haptics';
import { useColors } from '@/theme/theme';
import { hitTarget, radius, space, type Palette } from '@/theme/tokens';

import { Icon, type IconName } from './icon';
import { Text } from './text';

export type ButtonVariant = 'primary' | 'accent' | 'danger' | 'success' | 'secondary' | 'ghost' | 'inverse';
export type ButtonSize = 'md' | 'lg' | 'xl';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  trailingIcon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Secondary line under the label (e.g. "Sends to 142 people"). */
  caption?: string;
  /** For `inverse`: the severity field this button sits on. */
  band?: { bg: string; fg: string };
  /** Spoken instead of the label, when a short label needs more said. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  hapticStyle?: 'light' | 'heavy' | 'none';
  testID?: string;
};

const heights: Record<ButtonSize, number> = { md: hitTarget, lg: 54, xl: 64 };
const radii: Record<ButtonSize, number> = { md: radius.md, lg: radius.lg, xl: radius.xl };

function palette(variant: ButtonVariant, c: Palette, band?: { bg: string; fg: string }) {
  switch (variant) {
    // On a severity field the button takes the field's own ink, so it always stands off the ground.
    case 'inverse':
      return { bg: band?.fg ?? c.ink, pressed: band?.fg ?? c.inkPressed, fg: band?.bg ?? c.onInk, border: band?.fg ?? c.ink };
    case 'primary':
      return { bg: c.ink, pressed: c.inkPressed, fg: c.onInk, border: c.ink };
    case 'accent':
      return { bg: c.accent, pressed: c.accentPressed, fg: c.onAccent, border: c.accent };
    case 'danger':
      return { bg: c.alarm, pressed: c.alarmPressed, fg: c.onDanger, border: c.alarm };
    case 'success':
      return { bg: c.ink, pressed: c.inkPressed, fg: c.onInk, border: c.ink };
    case 'secondary':
      return { bg: 'transparent', pressed: c.surfacePressed, fg: c.text, border: c.borderStrong };
    case 'ghost':
      return { bg: 'transparent', pressed: c.surfacePressed, fg: c.accent, border: 'transparent' };
  }
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  trailingIcon,
  loading,
  disabled,
  fullWidth,
  caption,
  band,
  accessibilityLabel,
  accessibilityHint,
  style,
  hapticStyle = 'light',
  testID,
}: ButtonProps) {
  const colors = useColors();
  const p = palette(variant, colors, band);
  const inactive = disabled || loading;
  // Ghost buttons are links, so they read as a sentence. Every other button shares one small capital label.
  const labelVariant = variant === 'ghost' ? 'subhead' : 'label';

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (caption ? `${label}. ${caption}` : label)}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={() => {
        if (hapticStyle !== 'none') haptic[hapticStyle]();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: heights[size],
          borderRadius: radii[size],
          backgroundColor: pressed ? p.pressed : p.bg,
          borderColor: p.border,
          opacity: inactive && !loading ? 0.4 : pressed && (variant === 'success' || variant === 'inverse') ? 0.85 : 1,
          transform: [{ scale: pressed && !inactive ? 0.985 : 1 }],
          alignSelf: fullWidth ? 'stretch' : 'auto',
          paddingHorizontal: size === 'md' ? space[4] : space[5],
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={size === 'xl' ? 24 : 18} color={p.fg} /> : null}
          <View style={styles.labels}>
            <Text variant={labelVariant} style={{ color: p.fg }} numberOfLines={1}>
              {label}
            </Text>
            {caption ? (
              <Text variant="caption" style={{ color: p.fg, opacity: 0.78 }} numberOfLines={1}>
                {caption}
              </Text>
            ) : null}
          </View>
          {trailingIcon ? <Icon name={trailingIcon} size={16} color={p.fg} /> : null}
        </View>
      )}
    </Pressable>
  );
}

type IconButtonProps = {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: keyof Palette;
  size?: number;
  disabled?: boolean;
  badge?: ReactNode;
};

/** Square, borderless 44×44 hit area — used in headers and toolbars. */
export function IconButton({ icon, label, onPress, tone = 'text', size = 22, disabled, badge }: IconButtonProps) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={6}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: pressed ? colors.surfacePressed : 'transparent', opacity: disabled ? 0.4 : 1 },
      ]}>
      <Icon name={icon} size={size} color={colors[tone]} />
      {badge ? <View style={styles.badge}>{badge}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space[2],
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  labels: { alignItems: 'center' },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  badge: { position: 'absolute', top: 6, right: 4 },
});
