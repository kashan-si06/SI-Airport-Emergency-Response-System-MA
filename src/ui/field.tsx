import { forwardRef, useState, type ComponentRef } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useColors } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import { Text } from './text';

type FieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  required?: boolean;
  helper?: string;
  error?: string | null;
  /** Show "used/max" counter when maxLength is set. */
  counter?: boolean;
  mono?: boolean;
};

export const TextField = forwardRef<ComponentRef<typeof TextInput>, FieldProps>(function TextField(
  { label, required, helper, error, counter = true, mono, multiline, maxLength, value, onFocus, onBlur, ...rest },
  ref,
) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.focusRing : colors.borderStrong;
  const count = value?.length ?? 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text variant="overline" tone="textSecondary">
          {label}
          {required ? <Text variant="footnote" tone="danger"> *</Text> : null}
        </Text>
        {counter && maxLength ? (
          <Text variant="monoSmall" tone={count > maxLength * 0.9 ? 'caution' : 'textTertiary'} dense>
            {count}/{maxLength}
          </Text>
        ) : null}
      </View>
      <TextInput
        ref={ref}
        value={value}
        maxLength={maxLength}
        multiline={multiline}
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.accent}
        cursorColor={colors.accent}
        accessibilityLabel={required ? `${label}, required` : label}
        accessibilityHint={error ?? helper}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          mono ? typography.mono : typography.body,
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor,
            borderWidth: focused || error ? 2 : 1,
            // The border thickens on focus; padding gives the width back so text never shifts.
            paddingHorizontal: space[4] - (focused || error ? 1 : 0),
            minHeight: multiline ? 84 : 52,
            textAlignVertical: multiline ? 'top' : 'center',
          },
        ]}
        {...rest}
      />
      {error ? (
        <Text variant="footnote" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : helper ? (
        <Text variant="footnote" tone="textSecondary">
          {helper}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: space[1.5] },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: {
    borderRadius: radius.md,
    paddingVertical: space[3],
  },
});
