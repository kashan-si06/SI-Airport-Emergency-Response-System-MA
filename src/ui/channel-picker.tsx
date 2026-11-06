import { Pressable, StyleSheet, View } from 'react-native';

import type { Channel } from '@/api/schemas';
import { channelMeta, channelOrder } from '@/domain/presentation';
import { haptic } from '@/lib/haptics';
import { useColors } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

import { Text } from './text';

type Props = {
  /** Channels configured on the template level; only these may be toggled. */
  available: Channel[];
  value: Channel[];
  onChange: (v: Channel[]) => void;
};

/** Outlined toggles for delivery channels. At least one must stay on. */
export function ChannelPicker({ available, value, onChange }: Props) {
  const colors = useColors();
  return (
    <View style={styles.row} accessibilityLabel="Delivery channels">
      {channelOrder
        .filter((c) => available.includes(c))
        .map((c) => {
          const on = value.includes(c);
          const last = on && value.length === 1;
          return (
            <Pressable
              key={c}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on, disabled: last }}
              accessibilityLabel={channelMeta[c].label}
              accessibilityHint={last ? 'At least one channel is required' : undefined}
              onPress={() => {
                if (last) return haptic.warning();
                haptic.tap();
                onChange(on ? value.filter((x) => x !== c) : [...value, c]);
              }}
              style={[
                styles.tile,
                {
                  borderColor: on ? colors.accent : colors.borderStrong,
                },
              ]}>
              <Text variant="subhead" weight={on ? '500' : '400'} tone={on ? 'text' : 'textTertiary'} dense>
                {channelMeta[c].label}
              </Text>
            </Pressable>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  tile: {
    minWidth: 64,
    flexGrow: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
