import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';

import { stackScreenOptions } from '@/app-shell/header';
import { draftStarted, useRaiseDraft } from '@/features/reports/raise-draft';
import { useColors } from '@/theme/theme';
import { Button } from '@/ui/button';

export default function RaiseLayout() {
  const colors = useColors();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    useRaiseDraft.getState().load();
    setLoaded(true);
  }, []);

  const cancel = () => {
    const leave = () => router.dismissTo('/');
    if (!draftStarted(useRaiseDraft.getState().draft)) return leave();
    if (Platform.OS === 'web') {
      useRaiseDraft.getState().reset();
      return leave();
    }
    Alert.alert('Discard this report?', 'What you have entered will be deleted.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Keep as draft', onPress: leave },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          useRaiseDraft.getState().reset();
          leave();
        },
      },
    ]);
  };

  if (!loaded) return null;

  return (
    <Stack screenOptions={stackScreenOptions(colors)}>
      <Stack.Screen
        name="index"
        options={{ title: 'Raise emergency', headerLeft: () => <Button label="Cancel" variant="ghost" onPress={cancel} /> }}
      />
      <Stack.Screen name="details" options={{ title: 'Situation' }} />
      <Stack.Screen name="location" options={{ title: 'Location & photos' }} />
      <Stack.Screen name="review" options={{ title: 'Review' }} />
      <Stack.Screen name="sent" options={{ title: '', headerBackVisible: false, gestureEnabled: false }} />
    </Stack>
  );
}
