import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { qk, useIncident } from '@/api/queries';
import type { Home, IncidentSummary, ResponderStatus } from '@/api/schemas';
import { useSession } from '@/auth/session';
import { submitResponderStatus } from '@/features/incidents/acknowledge';
import { currentPositionIfPermitted } from '@/features/incidents/location';
import { headingWithoutDrillPrefix, responderMeta, severityMeta } from '@/domain/presentation';
import { formatElapsed, formatTimeSeconds } from '@/domain/time';
import { haptic } from '@/lib/haptics';
import { useSensitiveScreen } from '@/lib/screen-guard';
import { useNow } from '@/lib/use-now';
import { openAlert, startAlarm, stopAlarm } from '@/notifications/alarm';
import { selectPendingAck, useOutbox } from '@/offline/outbox';
import { useColors } from '@/theme/theme';
import { radius, severityBands, space } from '@/theme/tokens';
import { heroHeadline } from '@/theme/typography';
import { Button } from '@/ui/button';
import { ErrorState, SkeletonRows } from '@/ui/feedback';
import { HazardStripe } from '@/ui/hazard';
import { Icon } from '@/ui/icon';
import { KeyValue } from '@/ui/list';
import { RimLight } from '@/ui/rim-light';
import { Text } from '@/ui/text';

/** The field runs this far past its content, so the curve closes it off below the words. */
const FIELD_STRETCH = 1.28;
/** Clears the lowest point of the curve before the details begin. */
const FIELD_GAP = 0.13;

export default function AlertScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [fieldBottom, setFieldBottom] = useState(0);
  const qc = useQueryClient();
  const me = useSession((s) => s.me);
  const detail = useIncident(id);
  const queued = useOutbox(selectPendingAck(id));
  const nowMs = useNow();
  const [silenced, setSilenced] = useState(false);
  const [locating, setLocating] = useState(false);

  // Render instantly from the home list while detail loads.
  const summary: IncidentSummary | undefined =
    detail.data ??
    qc.getQueryData<Home>(qk.home)?.pendingAck.find((s) => s.id === id) ??
    qc.getQueryData<Home>(qk.home)?.active.find((s) => s.id === id);

  useSensitiveScreen(summary?.sensitive ?? false, `alert-${id}`);

  // Tells push handling this alert is already open, so a re-alert does not stack a second copy.
  useEffect(() => {
    openAlert.id = id;
    return () => {
      if (openAlert.id === id) openAlert.id = null;
    };
  }, [id]);

  const needsAck = !!summary && summary.my.pendingAckUpdateId !== null;
  const acked = !!summary?.my.responderStatus && !needsAck;
  const ended = summary && (summary.status === 'CANCELLED' || summary.status === 'TERMINATED' || summary.status === 'CLOSED');

  useEffect(() => {
    if (summary && needsAck && !ended && !silenced) void startAlarm(summary.id, summary.severity, summary.isDrill);
    else stopAlarm(id);
  }, [summary?.id, summary?.severity, summary?.isDrill, needsAck, ended, silenced, id]);

  useEffect(() => () => stopAlarm(id), [id]);

  if (!summary) {
    return (
      <View style={[styles.root, { backgroundColor: colors.canvas, paddingTop: insets.top + space[4] }]}>
        {detail.isPending ? <SkeletonRows rows={4} /> : <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />}
        <Button label="Close" variant="secondary" onPress={() => router.back()} style={{ margin: space[4] }} />
      </View>
    );
  }

  const sev = severityMeta[summary.severity];
  // A stood-down alert drops its colour: red means an emergency, and this one is over.
  const band = ended
    ? { bg: colors.surfacePressed, fg: colors.text, muted: colors.textSecondary, pressed: colors.surfaceRaised }
    : severityBands[summary.isDrill ? 'DRILL' : summary.severity];
  const statusLabel = ended
    ? summary.status === 'CANCELLED'
      ? 'Retracted'
      : 'Stood down'
    : summary.isDrill
      ? 'Drill · Exercise only'
      : `${sev.label} emergency`;

  const respond = async (status: ResponderStatus) => {
    if (status === 'UNABLE') {
      router.push({ pathname: '/incident/[id]/status', params: { id: summary.id, preset: 'UNABLE' } });
      return;
    }
    haptic.success();
    stopAlarm(summary.id);
    let location = null;
    if (status === 'ON_SCENE') {
      setLocating(true);
      location = await currentPositionIfPermitted();
      setLocating(false);
    }
    submitResponderStatus({
      notificationId: summary.id,
      displayId: summary.displayId,
      updateId: summary.my.pendingAckUpdateId,
      status,
      location,
    });
  };

  const close = () => {
    stopAlarm(summary.id);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const openIncident = () => router.replace({ pathname: '/incident/[id]', params: { id: summary.id } });
  const elapsed = formatElapsed(summary.createdAt, nowMs);

  return (
    <View style={[styles.root, { backgroundColor: colors.canvas }]}>
      {fieldBottom > 0 ? (
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.band, { height: fieldBottom * FIELD_STRETCH, backgroundColor: band.bg }]}>
          <Image source={require('@/assets/images/heroes/alert-field.webp')} contentFit="fill" style={StyleSheet.absoluteFill} />
          <RimLight width={width} height={fieldBottom * FIELD_STRETCH} running={needsAck && !ended} />
        </View>
      ) : null}

      {summary.isDrill && !ended ? (
        <View style={{ paddingTop: insets.top }}>
          <HazardStripe height={10} />
        </View>
      ) : null}

      {/* The severity field: what, where, how long. Everything else waits below. */}
      <View
        onLayout={(e) => setFieldBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}
        style={[styles.field, { paddingTop: (summary.isDrill && !ended ? 0 : insets.top) + space[2], marginBottom: fieldBottom * FIELD_GAP }]}>
        <View style={styles.fieldTop}>
          <View style={styles.statusLabel}>
            <SeverityPulse active={!summary.isDrill && needsAck && !ended} color={band.fg}>
              <Icon name={ended ? 'checkCircle' : summary.isDrill ? 'drill' : sev.icon} size={20} color={band.fg} />
            </SeverityPulse>
            <Text variant="subhead" style={{ color: band.fg }} numberOfLines={1}>
              {statusLabel}
            </Text>
          </View>
          <View style={styles.fieldButtons}>
            {needsAck && !silenced && !ended ? (
              <FieldButton icon="bellSlash" label="Silence alarm" color={band.fg} onPress={() => { setSilenced(true); stopAlarm(summary.id); }} />
            ) : null}
            <FieldButton icon="close" label="Close alert" color={band.fg} onPress={close} />
          </View>
        </View>

        <Text numberOfLines={4} adjustsFontSizeToFit minimumFontScale={0.7} accessibilityRole="header" style={[heroHeadline(Math.round(Math.min(46, width * 0.095))), styles.heading, { color: band.fg }]}>
          {headingWithoutDrillPrefix(detail.data?.heading ?? summary.title)}
        </Text>
        <View style={styles.where}>
          <Text variant="title2" numberOfLines={2} style={[styles.flex, { color: band.fg }]}>
            {summary.location ?? 'Location not specified'}
          </Text>
        </View>

        <View style={styles.clock}>
          <Text variant="timer" dense numberOfLines={1} accessibilityLabel={`${elapsed} since raised`} style={{ color: band.fg }}>
            {elapsed}
          </Text>
          <View style={styles.clockLabels}>
            <Text variant="footnote" style={{ color: band.muted }}>
              since raised
            </Text>
            <Text variant="mono" style={{ color: band.muted }}>
              {summary.displayId}
            </Text>
          </View>
        </View>
        {summary.aeocActive ? (
          <Text variant="subhead" style={{ color: band.fg }}>
            AEOC active
          </Text>
        ) : null}
      </View>

      {/* Detail and the response sit below the curve, on the page. */}
      <View style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text variant="footnote" tone="textSecondary">
            {summary.emergencyType} · {summary.messageType} · {summary.department.code}
          </Text>

          {detail.data ? (
            <Animated.View entering={FadeIn.duration(160)} style={styles.message}>
              <Text variant="body">{detail.data.body}</Text>
              {detail.data.flight ? (
                <View style={[styles.grid, { borderColor: colors.separator }]}>
                  <KeyValue label="Flight" value={detail.data.flight.number} mono />
                  <KeyValue label="Operator" value={detail.data.flight.operator} />
                  <KeyValue label="Aircraft" value={detail.data.flight.aircraftType} mono />
                  <KeyValue label="Sector" value={detail.data.flight.sector} mono />
                  <KeyValue label="Persons on board" value={detail.data.flight.personsOnBoard?.toString()} />
                </View>
              ) : null}
            </Animated.View>
          ) : detail.isPending ? (
            <SkeletonRows rows={2} />
          ) : null}

          {me?.settings.aoccPhone ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Call AOCC ${me.settings.aoccPhone}`}
              onPress={() => void Linking.openURL(`tel:${me.settings.aoccPhone}`)}
              style={({ pressed }) => [styles.call, { borderColor: colors.separator, backgroundColor: pressed ? colors.surfacePressed : 'transparent' }]}>
                            <Text variant="body">Call AOCC</Text>
              <Text variant="mono" tone="textSecondary" style={styles.callNumber} numberOfLines={1}>
                {me.settings.aoccPhone}
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>

        <View style={[styles.dock, { borderTopColor: colors.border, paddingBottom: insets.bottom + space[3] }]}>
          {acked ? (
            <AckedState summary={summary} queued={!!queued} onChange={respond} onOpen={openIncident} />
          ) : ended || !needsAck ? (
            <Button label="Open incident" size="xl" fullWidth trailingIcon="chevronRight" onPress={openIncident} />
          ) : (
            <>
              <Button
                label="Acknowledge"
                icon="acknowledge"
                size="xl"
                fullWidth
                hapticStyle="heavy"
                onPress={() => void respond('ACKNOWLEDGED')}
                testID="ack"
              />
              <View style={styles.dockRow}>
                <Button label="Responding" icon="responding" variant="secondary" size="lg" style={styles.flex} onPress={() => void respond('RESPONDING')} />
                <Button label="On scene" icon="onScene" variant="secondary" size="lg" style={styles.flex} loading={locating} onPress={() => void respond('ON_SCENE')} />
              </View>
              <Button label="Unable to respond" variant="ghost" onPress={() => void respond('UNABLE')} />
            </>
          )}
        </View>
      </View>
    </View>
  );
}

/** A slow ring on an alert still waiting for a response. */
function SeverityPulse({ active, color, children }: { active: boolean; color: string; children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const animate = active && !reduceMotion;
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = 0;
    if (animate) t.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1);
  }, [animate, t]);
  const ring = useAnimatedStyle(() => ({ opacity: animate ? 0.5 * (1 - t.value) : 0, transform: [{ scale: 1 + t.value * 1.1 }] }));
  return (
    <View style={styles.pulse}>
      <Animated.View pointerEvents="none" style={[styles.pulseRing, { borderColor: color }, ring]} />
      {children}
    </View>
  );
}

function AckedState({
  summary,
  queued,
  onChange,
  onOpen,
}: {
  summary: IncidentSummary;
  queued: boolean;
  onChange: (s: ResponderStatus) => void;
  onOpen: () => void;
}) {
  const colors = useColors();
  const status = summary.my.responderStatus!;
  const m = responderMeta[status];
  return (
    <Animated.View entering={FadeIn.duration(200)} style={{ gap: space[3] }}>
      <View style={styles.ackLine} accessibilityLiveRegion="assertive">
        {queued ? <Icon name="sync" size={24} color={colors.caution} /> : null}
        <View style={styles.flex}>
          <Text variant="title1" tone={queued ? 'caution' : 'text'}>
            {m.label}
          </Text>
          <Text variant="footnote" tone="textSecondary">
            {queued ? 'Saved on this phone, not yet received by AOCC. Sends automatically.' : `Received by AOCC at ${formatTimeSeconds(summary.my.ackedAt)} IST`}
          </Text>
        </View>
      </View>
      {status !== 'ON_SCENE' ? (
        <View style={styles.dockRow}>
          {status !== 'RESPONDING' ? (
            <Button label="Responding" icon="responding" variant="secondary" size="lg" style={styles.flex} onPress={() => onChange('RESPONDING')} />
          ) : null}
          <Button label="On scene" icon="onScene" variant="secondary" size="lg" style={styles.flex} onPress={() => onChange('ON_SCENE')} />
        </View>
      ) : null}
      <Button label="Open incident" size="lg" fullWidth trailingIcon="chevronRight" onPress={onOpen} />
    </Animated.View>
  );
}

function FieldButton({ icon, label, color, onPress }: { icon: 'close' | 'bellSlash'; label: string; color: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.fieldButton, { opacity: pressed ? 0.55 : 1 }]}>
      <Icon name={icon} size={22} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  band: { position: 'absolute', top: 0, left: 0, right: 0 },
  field: { paddingHorizontal: space[5], paddingBottom: space[2] },
  fieldTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  statusLabel: { flexDirection: 'row', alignItems: 'center', gap: space[2], flex: 1 },
  fieldButtons: { flexDirection: 'row', marginRight: -space[2] },
  fieldButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pulse: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  pulseRing: { position: 'absolute', width: 24, height: 24, borderRadius: radius.pill, borderWidth: 2 },
  heading: { marginTop: space[4] },
  where: { flexDirection: 'row', alignItems: 'flex-start', gap: space[1.5], marginTop: space[2] },
  clock: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginTop: space[4] },
  clockLabels: { gap: 1 },
  scroll: { paddingHorizontal: space[5], paddingTop: space[2], paddingBottom: space[4], gap: space[2], maxWidth: 720, width: '100%', alignSelf: 'center' },
  message: { gap: space[4], marginTop: space[1] },
  grid: { marginHorizontal: -space[5], borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  call: { marginTop: space[3], marginHorizontal: -space[5], flexDirection: 'row', alignItems: 'center', gap: space[2], borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: space[5], minHeight: 56 },
  callNumber: { marginLeft: 'auto', flexShrink: 1 },
  dock: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: space[4], paddingTop: space[3], gap: space[2] },
  dockRow: { flexDirection: 'row', gap: space[2] },
  ackLine: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
});
