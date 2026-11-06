import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTabs, type TabDef } from '@/app-shell/tabs-model';
import { useColors } from '@/theme/theme';
import { space } from '@/theme/tokens';
import { Icon } from '@/ui/icon';
import { CountBadge } from '@/ui/tags';
import { Text } from '@/ui/text';

/**
 * Web preview only: a bottom bar matching the phone layout, since native
 * tabs fall back to an iPad-style bar in the browser.
 */
export default function WebTabsLayout() {
  const colors = useColors();
  const tabs = useTabs();
  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {tabs.map((t) =>
          t.visible ? (
            <TabTrigger key={t.name} name={t.name} href={t.href} asChild>
              <TabButton tab={t} />
            </TabTrigger>
          ) : (
            <TabTrigger key={t.name} name={t.name} href={t.href} style={{ display: 'none' }} />
          ),
        )}
      </TabList>
    </Tabs>
  );
}

function TabButton({ tab, isFocused, ref: _ref, ...props }: TabTriggerSlotProps & { tab: TabDef }) {
  const colors = useColors();
  const color = isFocused ? colors.accent : colors.textTertiary;
  return (
    <Pressable {...props} accessibilityRole="tab" accessibilityState={{ selected: isFocused }} style={styles.item}>
      <View style={[styles.indicator, { backgroundColor: isFocused ? colors.accentMuted : 'transparent' }]}>
        <Icon name={tab.icon} size={22} color={color} />
        {tab.badge > 0 ? (
          <View style={styles.badge}>
            <CountBadge count={tab.badge} />
          </View>
        ) : null}
      </View>
      <Text variant="caption" weight={isFocused ? '500' : '400'} style={{ color: isFocused ? colors.text : colors.textTertiary }} dense>
        {tab.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: space[1.5],
    paddingBottom: space[2],
  },
  item: { flex: 1, alignItems: 'center', gap: 2, minHeight: 52, justifyContent: 'center' },
  indicator: { width: 56, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 15 },
  badge: { position: 'absolute', top: -2, right: 6 },
});
