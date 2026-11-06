import { Image } from 'expo-image';
import { StyleSheet, useWindowDimensions, View, type ImageSourcePropType } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { motion } from '@/theme/tokens';

import { RimLight } from './rim-light';

const DIMMED_OPACITY = 0.3;
/** Height of the ambient glow, as a share of the screen. */
const AMBIENT_SHARE = 0.5;

type HeroGlowProps = {
  /** A photograph closed off by the same curve. Without one, the warm glow. */
  source?: ImageSourcePropType;
  height: number;
  /** Steps the glow back so whatever is on top of it comes first. */
  dimmed?: boolean;
  /** Whether the light runs along the curve. Stop it when nobody is looking. */
  running: boolean;
};

/** The backdrop of the app's main screens: an image closed off by a curve, with a light travelling along it. */
export function HeroGlow({ source, height, dimmed, running }: HeroGlowProps) {
  const { width } = useWindowDimensions();
  const fade = useAnimatedStyle(
    () => ({ opacity: withTiming(dimmed ? DIMMED_OPACITY : 1, { duration: motion.base }) }),
    [dimmed],
  );

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.hero, { height }, fade]}>
      <Image source={source ?? require('@/assets/images/hero-glow.png')} contentFit="fill" transition={motion.base} style={styles.image} />
      <RimLight width={width} height={height} running={running} />
    </Animated.View>
  );
}

/**
 * The same warmth behind every other screen, still and quieter. It fades out before
 * every edge it could meet, so it sits under an opaque header with no visible seam.
 */
export function AmbientGlow() {
  const { height } = useWindowDimensions();
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.hero, { height: height * AMBIENT_SHARE }]}>
      <Image source={require('@/assets/images/ambient-glow.png')} contentFit="fill" style={styles.image} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { position: 'absolute', top: 0, left: 0, right: 0 },
  image: { width: '100%', height: '100%' },
});
