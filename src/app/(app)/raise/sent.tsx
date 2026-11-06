import { router, useLocalSearchParams } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useSession } from '@/auth/session';
import { useColors } from '@/theme/theme';
import { gutter, space } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { AmbientGlow } from '@/ui/hero-glow';
import { Text } from '@/ui/text';

/** Outcome of a field report: delivered, queued offline, or rejected (MOB-RSE-04/05). */
export default function RaiseSent() {
  const { status, error } = useLocalSearchParams<{ status: 'sent' | 'queued' | 'rejected'; error?: string }>();
  const colors = useColors();
  const aocc = useSession((s) => s.me?.settings.aoccPhone);

  const view =
    status === 'sent'
      ? { tone: colors.text, title: 'Sent to AOCC', body: 'AOCC has your report and is validating it. You will be notified when it is broadcast or rejected.' }
      : status === 'queued'
        ? { tone: colors.danger, title: 'Not sent yet: no connection', body: 'Your report is saved on this phone and sends automatically when you reconnect. AOCC has not received it. If this is urgent, call AOCC now.' }
        : { tone: colors.danger, title: 'Report rejected by ENS', body: error || 'The server did not accept this report. Call AOCC and review it under Account › Sync queue.' };

  return (
    <View style={[styles.root, { backgroundColor: colors.canvas }]}>
      <AmbientGlow />
      <Animated.View entering={FadeIn.duration(220)} style={styles.content}>
        <Text variant="largeTitle" style={{ color: view.tone }} accessibilityRole="header">
          {view.title}
        </Text>
        <Text variant="body" tone="textSecondary">
          {view.body}
        </Text>
      </Animated.View>
      <View style={styles.actions}>
        {status !== 'sent' && aocc ? (
          <Button label={`Call AOCC  ${aocc}`} icon="phone" variant="danger" size="xl" fullWidth onPress={() => void Linking.openURL(`tel:${aocc}`)} />
        ) : null}
        <Button
          label="Track in Reports"
          variant={status === 'sent' ? 'primary' : 'secondary'}
          size="lg"
          fullWidth
          onPress={() => {
            router.dismissAll();
            router.navigate('/reports');
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'space-between', paddingHorizontal: gutter, paddingVertical: space[6] },
  content: { flex: 1, justifyContent: 'center', gap: space[3], maxWidth: 480 },
  actions: { gap: space[2], maxWidth: 520, width: '100%', alignSelf: 'center' },
});
