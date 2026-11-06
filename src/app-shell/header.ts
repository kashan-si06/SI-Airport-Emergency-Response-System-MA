import type { NativeStackNavigationOptions } from 'expo-router';
import { Platform } from 'react-native';

import type { Palette } from '@/theme/tokens';
import { sansFace } from '@/theme/typography';

/**
 * Native stack header styling. iOS 26 renders Liquid Glass headers that
 * cannot be opaque, so background is left to the system there; Android and
 * earlier iOS get a flat canvas-coloured bar with no shadow.
 */
export function stackScreenOptions(colors: Palette): NativeStackNavigationOptions {
  return {
    headerTintColor: colors.accent,
    headerTitleStyle: { color: colors.text, fontFamily: sansFace['400'] },
    headerLargeTitleStyle: { color: colors.text, fontFamily: sansFace['300'] },
    headerShadowVisible: false,
    headerLargeTitleShadowVisible: false,
    headerBackButtonDisplayMode: 'minimal',
    headerStyle: Platform.OS === 'ios' ? undefined : { backgroundColor: colors.canvas },
    contentStyle: { backgroundColor: colors.canvas },
  };
}

/** Root screen of a tab: no bar, since HeroScreen opens with its own headline. */
export function tabRootOptions(title: string): NativeStackNavigationOptions {
  return { title, headerShown: false };
}
