import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { useColors } from '@/theme/theme';
import { radius, space, type Palette } from '@/theme/tokens';

import { Icon, type IconName } from './icon';
import { Text } from './text';

type Toast = { id: number; tone: 'success' | 'info' | 'caution' | 'danger'; title: string; message?: string };

type ToastState = {
  current: Toast | null;
  show: (t: Omit<Toast, 'id'>) => void;
  hide: () => void;
};

let counter = 0;

export const useToast = create<ToastState>((set) => ({
  current: null,
  show: (t) => set({ current: { ...t, id: ++counter } }),
  hide: () => set({ current: null }),
}));

export const toast = {
  success: (title: string, message?: string) => useToast.getState().show({ tone: 'success', title, message }),
  info: (title: string, message?: string) => useToast.getState().show({ tone: 'info', title, message }),
  caution: (title: string, message?: string) => useToast.getState().show({ tone: 'caution', title, message }),
  danger: (title: string, message?: string) => useToast.getState().show({ tone: 'danger', title, message }),
};

const toneMap: Record<Toast['tone'], { fg: keyof Palette; icon: IconName }> = {
  success: { fg: 'success', icon: 'checkCircle' },
  info: { fg: 'info', icon: 'info' },
  caution: { fg: 'caution', icon: 'warning' },
  danger: { fg: 'danger', icon: 'critical' },
};

/** Single, top-anchored transient confirmation. Announced to screen readers. */
export function ToastHost() {
  const current = useToast((s) => s.current);
  const hide = useToast((s) => s.hide);
  const colors = useColors();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!current) return;
    const t = setTimeout(hide, current.tone === 'danger' ? 6000 : 3500);
    return () => clearTimeout(t);
  }, [current, hide]);

  if (!current) return null;
  const t = toneMap[current.tone];
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { paddingTop: insets.top + space[2] }]}>
      <Animated.View
        key={current.id}
        entering={FadeInUp.duration(180)}
        exiting={FadeOutUp.duration(160)}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[
          styles.toast,
          { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
        ]}>
        <Icon name={t.icon} size={18} color={colors[t.fg]} />
        <View style={{ flex: 1 }}>
          <Text variant="subhead" weight="500">
            {current.title}
          </Text>
          {current.message ? (
            <Text variant="footnote" tone="textSecondary">
              {current.message}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    marginHorizontal: space[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    maxWidth: 560,
    alignSelf: 'center',
    width: '92%',
  },
});
