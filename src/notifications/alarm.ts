import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { Platform, Vibration } from 'react-native';

import type { Severity } from '@/api/schemas';
import { log } from '@/lib/log';

/**
 * In-app persistent alarm for an unacknowledged alert while ENS is in the
 * foreground (PRD MOB-PUSH-03 "persistent foreground alarm until acted on").
 * Background/lock-screen sound is delivered by the OS notification itself.
 */

const tones = {
  critical: require('@/assets/sounds/ens_critical.wav'),
  high: require('@/assets/sounds/ens_high.wav'),
  drill: require('@/assets/sounds/ens_drill.wav'),
  info: require('@/assets/sounds/ens_info.wav'),
};

let player: AudioPlayer | null = null;
let activeFor: string | null = null;

const VIBRATION = Platform.OS === 'android' ? [0, 700, 400, 700, 400] : [0, 1000];

export async function startAlarm(notificationId: string, severity: Severity, isDrill: boolean) {
  if (Platform.OS === 'web') return;
  if (activeFor === notificationId) return;
  stopAlarm();
  activeFor = notificationId;
  // Critical, High and drills repeat until acted on; Medium and Low chime once.
  const urgent = isDrill || severity === 'CRITICAL' || severity === 'HIGH';
  Vibration.vibrate(VIBRATION, urgent);
  try {
    await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'doNotMix', shouldPlayInBackground: false });
    // Stopped or superseded while the audio session was starting.
    if (activeFor !== notificationId) return;
    player = createAudioPlayer(isDrill ? tones.drill : severity === 'CRITICAL' ? tones.critical : severity === 'HIGH' ? tones.high : tones.info);
    player.loop = urgent;
    player.volume = 1;
    player.play();
  } catch (e) {
    log.error('alarm.start', e instanceof Error ? e.message : e);
  }
}

export function stopAlarm(notificationId?: string) {
  if (notificationId && activeFor !== notificationId) return;
  activeFor = null;
  Vibration.cancel();
  if (player) {
    try {
      player.pause();
      player.remove();
    } catch {
      /* already released */
    }
    player = null;
  }
}

export function alarmActiveFor(): string | null {
  return activeFor;
}

/** The alert currently on screen, so push handling never stacks a second copy of it. */
export const openAlert: { id: string | null } = { id: null };
