/**
 * ENS design tokens, shared with the web console (SI-ENS-FE globals.css).
 *
 * The language: a neutral sheet on a soft ground, with emphasis from ink. Red is
 * reserved for emergencies and yellow for drills, so either can only mean one
 * thing. Severity is never conveyed by colour alone; every severity surface pairs
 * colour with an icon and a text label (PRD FR-NAV-04, NFR-M5).
 */

import type { Severity } from '@/api/schemas';

export type ColorScheme = 'light' | 'dark';

export type Palette = {
  /** Window canvas behind grouped content. */
  canvas: string;
  /** Primary content surface (rows, panels). */
  surface: string;
  /** Raised surface: sheets, dialogs, pressed rows. */
  surfaceRaised: string;
  /** Recessed wells: inputs, code, inactive segments. */
  surfaceSunken: string;
  /** Pressed / highlighted row state. */
  surfacePressed: string;

  border: string;
  borderStrong: string;
  separator: string;

  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  /** Primary action fill (ink). */
  ink: string;
  inkPressed: string;
  onInk: string;

  /** Selection and links. Deliberately ink: interaction is not a colour here. */
  accent: string;
  accentPressed: string;
  accentMuted: string;
  onAccent: string;

  /** Information and "responding": never an interaction colour. */
  info: string;
  infoMuted: string;

  success: string;
  successMuted: string;
  caution: string;
  cautionMuted: string;
  /** Errors and destructive text on neutral ground. */
  danger: string;
  dangerMuted: string;
  onDanger: string;
  /** Emergency fill: live alerts and raising one. Nothing else. */
  alarm: string;
  alarmPressed: string;

  /** Drill as text or an icon on a neutral surface. */
  drill: string;
  /** Drill marking fill, always paired with onDrill and the word "Drill". */
  drillFill: string;
  drillMuted: string;
  onDrill: string;

  critical: string;
  criticalMuted: string;
  high: string;
  highMuted: string;
  medium: string;
  mediumMuted: string;
  low: string;
  lowMuted: string;

  scrim: string;
  focusRing: string;
  skeleton: string;
};

export const palettes: Record<ColorScheme, Palette> = {
  dark: {
    canvas: '#0F1012',
    surface: '#17181B',
    surfaceRaised: '#1F2124',
    surfaceSunken: '#0B0C0E',
    surfacePressed: '#24262A',

    border: '#26282C',
    borderStrong: '#3D4045',
    separator: '#26282C',

    text: '#E8E9EB',
    textSecondary: '#A6AAAF',
    textTertiary: '#8A8E94',
    textInverse: '#0F1012',

    ink: '#E8E9EB',
    inkPressed: '#C1C4C8',
    onInk: '#0F1012',

    accent: '#E8E9EB',
    accentPressed: '#C1C4C8',
    accentMuted: '#24262A',
    onAccent: '#0F1012',

    info: '#86B0FF',
    infoMuted: 'rgba(91,149,255,0.13)',

    success: '#5CCB92',
    successMuted: 'rgba(52,184,116,0.12)',
    caution: '#FFA266',
    cautionMuted: 'rgba(255,138,61,0.12)',
    danger: '#FF7484',
    dangerMuted: 'rgba(212,33,58,0.14)',
    onDanger: '#FFFFFF',
    alarm: '#D4213A',
    alarmPressed: '#B51B31',

    drill: '#FFC72C',
    drillFill: '#FFC72C',
    drillMuted: 'rgba(255,199,44,0.12)',
    onDrill: '#07090C',

    critical: '#FF7484',
    criticalMuted: 'rgba(239,59,82,0.13)',
    high: '#FFA266',
    highMuted: 'rgba(255,138,61,0.12)',
    medium: '#F5D26A',
    mediumMuted: 'rgba(242,201,76,0.11)',
    low: '#86B0FF',
    lowMuted: 'rgba(91,149,255,0.13)',

    scrim: 'rgba(3,5,8,0.66)',
    focusRing: '#E8E9EB',
    skeleton: '#24262A',
  },
  light: {
    canvas: '#F5F5F5',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    surfaceSunken: '#EEEEEE',
    surfacePressed: '#F1F1F1',

    border: '#ECECEC',
    borderStrong: '#D0D0D0',
    separator: '#ECECEC',

    text: '#202124',
    textSecondary: '#5F6368',
    textTertiary: '#696E73',
    textInverse: '#FFFFFF',

    ink: '#202124',
    inkPressed: '#3C4043',
    onInk: '#FFFFFF',

    accent: '#202124',
    accentPressed: '#3C4043',
    accentMuted: '#EEEEEE',
    onAccent: '#FFFFFF',

    info: '#1A54B8',
    infoMuted: '#E7EFFD',

    success: '#136E3E',
    successMuted: '#E2F3E9',
    caution: '#B4470A',
    cautionMuted: '#FDEEE3',
    danger: '#B30D28',
    dangerMuted: '#FBE8EB',
    onDanger: '#FFFFFF',
    alarm: '#C8102E',
    alarmPressed: '#A80C25',

    drill: '#6E5200',
    drillFill: '#FFC72C',
    drillMuted: '#FFF5D1',
    onDrill: '#12161C',

    critical: '#B30D28',
    criticalMuted: '#FBE8EB',
    high: '#B4470A',
    highMuted: '#FDEEE3',
    medium: '#8A6700',
    mediumMuted: '#FFF5D1',
    low: '#1A54B8',
    lowMuted: '#E7EFFD',

    scrim: 'rgba(32,33,36,0.45)',
    focusRing: '#1A73E8',
    skeleton: '#EEEEEE',
  },
};

/** Full-bleed alert fields, identical in both themes: an alert looks the same in any light. */
export const severityBands: Record<Severity | 'DRILL', { bg: string; fg: string; pressed: string; muted: string }> = {
  CRITICAL: { bg: '#C8102E', fg: '#FFFFFF', pressed: '#A80C25', muted: 'rgba(255,255,255,0.82)' },
  HIGH: { bg: '#B8480A', fg: '#FFFFFF', pressed: '#9A3C08', muted: 'rgba(255,255,255,0.84)' },
  // Deep amber on purpose: bright yellow means a drill, and only a drill.
  MEDIUM: { bg: '#7A5B00', fg: '#FFFFFF', pressed: '#664C00', muted: 'rgba(255,255,255,0.84)' },
  LOW: { bg: '#1F62D4', fg: '#FFFFFF', pressed: '#1A54B8', muted: 'rgba(255,255,255,0.84)' },
  DRILL: { bg: '#FFC72C', fg: '#12161C', pressed: '#E6B327', muted: 'rgba(18,22,28,0.76)' },
};

/** 4-pt spacing scale. */
export const space = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const radius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 8,
  sheet: 14,
  pill: 999,
} as const;

/** The one left and right margin. Headlines, section titles, rows and buttons all line up on it. */
export const gutter = space[5];

export const hairline = 1;

/** Minimum touch target (HIG 44pt, M3 48dp). Field use with gloves → 48. */
export const hitTarget = 48;

export const motion = {
  fast: 120,
  base: 200,
  slow: 320,
} as const;
