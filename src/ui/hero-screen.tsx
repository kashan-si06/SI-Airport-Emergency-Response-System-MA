import { useIsFocused } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { gutter, space } from '@/theme/tokens';
import { heroHeadline, heroMessage } from '@/theme/typography';

import { HeroGlow } from './hero-glow';
import { ScrollScreen } from './screen';
import { Text } from './text';

const HERO_SHARE = 0.3;
/** Where the headline starts, as a share of the hero: just under the curve, so the line never crosses words. */
const DROP = 0.92;
const TOP_ROW_HEIGHT = 44;
/** Keeps onboarding's words clear of the curve above them. */
const OPENING_DROP = 0.23;

export const heroes = {
  airfieldNight: require('@/assets/images/heroes/airfield-night.webp'),
  crashTender: require('@/assets/images/heroes/crash-tender.webp'),
  radio: require('@/assets/images/heroes/radio.webp'),
  terminal: require('@/assets/images/heroes/terminal.webp'),
  approach: require('@/assets/images/heroes/approach.webp'),
  marshaller: require('@/assets/images/heroes/marshaller.webp'),
} as const;

/** The large light headline a main screen opens with, and the quiet line under it. */
export function PageHeading({ headline, message }: { headline: string; message?: string | null }) {
  const { width } = useWindowDimensions();
  const headlineSize = Math.round(Math.min(52, width * 0.115));
  const messageSize = Math.round(Math.min(20, width * 0.044));
  return (
    <View style={styles.pageHeading} accessible accessibilityRole="header" accessibilityLabel={[headline, message].filter(Boolean).join('. ')}>
      <Text dense style={heroHeadline(headlineSize)}>
        {headline}
      </Text>
      {message ? (
        <Text dense tone="textSecondary" style={heroMessage(messageSize)}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

/** A photograph and its moving light on their own, for full-screen flows that lay out their own content. */
export function OpeningHero({ hero }: { hero: ImageSourcePropType }) {
  const { height } = useWindowDimensions();
  const focused = useIsFocused();
  return <HeroGlow source={hero} height={height * HERO_SHARE} running={focused} />;
}

/** The space an OpeningHero needs left clear at the top of the content. */
export function OpeningSpacer() {
  const { height } = useWindowDimensions();
  return <View style={{ height: Math.round(height * OPENING_DROP) }} />;
}

type HeroScreenProps = {
  headline?: string | null;
  message?: string | null;
  /** The photograph at the top. Without one, the warm glow. */
  hero?: ImageSourcePropType;
  /** At the top right, such as a button that adds something. */
  action?: ReactNode;
  /** Above the headline, such as a person's photo. */
  leading?: ReactNode;
  /** Set false when something urgent is on screen: the hero steps back, its light stops and the words move up. */
  calm?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  children: ReactNode;
};

/** The shell of every tab's root screen: the hero, then a headline, then the content scrolling over it. */
export function HeroScreen({ headline, message, hero, action, leading, calm = true, refreshing, onRefresh, children }: HeroScreenProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const focused = useIsFocused();
  const heroHeight = height * HERO_SHARE;
  const drop = Math.max(0, heroHeight * DROP - insets.top - TOP_ROW_HEIGHT);

  return (
    <ScrollScreen
      refreshing={refreshing}
      onRefresh={onRefresh}
      // iOS insets the content automatically; Android draws under the status bar.
      contentContainerStyle={Platform.OS === 'ios' ? undefined : { paddingTop: insets.top }}
      backdrop={<HeroGlow source={hero} height={heroHeight} dimmed={!calm} running={focused && calm} />}>
      <View style={styles.topRow}>
        <View />
        {action}
      </View>

      {calm ? <View style={{ height: drop }} /> : null}

      {headline ? (
        <View style={styles.heading}>
          {leading}
          <PageHeading headline={headline} message={message} />
        </View>
      ) : null}

      {children}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: TOP_ROW_HEIGHT,
    paddingLeft: gutter,
    paddingRight: space[3],
  },
  heading: { gap: space[4], paddingHorizontal: gutter, paddingBottom: space[3] },
  pageHeading: { gap: space[2] },
});
