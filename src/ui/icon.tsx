import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { memo } from 'react';
import type { ColorValue } from 'react-native';

import { useColors } from '@/theme/theme';

type Glyph = { ios: SymbolViewProps['name'] & string; md: string };

/**
 * Semantic icon registry. Screens reference intent ("acknowledge", "onScene"),
 * never raw glyph names, so iOS gets SF Symbols and Android gets Material
 * Symbols while meaning stays identical across platforms.
 */
const glyphs = {
  alerts: { ios: 'bell', md: 'notifications' },
  alertsActive: { ios: 'bell.badge.fill', md: 'notifications_active' },
  checklist: { ios: 'checklist', md: 'checklist' },
  command: { ios: 'square.grid.2x2', md: 'dashboard' },
  report: { ios: 'exclamationmark.bubble', md: 'feedback' },
  account: { ios: 'person.crop.circle', md: 'account_circle' },

  chevronRight: { ios: 'chevron.right', md: 'chevron_right' },
  chevronDown: { ios: 'chevron.down', md: 'expand_more' },
  chevronLeft: { ios: 'chevron.left', md: 'chevron_left' },
  close: { ios: 'xmark', md: 'close' },
  check: { ios: 'checkmark', md: 'check' },
  checkCircle: { ios: 'checkmark.circle.fill', md: 'check_circle' },
  circle: { ios: 'circle', md: 'radio_button_unchecked' },
  skip: { ios: 'forward.end', md: 'skip_next' },
  reopen: { ios: 'arrow.uturn.backward', md: 'undo' },
  plus: { ios: 'plus', md: 'add' },
  ellipsis: { ios: 'ellipsis', md: 'more_horiz' },
  search: { ios: 'magnifyingglass', md: 'search' },
  filter: { ios: 'line.3.horizontal.decrease', md: 'filter_list' },
  refresh: { ios: 'arrow.clockwise', md: 'refresh' },
  sync: { ios: 'arrow.triangle.2.circlepath', md: 'sync' },
  upload: { ios: 'icloud.and.arrow.up', md: 'cloud_upload' },
  send: { ios: 'paperplane.fill', md: 'send' },
  external: { ios: 'arrow.up.right', md: 'north_east' },

  critical: { ios: 'exclamationmark.octagon.fill', md: 'report' },
  high: { ios: 'exclamationmark.triangle.fill', md: 'warning' },
  medium: { ios: 'exclamationmark.circle.fill', md: 'error' },
  low: { ios: 'info.circle.fill', md: 'info' },
  info: { ios: 'info.circle', md: 'info' },
  warning: { ios: 'exclamationmark.triangle', md: 'warning' },

  acknowledge: { ios: 'checkmark.seal.fill', md: 'verified' },
  responding: { ios: 'figure.run', md: 'directions_run' },
  onScene: { ios: 'mappin.circle.fill', md: 'where_to_vote' },
  unable: { ios: 'xmark.octagon', md: 'block' },

  phone: { ios: 'phone.fill', md: 'call' },
  location: { ios: 'mappin.and.ellipse', md: 'location_on' },
  gps: { ios: 'location.fill', md: 'my_location' },
  camera: { ios: 'camera.fill', md: 'photo_camera' },
  photo: { ios: 'photo', md: 'image' },
  plane: { ios: 'airplane', md: 'flight' },
  building: { ios: 'building.2', md: 'apartment' },
  aeoc: { ios: 'building.columns', md: 'account_balance' },
  clock: { ios: 'clock', md: 'schedule' },
  timer: { ios: 'timer', md: 'timer' },
  person: { ios: 'person', md: 'person' },
  people: { ios: 'person.2', md: 'group' },
  megaphone: { ios: 'megaphone', md: 'campaign' },
  history: { ios: 'clock.arrow.circlepath', md: 'history' },
  doc: { ios: 'doc.text', md: 'description' },
  flag: { ios: 'flag', md: 'flag' },
  drill: { ios: 'flag.checkered', md: 'sports_score' },

  settings: { ios: 'gearshape', md: 'settings' },
  appearance: { ios: 'circle.lefthalf.filled', md: 'contrast' },
  device: { ios: 'iphone', md: 'smartphone' },
  lock: { ios: 'lock.fill', md: 'lock' },
  key: { ios: 'key.fill', md: 'key' },
  aircraft: { ios: 'airplane', md: 'flight' },
  shield: { ios: 'checkmark.shield', md: 'verified_user' },
  wifiOff: { ios: 'wifi.slash', md: 'wifi_off' },
  bellSlash: { ios: 'bell.slash', md: 'notifications_off' },
  speaker: { ios: 'speaker.wave.2', md: 'volume_up' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', md: 'logout' },
  trash: { ios: 'trash', md: 'delete' },
  eye: { ios: 'eye', md: 'visibility' },
  eyeSlash: { ios: 'eye.slash', md: 'visibility_off' },
  battery: { ios: 'battery.75percent', md: 'battery_5_bar' },
  bug: { ios: 'ladybug', md: 'bug_report' },
  language: { ios: 'globe', md: 'language' },

  email: { ios: 'envelope', md: 'mail' },
  sms: { ios: 'message', md: 'sms' },
  whatsapp: { ios: 'bubble.left.and.bubble.right', md: 'chat' },
  ivrs: { ios: 'phone.arrow.down.left', md: 'phone_callback' },
  push: { ios: 'app.badge', md: 'mobile_friendly' },
} as const satisfies Record<string, Glyph>;

export type IconName = keyof typeof glyphs;

type IconProps = {
  name: IconName;
  size?: number;
  color?: ColorValue;
  accessibilityLabel?: string;
};

export const Icon = memo(function Icon({ name, size = 20, color, accessibilityLabel }: IconProps) {
  const colors = useColors();
  const glyph: Glyph = glyphs[name];
  return (
    <SymbolView
      name={{ ios: glyph.ios, android: glyph.md, web: glyph.md } as SymbolViewProps['name']}
      size={size}
      tintColor={color ?? colors.text}
      accessibilityLabel={accessibilityLabel}
      accessible={!!accessibilityLabel}
      style={{ width: size, height: size }}
    />
  );
});
