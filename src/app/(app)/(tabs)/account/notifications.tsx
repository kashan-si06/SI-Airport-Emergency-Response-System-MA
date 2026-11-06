import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { PermissionChecklist } from '@/features/devices/permission-checklist';
import { TestAlertPanel } from '@/features/devices/test-alert-panel';
import { isDegraded, usePermissionHealth } from '@/notifications/permission-health';
import { pushSupported, pushUnavailableCopy } from '@/notifications/setup';
import { useColors } from '@/theme/theme';
import { gutter, space } from '@/theme/tokens';
import { Banner } from '@/ui/feedback';
import { Icon } from '@/ui/icon';
import { Row, Section } from '@/ui/list';
import { ScrollScreen } from '@/ui/screen';
import { Text } from '@/ui/text';

const TONES: { key: string; label: string; detail: string; source: number }[] = [
  { key: 'critical', label: 'Critical', detail: 'Two-tone siren · bypasses silent mode', source: require('@/assets/sounds/ens_critical.wav') },
  { key: 'high', label: 'High', detail: 'Rising sweep · bypasses silent mode', source: require('@/assets/sounds/ens_high.wav') },
  { key: 'drill', label: 'Drill', detail: 'Soft chime — never mistaken for live', source: require('@/assets/sounds/ens_drill.wav') },
  { key: 'info', label: 'Updates & broadcasts', detail: 'Single chime', source: require('@/assets/sounds/ens_info.wav') },
];

export default function NotificationSettings() {
  const colors = useColors();
  const health = usePermissionHealth((s) => s.health);
  const [playing, setPlaying] = useState<string | null>(null);
  const player = useRef<AudioPlayer | null>(null);

  const stop = () => {
    player.current?.pause();
    player.current?.remove();
    player.current = null;
    setPlaying(null);
  };

  useEffect(() => stop, []);

  const play = async (key: string, source: number) => {
    stop();
    if (playing === key) return;
    await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'doNotMix' });
    const p = createAudioPlayer(source);
    player.current = p;
    p.play();
    setPlaying(key);
    setTimeout(() => {
      if (player.current === p) stop();
    }, 5200);
  };

  return (
    <ScrollScreen>
      {isDegraded(health) ? (
        <Banner tone="danger" icon="bellSlash" title="App alerts may not reach you" message="Fix the items marked below. Until then AOCC relies on SMS and voice for you." />
      ) : null}

      {pushSupported ? (
        <Section title="Permissions">
          <PermissionChecklist />
        </Section>
      ) : (
        <Banner tone="info" icon="info" title={pushUnavailableCopy.title} message={pushUnavailableCopy.message} />
      )}

      <Section title="Test alert" footer="Sends a real push through ENS to this phone and records the result.">
        <View style={styles.pad}>
          <TestAlertPanel />
        </View>
      </Section>

      <Section title="Sound check" footer={Platform.OS === 'ios' ? 'Critical alerts play at full volume even when the ring switch is off.' : 'Critical and High play on the alarm stream when Do Not Disturb override is allowed.'}>
        {TONES.map((t) => (
          <Row
            key={t.key}
            title={t.label}
            subtitle={t.detail}
            chevron={false}
            trailing={<Icon name={playing === t.key ? 'close' : 'speaker'} size={18} color={colors.accent} />}
            onPress={() => void play(t.key, t.source)}
            accessibilityHint={playing === t.key ? 'Stops the sound' : 'Plays the sound'}
          />
        ))}
      </Section>

      <Text variant="footnote" tone="textTertiary" style={styles.foot}>
        Off-duty you still receive Critical and All-Station alerts. SMS and voice calls always run in parallel with app alerts.
      </Text>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: gutter, paddingVertical: space[4] },
  foot: { paddingHorizontal: gutter, paddingTop: space[4] },
});
