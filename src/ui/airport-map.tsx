import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import type { GeoPoint } from '@/api/schemas';
import { useColors } from '@/theme/theme';
import { gutter, space } from '@/theme/tokens';

import { Text } from './text';

/** What assets/images/heroes/airport-map.webp covers. Printed by tools/compose-visuals.py. */
const BOUNDS = { north: 28.18944, south: 28.152526, west: 77.568984, east: 77.647423 };
const RATIO = 1.8735;
const PIN = 16;

function place(pin: GeoPoint) {
  const x = (pin.lng - BOUNDS.west) / (BOUNDS.east - BOUNDS.west);
  const y = (BOUNDS.north - pin.lat) / (BOUNDS.north - BOUNDS.south);
  return x >= 0 && x <= 1 && y >= 0 && y <= 1 ? { x, y } : null;
}

/**
 * Noida International Airport's airfield, drawn from OpenStreetMap. It orients people;
 * it is not an operational chart. A pin only ever marks a real reported position.
 */
export function AirportMap({ pin }: { pin?: GeoPoint | null }) {
  const colors = useColors();
  const spot = pin ? place(pin) : null;
  const note = pin && !spot ? 'This position is outside the map' : 'Reference map';

  return (
    <View style={[styles.wrap, { borderColor: colors.separator }]}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Map of Noida International Airport.${spot ? ' The reported position is marked.' : ''}`}
        style={styles.map}>
        <Image source={require('@/assets/images/heroes/airport-map.webp')} contentFit="fill" style={StyleSheet.absoluteFill} />
        {spot ? (
          <View style={[styles.pin, { left: `${spot.x * 100}%`, top: `${spot.y * 100}%`, borderColor: colors.text }]}>
            <View style={[styles.pinCore, { backgroundColor: colors.text }]} />
          </View>
        ) : null}
      </View>
      <View style={styles.caption}>
        <Text variant="caption" tone="textTertiary" dense>
          {note}
        </Text>
        <Text variant="caption" tone="textTertiary" dense>
          © OpenStreetMap contributors
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  map: { width: '100%', aspectRatio: RATIO },
  pin: {
    position: 'absolute',
    width: PIN,
    height: PIN,
    marginLeft: -PIN / 2,
    marginTop: -PIN / 2,
    borderRadius: PIN / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinCore: { width: 6, height: 6, borderRadius: 3 },
  caption: { flexDirection: 'row', justifyContent: 'space-between', gap: space[3], paddingHorizontal: gutter, paddingVertical: space[2] },
});
