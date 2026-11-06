import { HankenGrotesk_300Light } from '@expo-google-fonts/hanken-grotesk/300Light';
import { HankenGrotesk_400Regular } from '@expo-google-fonts/hanken-grotesk/400Regular';
import { HankenGrotesk_500Medium } from '@expo-google-fonts/hanken-grotesk/500Medium';
import { JetBrainsMono_500Medium, JetBrainsMono_600SemiBold, useFonts } from '@expo-google-fonts/jetbrains-mono';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { appVersion } from '@/api/client';
import { createEncryptedPersister, queryClient, shouldPersistQuery } from '@/api/query-client';
import { bootstrap } from '@/app-shell/boot';
import { ConfigErrorScreen, FatalScreen, UpgradeRequiredScreen } from '@/app-shell/system-screens';
import { useSession } from '@/auth/session';
import { envResult } from '@/config/env';
import { ThemeProvider, useTheme } from '@/theme/theme';
import { ToastHost } from '@/ui/toast';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        {envResult.success ? <Bootstrapped /> : <ConfigErrorScreen />}
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function Bootstrapped() {
  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState<Error | null>(null);
  const [fontsLoaded, fontError] = useFonts({
    HankenGrotesk_300Light,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
  });

  useEffect(() => {
    bootstrap()
      .then(() => setReady(true))
      .catch((e: unknown) => setFatal(e instanceof Error ? e : new Error(String(e))));
  }, []);

  if (fatal) return <FatalScreen error={fatal} />;
  if (!ready || (!fontsLoaded && !fontError)) return null;
  return <AppProviders />;
}

function AppProviders() {
  const persister = useMemo(() => createEncryptedPersister(), []);
  const boot = useSession((s) => s.boot);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000,
        buster: appVersion,
        dehydrateOptions: {
          shouldDehydrateQuery: (q) => q.state.status === 'success' && shouldPersistQuery(q.queryKey),
        },
      }}
      onSuccess={() => void boot()}
      onError={() => void boot()}>
      <Navigation />
    </PersistQueryClientProvider>
  );
}

function Navigation() {
  const { scheme, colors } = useTheme();
  const status = useSession((s) => s.status);
  const onboarded = useSession((s) => s.onboarded);
  const upgrade = useSession((s) => s.upgradeRequired);

  useEffect(() => {
    if (status !== 'booting') void SplashScreen.hideAsync();
  }, [status]);

  const navTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.accent,
        background: colors.canvas,
        card: colors.canvas,
        text: colors.text,
        border: colors.border,
        notification: colors.alarm,
      },
    };
  }, [scheme, colors]);

  if (status === 'booting') return null;
  if (upgrade) return <UpgradeRequiredScreen minVersion={upgrade.minVersion} />;

  const signedIn = status === 'signedIn';

  return (
    <NavThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" options={{ animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !onboarded}>
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && onboarded}>
          <Stack.Screen name="(app)" options={{ animation: 'fade' }} />
        </Stack.Protected>
      </Stack>
      <ToastHost />
    </NavThemeProvider>
  );
}
