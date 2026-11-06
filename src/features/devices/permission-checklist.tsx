import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';

import {
  openAppSettings,
  openBatterySettings,
  openDndSettings,
  requestNotificationPermission,
  usePermissionHealth,
  type PermissionHealth,
} from '@/notifications/permission-health';
import { ensureChannels, pushSupported } from '@/notifications/setup';
import { useColors } from '@/theme/theme';
import { gutter, space } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { SkeletonRows } from '@/ui/feedback';
import type { IconName } from '@/ui/icon';
import { Text } from '@/ui/text';

type ItemState = 'ok' | 'action' | 'optional' | 'unknown' | 'blocked';

type Item = {
  key: string;
  icon: IconName;
  title: string;
  why: string;
  state: ItemState;
  stateLabel: string;
  action?: { label: string; onPress: () => void };
};

function buildItems(h: PermissionHealth, recheck: () => void, batteryVisited: boolean, onBattery: () => void): Item[] {
  const items: Item[] = [
    {
      key: 'notifications',
      icon: 'alertsActive',
      title: 'Notifications',
      why: 'So emergency alerts reach you.',
      state: h.notifications === 'granted' ? 'ok' : h.notifications === 'denied' ? 'blocked' : 'action',
      stateLabel: h.notifications === 'granted' ? 'Allowed' : h.notifications === 'denied' ? 'Blocked' : 'Required',
      action:
        h.notifications === 'granted'
          ? undefined
          : h.notifications === 'denied'
            ? { label: 'Open Settings', onPress: () => void openAppSettings() }
            : { label: 'Allow', onPress: () => void requestNotificationPermission().then(recheck) },
    },
  ];
  if (Platform.OS === 'ios') {
    items.push({
      key: 'critical',
      icon: 'critical',
      title: 'Critical Alerts',
      why: 'Sound even when your phone is silenced.',
      state: h.criticalAlerts ? 'ok' : h.notifications === 'granted' ? 'blocked' : 'action',
      stateLabel: h.criticalAlerts ? 'Allowed' : 'Not allowed',
      action: h.criticalAlerts || h.notifications !== 'granted' ? undefined : { label: 'Open Settings', onPress: () => void openAppSettings() },
    });
  } else {
    items.push({
      key: 'dnd',
      icon: 'bellSlash',
      title: 'Override Do Not Disturb',
      why: 'Ring through Do Not Disturb.',
      state: h.dndBypass ? 'ok' : 'action',
      stateLabel: h.dndBypass ? 'Allowed' : 'Required',
      action: h.dndBypass ? undefined : { label: 'Open Settings', onPress: () => void openDndSettings() },
    });
    items.push({
      key: 'battery',
      icon: 'battery',
      title: 'Battery: Unrestricted',
      why: 'Stop the phone from delaying alerts.',
      state: batteryVisited ? 'unknown' : 'action',
      stateLabel: batteryVisited ? 'Checked' : 'Recommended',
      action: { label: 'Open Settings', onPress: onBattery },
    });
  }
  items.push(
    {
      key: 'camera',
      icon: 'camera',
      title: 'Camera',
      why: 'Attach photos to checklists and reports.',
      state: h.camera === 'granted' ? 'ok' : 'optional',
      stateLabel: h.camera === 'granted' ? 'Allowed' : 'Optional',
      action: h.camera === 'granted' ? undefined : { label: 'Allow', onPress: () => void ImagePicker.requestCameraPermissionsAsync().then(recheck) },
    },
    {
      key: 'location',
      icon: 'gps',
      title: 'Location while using',
      why: 'Pin reports to a place. Never in the background.',
      state: h.location === 'granted' ? 'ok' : 'optional',
      stateLabel: h.location === 'granted' ? 'Allowed' : 'Optional',
      action: h.location === 'granted' ? undefined : { label: 'Allow', onPress: () => void Location.requestForegroundPermissionsAsync().then(recheck) },
    },
  );
  return items;
}

/** Live permission health with one-tap fixes; re-checks whenever the app returns to the foreground. */
export function PermissionChecklist() {
  const { health, refresh } = usePermissionHealth();
  const [batteryVisited, setBatteryVisited] = useState(false);
  const recheck = useCallback(() => void refresh(), [refresh]);

  useEffect(() => {
    void ensureChannels().then(recheck);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && recheck());
    return () => sub.remove();
  }, [recheck]);

  if (!pushSupported) return null;
  if (!health) return <SkeletonRows rows={3} />;

  const items = buildItems(health, recheck, batteryVisited, () => {
    setBatteryVisited(true);
    void openBatterySettings();
  });

  return (
    <View>
      {items.map((it, i) => (
        <PermissionRow key={it.key} item={it} first={i === 0} />
      ))}
    </View>
  );
}

function PermissionRow({ item, first }: { item: Item; first: boolean }) {
  const colors = useColors();
  const tone = { ok: colors.textSecondary, action: colors.caution, blocked: colors.danger, optional: colors.textTertiary, unknown: colors.textSecondary }[item.state];
  return (
    <View
      style={[styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator }]}
      accessible={!item.action}
      accessibilityLabel={`${item.title}. ${item.stateLabel}. ${item.why}`}>
      <View style={styles.body}>
        <View style={styles.head}>
          <Text variant="title2" style={{ flex: 1 }}>
            {item.title}
          </Text>
          <Text variant="footnote" style={{ color: tone }}>
            {item.stateLabel}
          </Text>
        </View>
        <Text variant="footnote" tone="textSecondary">
          {item.why}
        </Text>
        {item.action ? (
          <View style={styles.action}>
            <Button label={item.action.label} variant="secondary" onPress={item.action.onPress} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space[3], paddingHorizontal: gutter, paddingVertical: space[4] },
  body: { flex: 1, gap: space[1] },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  action: { flexDirection: 'row', marginTop: space[2] },
});
