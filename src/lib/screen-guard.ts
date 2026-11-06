import { allowScreenCaptureAsync, preventScreenCaptureAsync } from 'expo-screen-capture';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Blocks screenshots only while a sensitive record is on screen.
 * expo-screen-capture's own hook cannot do this: an undefined key falls back to
 * 'default', which blocks capture on every screen that merely uses the hook.
 */
export function useSensitiveScreen(sensitive: boolean, key: string) {
  useEffect(() => {
    if (!sensitive || Platform.OS === 'web') return;
    void preventScreenCaptureAsync(key);
    return () => {
      void allowScreenCaptureAsync(key);
    };
  }, [sensitive, key]);
}
