import { NativeTabs } from 'expo-router/native-tabs';

import { useTabs } from '@/app-shell/tabs-model';
import { useColors } from '@/theme/theme';
import { sansFace } from '@/theme/typography';

/** SF Symbol / Material Symbol pairs for the system tab bar. */
const tabIcons = {
  '(alerts)': { sf: { default: 'bell', selected: 'bell.fill' }, md: 'notifications' },
  tasks: { sf: { default: 'checklist', selected: 'checklist.checked' }, md: 'checklist' },
  command: { sf: { default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }, md: 'dashboard' },
  reports: { sf: { default: 'exclamationmark.bubble', selected: 'exclamationmark.bubble.fill' }, md: 'feedback' },
  account: { sf: { default: 'person.crop.circle', selected: 'person.crop.circle.fill' }, md: 'account_circle' },
} as const;

export default function TabsLayout() {
  const colors = useColors();
  const tabs = useTabs();

  return (
    <NativeTabs
      tintColor={colors.accent}
      iconColor={{ default: colors.textTertiary, selected: colors.accent }}
      labelStyle={{
        default: { color: colors.textTertiary, fontFamily: sansFace['400'] },
        selected: { color: colors.text, fontFamily: sansFace['500'] },
      }}
      backgroundColor={colors.surface}
      indicatorColor={colors.accentMuted}
      badgeBackgroundColor={colors.alarm}>
      {tabs.map((t) => (
        <NativeTabs.Trigger key={t.name} name={t.name} hidden={!t.visible}>
          <NativeTabs.Trigger.Label>{t.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={tabIcons[t.name].sf} md={tabIcons[t.name].md} />
          {t.badge > 0 ? <NativeTabs.Trigger.Badge>{t.badge > 99 ? '99+' : String(t.badge)}</NativeTabs.Trigger.Badge> : null}
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
