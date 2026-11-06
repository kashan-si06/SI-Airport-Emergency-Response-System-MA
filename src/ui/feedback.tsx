import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ApiError } from '@/api/errors';
import { useColors } from '@/theme/theme';
import { gutter, radius, space, type Palette } from '@/theme/tokens';

import { Button } from './button';
import { Icon, type IconName } from './icon';
import { Text } from './text';

/* ───────────── Banner: full-width strip for system state ───────────── */

type BannerProps = {
  tone: 'danger' | 'caution' | 'drill' | 'info' | 'success';
  icon: IconName;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
  /** Inside an already-padded container: no outer margin. */
  flush?: boolean;
};

const bannerTone: Record<BannerProps['tone'], { fg: keyof Palette; bg: keyof Palette }> = {
  danger: { fg: 'danger', bg: 'dangerMuted' },
  caution: { fg: 'caution', bg: 'cautionMuted' },
  drill: { fg: 'onDrill', bg: 'drillFill' },
  info: { fg: 'info', bg: 'infoMuted' },
  success: { fg: 'success', bg: 'successMuted' },
};

export function Banner({ tone, icon, title, message, action, flush }: BannerProps) {
  const colors = useColors();
  const t = bannerTone[tone];
  return (
    <View
      accessibilityRole="alert"
      style={[styles.banner, flush && styles.bannerFlush, { backgroundColor: colors[t.bg] }]}>
      <Icon name={icon} size={18} color={colors[t.fg]} />
      <View style={styles.bannerText}>
        <Text variant="subhead" weight="500" tone={t.fg}>
          {title}
        </Text>
        {message ? (
          <Text variant="footnote" tone={tone === 'drill' ? 'onDrill' : 'textSecondary'}>
            {message}
          </Text>
        ) : null}
      </View>
      {action ? (
        <Pressable accessibilityRole="button" onPress={action.onPress} hitSlop={8} style={styles.bannerAction}>
          <Text variant="subhead" weight="500" tone={t.fg}>
            {action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ───────────── Empty / error / loading states ───────────── */

export function EmptyState({
  title,
  message,
  action,
}: {
  /** Accepted for the callers that name one. Empty states are words alone. */
  icon?: IconName;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.state} accessible accessibilityLabel={[title, message].filter(Boolean).join('. ')}>
      <Text variant="title1">{title}</Text>
      {message ? (
        <Text variant="subhead" tone="textSecondary" style={styles.stateMessage}>
          {message}
        </Text>
      ) : null}
      {action}
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { title, message } = describeError(error);
  return (
    <EmptyState
      icon={error instanceof ApiError && error.kind === 'network' ? 'wifiOff' : 'warning'}
      title={title}
      message={message}
      action={onRetry ? <Button label="Try again" variant="secondary" icon="refresh" onPress={onRetry} /> : undefined}
    />
  );
}

export function describeError(error: unknown): { title: string; message: string } {
  if (error instanceof ApiError) {
    switch (error.kind) {
      case 'network':
        return { title: 'No connection', message: 'ENS could not be reached. Showing saved data where available.' };
      case 'timeout':
        return { title: 'Server not responding', message: 'The request timed out. Check your connection and try again.' };
      case 'forbidden':
        return { title: 'Not permitted', message: 'Your role does not allow this action. Contact your ENS administrator.' };
      case 'notFound':
        return { title: 'Not found', message: 'This record no longer exists or you no longer have access to it.' };
      case 'conflict':
        return { title: 'Already updated', message: error.message };
      case 'validation':
        return { title: 'Check the details', message: error.message };
      default:
        return { title: 'Something went wrong', message: error.message };
    }
  }
  return { title: 'Something went wrong', message: error instanceof Error ? error.message : 'Unexpected error.' };
}

/** Pulsing placeholder rows; matches the geometry of the content they stand in for. */
export function SkeletonRows({ rows = 4, lines = 2 }: { rows?: number; lines?: number }) {
  const colors = useColors();
  const opacity = useSharedValue(0.55);
  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.55, { duration: 700 })), -1);
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[style, styles.skeleton]}
      accessibilityLabel="Loading"
      accessibilityRole="progressbar">
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[styles.skeletonRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.separator }]}>
          <View style={[styles.skeletonBar, { width: '62%', backgroundColor: colors.skeleton }]} />
          {lines > 1 ? <View style={[styles.skeletonBar, { width: '38%', height: 10, backgroundColor: colors.skeleton }]} /> : null}
        </View>
      ))}
    </Animated.View>
  );
}

/* ───────────── Progress ───────────── */

export function ProgressBar({
  value,
  total,
  tone = 'ink',
  height = 4,
}: {
  value: number;
  total: number;
  tone?: keyof Palette;
  height?: number;
}) {
  const colors = useColors();
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: value }}
      style={[styles.track, { height, backgroundColor: colors.surfaceSunken }]}>
      <View style={{ width: `${pct * 100}%`, height, backgroundColor: colors[tone] }} />
    </View>
  );
}

/** Stacked horizontal bar for acknowledgement distribution. */
export function StackedBar({ segments, height = 8 }: { segments: { value: number; tone: keyof Palette; label: string }[]; height?: number }) {
  const colors = useColors();
  const total = segments.reduce((s, x) => s + x.value, 0);
  return (
    <View
      accessible
      accessibilityLabel={segments.map((s) => `${s.label} ${s.value}`).join(', ')}
      style={[styles.track, styles.stacked, { height, backgroundColor: colors.surfaceSunken }]}>
      {total > 0
        ? segments
            .filter((s) => s.value > 0)
            .map((s) => <View key={s.label} style={{ flex: s.value, backgroundColor: colors[s.tone] }} />)
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    paddingHorizontal: gutter,
    paddingVertical: space[3],
  },
  bannerFlush: { borderRadius: radius.md },
  bannerText: { flex: 1, gap: 2 },
  bannerAction: { minHeight: 32, justifyContent: 'center' },
  state: { alignItems: 'flex-start', paddingHorizontal: gutter, paddingVertical: space[8], gap: space[2] },
  stateMessage: { maxWidth: 320 },
  skeleton: { overflow: 'hidden' },
  skeletonRow: { paddingHorizontal: gutter, paddingVertical: space[4], gap: space[2] },
  skeletonBar: { height: 13, borderRadius: radius.xs },
  track: { width: '100%', overflow: 'hidden' },
  stacked: { flexDirection: 'row', gap: 2 },
});
