import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

const LOOP_MS = 6000;
const SEGMENTS = 40;
const THICKNESS = 1.5;
/** Length of the light's tail, as a share of the curve's width. */
const TAIL = 0.55;
/** The light starts wholly off the right edge and ends wholly off the left, so the loop has no visible seam. */
const HEAD_START = 1.02;
const HEAD_END = -TAIL - 0.02;
/** Where the light rests when motion is reduced: rising up the right of the curve. */
const RESTING_PROGRESS = 0.25;

const HEAD_COLOR = [255, 226, 204];
const TAIL_COLOR = [190, 78, 42];

/** The curve baked into hero-glow.png, in 0–1 of the image. Keep in step with tools/generate-glows.mjs. */
function curve(u: number) {
  'worklet';
  const turn = 0.62;
  return u > turn ? 0.86 - 0.11 * ((u - turn) / (1 - turn)) ** 2 : 0.86 - 0.02 * ((turn - u) / turn) ** 2;
}

function smoothstep(from: number, to: number, value: number) {
  'worklet';
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

/** A light that runs along the hero's curve, in from the right edge and out at the left, on a seamless loop. */
export function RimLight({ width, height, running }: { width: number; height: number; running: boolean }) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? RESTING_PROGRESS : 0);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = RESTING_PROGRESS;
      return;
    }
    if (!running) return;
    progress.value = 0;
    progress.value = withRepeat(withTiming(1, { duration: LOOP_MS, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(progress);
  }, [running, reduceMotion, progress]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: SEGMENTS }, (_, index) => (
        <Segment key={index} index={index} progress={progress} width={width} height={height} />
      ))}
    </View>
  );
}

function Segment({
  index,
  progress,
  width,
  height,
}: {
  index: number;
  progress: SharedValue<number>;
  width: number;
  height: number;
}) {
  // 0 at the head of the light, 1 at the end of its tail.
  const along = index / (SEGMENTS - 1);
  const step = (TAIL * width) / SEGMENTS;
  const color = HEAD_COLOR.map((c, i) => Math.round(c + (TAIL_COLOR[i] - c) * Math.min(1, along * 1.6)));

  const style = useAnimatedStyle(() => {
    const head = HEAD_START + (HEAD_END - HEAD_START) * progress.value;
    const u = head + along * TAIL;
    const slope = ((curve(u + 0.001) - curve(u)) / 0.001) * (height / width);
    const taper = smoothstep(0, 0.05, along) * (1 - along) ** 1.5;

    return {
      opacity: taper,
      transform: [
        { translateX: u * width - step / 2 },
        { translateY: curve(u) * height - THICKNESS / 2 },
        { rotate: `${Math.atan(slope)}rad` },
        // Stretched to span the slope, with a touch of overlap so no gaps open between segments.
        { scaleX: Math.hypot(1, slope) * 1.08 },
      ],
    };
  });

  return <Animated.View style={[styles.segment, { width: step, backgroundColor: `rgb(${color.join(',')})` }, style]} />;
}

const styles = StyleSheet.create({
  segment: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: THICKNESS,
    // Forces antialiasing on Android, where a plain rotated rectangle shows jagged edges.
    borderRadius: THICKNESS / 2,
  },
});
