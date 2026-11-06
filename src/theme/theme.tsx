import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { Appearance, Platform } from 'react-native';

import { palettes, type ColorScheme, type Palette } from './tokens';

type ThemeValue = {
  scheme: ColorScheme;
  colors: Palette;
};

const THEME: ThemeValue = { scheme: 'dark', colors: palettes.dark };

const ThemeContext = createContext<ThemeValue | null>(null);

/** ENS has one look, built on the dark ground. Native chrome (keyboard, alerts, tab bar) is held to it too. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (Platform.OS !== 'web') Appearance.setColorScheme('dark');
  }, []);

  return <ThemeContext.Provider value={THEME}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

export function useColors(): Palette {
  return useTheme().colors;
}
