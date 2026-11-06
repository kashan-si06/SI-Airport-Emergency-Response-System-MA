import type { TextStyle } from 'react-native';

/**
 * Two families, and only these:
 *  - Hanken Grotesk for all interface text, in three weights: light for headings,
 *    regular for reading, medium for emphasis;
 *  - JetBrains Mono (shared with the console) for identifiers read back over a
 *    radio, where unambiguous glyphs matter: incident IDs, flights, phone numbers.
 * Text styles live here and nowhere else, so every screen shares one scale.
 */
export type TextWeight = '300' | '400' | '500';

export const sansFace: Record<TextWeight, string> = {
  '300': 'HankenGrotesk_300Light',
  '400': 'HankenGrotesk_400Regular',
  '500': 'HankenGrotesk_500Medium',
};

export const fontFamily = {
  mono: 'JetBrainsMono_500Medium',
  monoSemibold: 'JetBrainsMono_600SemiBold',
} as const;

export type TextVariant =
  | 'display'
  | 'largeTitle'
  | 'title1'
  | 'title2'
  | 'headline'
  | 'body'
  | 'callout'
  | 'subhead'
  | 'footnote'
  | 'caption'
  | 'overline'
  | 'section'
  | 'label'
  | 'figure'
  | 'timer'
  | 'mono'
  | 'monoSmall'
  | 'monoLarge';

const sans = (size: number, lineHeight: number, weight: TextWeight): TextStyle => ({
  fontFamily: sansFace[weight],
  fontSize: size,
  lineHeight,
});

export const typography: Record<TextVariant, TextStyle> = {
  display: { ...sans(34, 40, '300'), letterSpacing: -0.6 },
  largeTitle: { ...sans(30, 36, '300'), letterSpacing: -0.5 },
  title1: { ...sans(24, 30, '300'), letterSpacing: -0.3 },
  title2: { ...sans(19, 25, '400'), letterSpacing: -0.2 },
  headline: { ...sans(16, 22, '500'), letterSpacing: -0.1 },
  body: sans(16, 23, '400'),
  callout: sans(15, 21, '400'),
  subhead: sans(14, 20, '400'),
  footnote: sans(13, 18, '400'),
  caption: sans(12, 16, '400'),
  /** Small labels above a group of controls. */
  overline: sans(13, 18, '400'),
  /** Section titles, in the same light voice as the headlines. */
  section: { ...sans(21, 27, '300'), letterSpacing: -0.2 },
  /** Every button's label. */
  label: { ...sans(13, 18, '500'), letterSpacing: 0.3, textTransform: 'uppercase' },
  /** Headline counts in stat rows. */
  figure: { ...sans(28, 32, '300'), letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  /** The running clock on the alert screen. */
  timer: { ...sans(52, 56, '300'), letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  mono: { fontFamily: fontFamily.mono, fontSize: 13, lineHeight: 18, fontVariant: ['tabular-nums'] },
  monoSmall: { fontFamily: fontFamily.mono, fontSize: 11, lineHeight: 14 },
  monoLarge: {
    fontFamily: fontFamily.monoSemibold,
    fontSize: 26,
    lineHeight: 30,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
};

/** The large opening headline. Sized by the caller from the screen's width, so it breaks the same way on every phone. */
export const heroHeadline = (size: number): TextStyle => ({
  fontFamily: sansFace['300'],
  fontSize: size,
  lineHeight: Math.round(size * 1.14),
  letterSpacing: -0.8,
});

/** The quiet line under the opening headline. */
export const heroMessage = (size: number): TextStyle => ({
  fontFamily: sansFace['300'],
  fontSize: size,
  lineHeight: Math.round(size * 1.35),
});

/** Dense rows cap Dynamic Type growth so layouts stay legible rather than clipped. */
export const maxFontScale = {
  dense: 1.4,
  standard: 2,
} as const;
