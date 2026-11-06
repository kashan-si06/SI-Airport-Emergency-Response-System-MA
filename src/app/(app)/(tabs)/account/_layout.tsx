import { Stack } from 'expo-router';

import { stackScreenOptions, tabRootOptions } from '@/app-shell/header';
import { useColors } from '@/theme/theme';

export default function AccountStack() {
  const colors = useColors();
  return (
    <Stack screenOptions={stackScreenOptions(colors)}>
      <Stack.Screen name="index" options={tabRootOptions('Account')} />
      <Stack.Screen name="notifications" options={{ title: 'Alerts & sound' }} />
      <Stack.Screen name="devices" options={{ title: 'Devices' }} />
      <Stack.Screen name="contacts" options={{ title: 'Contact details' }} />
      <Stack.Screen name="password" options={{ title: 'Change password' }} />
      <Stack.Screen name="outbox" options={{ title: 'Sync queue' }} />
      <Stack.Screen name="report-problem" options={{ title: 'Report a problem' }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacy notice' }} />
      <Stack.Screen name="about" options={{ title: 'About ENS' }} />
    </Stack>
  );
}
