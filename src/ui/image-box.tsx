import { Image, type ImageProps } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useColors } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

import { Icon } from './icon';
import { Text } from './text';

const FADE_MS = 120;

type ImageBoxProps = {
  /** The image. Until there is one, or while it loads, the box holds its place. */
  source?: ImageProps['source'];
  /** Width over height, for a box that fills its container's width. */
  ratio?: number;
  /** A fixed square instead of a ratio. */
  size?: number;
  round?: boolean;
  /** Fills its parent with no frame of its own, for tiles that already have one. */
  flush?: boolean;
  /** Names what belongs here. Shown on the placeholder and read out for the image. */
  label?: string;
  /** Stands in for the photo icon on the placeholder, such as a person's initials. */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** The one way the app shows an image, or holds the place for one that is still to come. */
export function ImageBox({ source, ratio = 16 / 9, size, round, flush, label, children, style }: ImageBoxProps) {
  const colors = useColors();

  return (
    <View
      accessible={!!label}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      style={[
        styles.box,
        { backgroundColor: colors.surfaceSunken },
        flush ? styles.flush : { borderColor: colors.borderStrong, borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: radius.xl },
        !flush && !source && !children && styles.placeholder,
        size ? { width: size, height: size } : !flush && { aspectRatio: ratio },
        round && size ? { borderRadius: size / 2 } : null,
        style,
      ]}>
      {children ?? (
        <>
          <Icon name="photo" size={size && size < 72 ? 20 : 26} color={colors.textTertiary} />
          {label && !size && !flush ? (
            <Text variant="footnote" tone="textTertiary" align="center" dense>
              {label}
            </Text>
          ) : null}
        </>
      )}
      {source ? <Image source={source} contentFit="cover" transition={FADE_MS} style={StyleSheet.absoluteFill} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', alignItems: 'center', justifyContent: 'center', gap: space[2], overflow: 'hidden' },
  flush: { flex: 1 },
  placeholder: { borderStyle: 'dashed' },
});
