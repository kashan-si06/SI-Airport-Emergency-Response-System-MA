import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';

import { useColors } from '@/theme/theme';
import { gutter, space } from '@/theme/tokens';

import { AmbientGlow } from './hero-glow';

type Props = Omit<ScrollViewProps, 'refreshControl'> & {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Pinned bottom action area (forms, primary CTA), keyboard-aware. */
  footer?: ReactNode;
  /** Painted behind the scrolling content, and stays put as it scrolls. Every screen has the ambient glow unless it brings its own. */
  backdrop?: ReactNode;
};

/**
 * Scrollable screen body. Uses automatic content insets so content clears
 * translucent iOS headers and the tab bar; caps reading width on tablets.
 */
export function ScrollScreen({ children, refreshing, onRefresh, footer, backdrop = <AmbientGlow />, contentContainerStyle, ...rest }: Props) {
  const colors = useColors();
  return (
    <View style={[styles.root, { backgroundColor: colors.canvas }]}>
      {backdrop}
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.textSecondary} colors={[colors.accent]} />
          ) : undefined
        }
        contentContainerStyle={[styles.content, contentContainerStyle]}
        {...rest}>
        <View style={styles.inner}>{children}</View>
      </ScrollView>
      {footer ? (
        <View style={[styles.footer, { backgroundColor: colors.canvas, borderTopColor: colors.border }]}>{footer}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingBottom: space[12] },
  inner: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: gutter,
    paddingTop: space[3],
    paddingBottom: space[4],
    gap: space[2],
  },
});
