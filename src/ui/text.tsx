import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useColors } from '@/theme/theme';
import type { Palette } from '@/theme/tokens';
import { fontFamily, maxFontScale, sansFace, typography, type TextVariant, type TextWeight } from '@/theme/typography';

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  tone?: keyof Palette;
  /** On the mono face, any weight selects its semibold cut. */
  weight?: TextWeight;
  align?: 'left' | 'center' | 'right';
  /** Cap Dynamic Type growth for dense, tabular rows. */
  dense?: boolean;
};

export function Text({
  variant = 'body',
  tone = 'text',
  weight,
  align,
  dense,
  style,
  ...rest
}: TextProps) {
  const colors = useColors();
  const isMono = variant === 'mono' || variant === 'monoSmall' || variant === 'monoLarge';
  return (
    <RNText
      maxFontSizeMultiplier={dense ? maxFontScale.dense : maxFontScale.standard}
      style={[
        typography[variant],
        { color: colors[tone] },
        weight ? { fontFamily: isMono ? fontFamily.monoSemibold : sansFace[weight] } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
      {...rest}
    />
  );
}
