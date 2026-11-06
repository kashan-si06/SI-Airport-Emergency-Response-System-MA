import { useState } from 'react';
import { ActionSheetIOS, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/lib/haptics';
import { useColors } from '@/theme/theme';
import { gutter, space } from '@/theme/tokens';

import { Icon, type IconName } from './icon';
import { Text } from './text';

export type MenuAction = {
  label: string;
  icon: IconName;
  onPress: () => void;
  destructive?: boolean;
  description?: string;
};

/**
 * Contextual action list. iOS uses the system action sheet; Android and web
 * get a bottom sheet with the same ordering and destructive styling.
 */
export function useActionMenu(title: string) {
  const [open, setOpen] = useState<MenuAction[] | null>(null);

  const show = (actions: MenuAction[]) => {
    haptic.tap();
    if (Platform.OS === 'ios') {
      const destructiveIndexes = actions.map((a, i) => (a.destructive ? i : -1)).filter((i) => i >= 0);
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          options: [...actions.map((a) => a.label), 'Cancel'],
          cancelButtonIndex: actions.length,
          destructiveButtonIndex: destructiveIndexes,
        },
        (i) => {
          if (i < actions.length) actions[i].onPress();
        },
      );
    } else {
      setOpen(actions);
    }
  };

  const element = open ? <SheetMenu title={title} actions={open} onClose={() => setOpen(null)} /> : null;
  return { show, element };
}

function SheetMenu({ title, actions, onClose }: { title: string; actions: MenuAction[]; onClose: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(150)} style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu" />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.duration(220)}
        style={[styles.sheet, { backgroundColor: colors.surfaceRaised, borderColor: colors.border, paddingBottom: insets.bottom + space[2] }]}>
        <View style={[styles.grabber, { backgroundColor: colors.borderStrong }]} />
        <Text variant="overline" tone="textSecondary" style={styles.title}>
          {title}
        </Text>
        {actions.map((a) => (
          <Pressable
            key={a.label}
            accessibilityRole="button"
            onPress={() => {
              onClose();
              a.onPress();
            }}
            style={({ pressed }) => [styles.item, { backgroundColor: pressed ? colors.surfacePressed : 'transparent' }]}>
            <Icon name={a.icon} size={20} color={a.destructive ? colors.danger : colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text variant="body" tone={a.destructive ? 'danger' : 'text'}>
                {a.label}
              </Text>
              {a.description ? (
                <Text variant="footnote" tone="textTertiary">
                  {a.description}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: space[2],
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  grabber: { width: 32, height: 3, alignSelf: 'center', marginBottom: space[2] },
  title: { paddingHorizontal: gutter, paddingVertical: space[2] },
  item: { flexDirection: 'row', alignItems: 'center', gap: space[4], paddingHorizontal: gutter, minHeight: 56 },
});
