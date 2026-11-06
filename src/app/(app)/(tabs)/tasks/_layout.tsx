import { Stack } from 'expo-router';

import { stackScreenOptions, tabRootOptions } from '@/app-shell/header';
import { useColors } from '@/theme/theme';

export default function TasksStack() {
  const colors = useColors();
  return (
    <Stack screenOptions={stackScreenOptions(colors)}>
      <Stack.Screen name="index" options={tabRootOptions('Checklists')} />
    </Stack>
  );
}
