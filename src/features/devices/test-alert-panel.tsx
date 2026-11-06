import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { deviceApi } from '@/api/endpoints';
import { qk } from '@/api/queries';
import type { TestAlert } from '@/api/schemas';
import { haptic } from '@/lib/haptics';
import { parsePushData } from '@/notifications/payload';
import { usePermissionHealth } from '@/notifications/permission-health';
import { registerDevice } from '@/notifications/registration';
import { pushSupported, pushUnavailableCopy } from '@/notifications/setup';
import { useTestAlertSignal } from '@/notifications/wiring';
import { useColors } from '@/theme/theme';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { Banner, describeError } from '@/ui/feedback';
import { Text } from '@/ui/text';

const WAIT_SECONDS = 45;

type Phase =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'waiting'; test: TestAlert; startedAt: number }
  | { kind: 'received'; test: TestAlert }
  | { kind: 'acking'; test: TestAlert }
  | { kind: 'verified' }
  | { kind: 'timeout' }
  | { kind: 'error'; title: string; message: string };

/**
 * End-to-end delivery check (PRD MOB-ONB-04): server dispatches a real push
 * through FCM/APNs; the device is "Verified" only after the push is received
 * here and acknowledged.
 */
export function TestAlertPanel({ onVerified }: { onVerified?: () => void }) {
  const qc = useQueryClient();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [remaining, setRemaining] = useState(WAIT_SECONDS);
  const received = useTestAlertSignal((s) => s.received);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const waitingTestId = phase.kind === 'waiting' ? phase.test.testId : null;

  // Own listener: onboarding runs before the signed-in shell mounts its push wiring.
  useEffect(() => {
    if (!pushSupported) return;
    const sub = Notifications.addNotificationReceivedListener((n) => {
      const d = parsePushData(n.request.content.data);
      if (d?.type === 'TEST' && d.testId) useTestAlertSignal.getState().mark(d.testId);
    });
    return () => sub.remove();
  }, []);

  // Arrival via push listener.
  useEffect(() => {
    if (phase.kind === 'waiting' && received.includes(phase.test.testId)) {
      haptic.success();
      setPhase({ kind: 'received', test: phase.test });
    }
  }, [received, phase]);

  // Countdown + server poll (server marks DELIVERED from the push receipt).
  useEffect(() => {
    if (phase.kind !== 'waiting') return;
    const tick = setInterval(() => {
      const left = WAIT_SECONDS - Math.floor((Date.now() - phase.startedAt) / 1000);
      setRemaining(Math.max(0, left));
      if (left <= 0) setPhase({ kind: 'timeout' });
    }, 500);
    pollRef.current = setInterval(async () => {
      try {
        const t = await deviceApi.getTestAlert(phase.test.testId);
        if (t.status === 'DELIVERED' || t.status === 'ACKNOWLEDGED') setPhase({ kind: 'received', test: t });
        if (t.status === 'FAILED') setPhase({ kind: 'error', title: 'Push delivery failed', message: 'The push provider rejected this device token. Re-open the app and try again.' });
      } catch {
        /* keep waiting; network blips are expected here */
      }
    }, 3000);
    return () => {
      clearInterval(tick);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [waitingTestId, phase]);

  const send = async () => {
    setPhase({ kind: 'sending' });
    try {
      const health = await usePermissionHealth.getState().refresh();
      await registerDevice(health);
      const test = await deviceApi.sendTestAlert();
      setRemaining(WAIT_SECONDS);
      setPhase({ kind: 'waiting', test, startedAt: Date.now() });
    } catch (e) {
      setPhase({ kind: 'error', ...describeError(e) });
    }
  };

  const acknowledge = async (test: TestAlert) => {
    setPhase({ kind: 'acking', test });
    try {
      await deviceApi.ackTestAlert(test.testId);
      void qc.invalidateQueries({ queryKey: qk.devices });
      haptic.success();
      setPhase({ kind: 'verified' });
      onVerified?.();
    } catch (e) {
      setPhase({ kind: 'error', ...describeError(e) });
    }
  };

  if (!pushSupported) {
    return (
      <Banner flush tone="info" icon="info" title={pushUnavailableCopy.title} message="Test alerts need push notifications, which this runtime does not support." />
    );
  }

  return (
    <View style={styles.wrap}>
      <Status phase={phase} remaining={remaining} />

      {phase.kind === 'idle' || phase.kind === 'timeout' || phase.kind === 'error' ? (
        <Button
          label={phase.kind === 'idle' ? 'Send test alert' : 'Send again'}
          icon="send"
          size="lg"
          fullWidth
          onPress={() => void send()}
        />
      ) : null}
      {phase.kind === 'sending' ? <Button label="Sending…" size="lg" fullWidth loading /> : null}
      {phase.kind === 'received' || phase.kind === 'acking' ? (
        <Button
          label="Acknowledge test"
          icon="acknowledge"
          variant="success"
          size="lg"
          fullWidth
          loading={phase.kind === 'acking'}
          onPress={() => void acknowledge(phase.test)}
        />
      ) : null}
    </View>
  );
}

function Status({ phase, remaining }: { phase: Phase; remaining: number }) {
  const colors = useColors();
  switch (phase.kind) {
    case 'idle':
      return (
        <Line icon="push" color={colors.textSecondary} title="Ready" body="We will send a real push alert to this phone. It should arrive within a few seconds." />
      );
    case 'sending':
      return <Line icon="send" color={colors.accent} title="Dispatching" body="Asking ENS to send the test alert…" />;
    case 'waiting':
      return (
        <Line
          icon="timer"
          color={colors.accent}
          title={`Waiting for delivery · ${remaining}s`}
          body="Leave this screen open. You may see a notification banner."
        />
      );
    case 'received':
    case 'acking':
      return <Line icon="checkCircle" color={colors.text} title="Alert received" body="Delivery confirmed. Acknowledge it to complete the check." />;
    case 'verified':
      return <Line icon="acknowledge" color={colors.text} title="Device verified" body="This phone receives and acknowledges ENS alerts." />;
    case 'timeout':
      return (
        <Line
          icon="warning"
          color={colors.caution}
          title="Not received"
          body="Check that notifications are allowed and the phone has data. You can continue — ENS will rely on SMS and voice for you until verified."
        />
      );
    case 'error':
      return <Line icon="warning" color={colors.danger} title={phase.title} body={phase.message} />;
  }
}

function Line({ color, title, body }: { icon?: string; color: string; title: string; body: string }) {
  return (
    <View style={styles.line} accessibilityLiveRegion="polite">
      <Text variant="title2" style={{ color }}>
        {title}
      </Text>
      <Text variant="footnote" tone="textSecondary">
        {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[3] },
  line: { gap: space[1] },
});
