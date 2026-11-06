import { Stack, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { stackScreenOptions } from '@/app-shell/header';
import { useSession } from '@/auth/session';
import { useForegroundAlerts } from '@/notifications/foreground-alerts';
import { useNotificationWiring } from '@/notifications/wiring';
import { useOutboxSync } from '@/offline/sync';
import { useAppLock, useAppLockTimer } from '@/security/app-lock';
import { useColors } from '@/theme/theme';
import { gutter, space } from '@/theme/tokens';
import { BrandMark } from '@/ui/brand';
import { Button } from '@/ui/button';
import { AmbientGlow } from '@/ui/hero-glow';
import { Text } from '@/ui/text';

export const unstable_settings = { anchor: '(tabs)' };

export default function AppLayout() {
  const colors = useColors();
  const lockMinutes = useSession((s) => s.me?.settings.appLockMinutes ?? 15);

  useNotificationWiring();
  useForegroundAlerts();
  useOutboxSync();
  useAppLockTimer(lockMinutes);

  return (
    <>
      <Stack screenOptions={stackScreenOptions(colors)}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="alert/[id]"
          options={{ presentation: 'fullScreenModal', headerShown: false, gestureEnabled: false, animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="incident/[id]/index" options={{ title: '' }} />
        <Stack.Screen
          name="incident/[id]/status"
          options={{ presentation: 'formSheet', sheetAllowedDetents: [0.75, 1], sheetGrabberVisible: true, title: 'My status' }}
        />
        <Stack.Screen name="incident/[id]/task/[taskId]" options={{ title: 'Checklist step' }} />
        <Stack.Screen name="incident/[id]/command" options={{ title: 'Command view' }} />
        <Stack.Screen name="incident/[id]/update" options={{ presentation: 'modal', title: 'Send update' }} />
        <Stack.Screen name="incident/[id]/ignore" options={{ presentation: 'modal', title: 'Ignore alert' }} />
        <Stack.Screen name="incident/[id]/broadcast" options={{ presentation: 'modal', title: 'Broadcast to SPOCs' }} />
        <Stack.Screen name="raise" options={{ presentation: 'modal', headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="field-report/[id]/index" options={{ title: 'Field report' }} />
        <Stack.Screen name="field-report/[id]/validate" options={{ presentation: 'modal', title: 'Validate report' }} />
        <Stack.Screen name="broadcasts" options={{ title: 'Broadcasts' }} />
        <Stack.Screen name="history" options={{ title: 'Incident history' }} />
        <Stack.Screen name="attachment" options={{ presentation: 'fullScreenModal', headerShown: false }} />
      </Stack>
      <LockOverlay />
    </>
  );
}

/** Covers the app after inactivity; the alert screen stays reachable (MOB-ONB-06). */
function LockOverlay() {
  const colors = useColors();
  const locked = useAppLock((s) => s.locked);
  const unlock = useAppLock((s) => s.unlock);
  const pathname = usePathname();
  if (!locked || pathname.startsWith('/alert/')) return null;
  return (
    <View style={[StyleSheet.absoluteFill, styles.lock, { backgroundColor: colors.canvas }]} accessibilityViewIsModal>
      <AmbientGlow />
      <BrandMark size={44} />
      <Text variant="largeTitle">ENS is locked</Text>
      <Text variant="body" tone="textSecondary">
        Incoming alerts still show full-screen and can be acknowledged without unlocking.
      </Text>
      <Button label="Unlock" size="lg" fullWidth onPress={() => void unlock()} />
    </View>
  );
}

const styles = StyleSheet.create({
  lock: { justifyContent: 'center', gap: space[4], paddingHorizontal: gutter, zIndex: 100 },
});
