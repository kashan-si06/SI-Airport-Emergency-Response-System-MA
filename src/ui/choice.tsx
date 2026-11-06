import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { haptic } from '@/lib/haptics';
import { useColors } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

import { Icon, type IconName } from './icon';
import { Text } from './text';

type ChoiceOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
  icon?: IconName;
  leading?: ReactNode;
  disabled?: boolean;
};

type BaseProps<T extends string> = {
  options: ChoiceOption<T>[];
  accessibilityLabel: string;
};

type SingleProps<T extends string> = BaseProps<T> & {
  multiple?: false;
  value: T | null;
  onChange: (value: T) => void;
};

type MultiProps<T extends string> = BaseProps<T> & {
  multiple: true;
  value: T[];
  onChange: (value: T[]) => void;
};

/**
 * Full-width selectable rows (radio or checkbox semantics). Preferred over
 * dropdowns on mobile: every option is visible and tappable in one step.
 */
export function ChoiceGroup<T extends string>(props: SingleProps<T> | MultiProps<T>) {
  const colors = useColors();
  const isSelected = (v: T) => (props.multiple ? props.value.includes(v) : props.value === v);

  const toggle = (v: T) => {
    haptic.tap();
    if (props.multiple) {
      props.onChange(isSelected(v) ? props.value.filter((x) => x !== v) : [...props.value, v]);
    } else {
      props.onChange(v);
    }
  };

  return (
    <View
      accessibilityRole={props.multiple ? undefined : 'radiogroup'}
      accessibilityLabel={props.accessibilityLabel}
      style={[styles.group, { borderColor: colors.separator }]}>
      {props.options.map((o, i) => {
        const selected = isSelected(o.value);
        return (
          <Pressable
            key={o.value}
            disabled={o.disabled}
            accessibilityRole={props.multiple ? 'checkbox' : 'radio'}
            accessibilityState={{ checked: selected, disabled: o.disabled }}
            accessibilityLabel={o.description ? `${o.label}. ${o.description}` : o.label}
            onPress={() => toggle(o.value)}
            style={({ pressed }) => [
              styles.option,
              i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
              {
                backgroundColor: pressed ? colors.surfacePressed : 'transparent',
                opacity: o.disabled ? 0.4 : 1,
              },
            ]}>
            {o.leading}
            <View style={styles.text}>
              <Text variant="body" weight={selected ? '500' : '400'}>
                {o.label}
              </Text>
              {o.description ? (
                <Text variant="footnote" tone="textSecondary">
                  {o.description}
                </Text>
              ) : null}
            </View>
            <View
              style={[
                props.multiple ? styles.checkbox : styles.radio,
                {
                  borderColor: selected ? colors.accent : colors.borderStrong,
                  backgroundColor: selected && props.multiple ? colors.accent : 'transparent',
                },
              ]}>
              {selected ? (
                props.multiple ? (
                  <Icon name="check" size={13} color={colors.onAccent} />
                ) : (
                  <View style={[styles.radioDot, { backgroundColor: colors.accent }]} />
                )
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[3],
    minHeight: 56,
  },
  text: { flex: 1, gap: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6 },
  checkbox: { width: 22, height: 22, borderRadius: radius.xs + 2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
