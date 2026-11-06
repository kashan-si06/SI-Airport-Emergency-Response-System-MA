import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { severityBands } from '@/theme/tokens';

const STRIPE = 12;

/**
 * Hazard hatch: the console's closed-area marking, used only for drills so an
 * exercise can never be mistaken for a live event. Decorative, the word "Drill"
 * always appears with it.
 */
export function HazardStripe({ height = 8 }: { height?: number }) {
  const [width, setWidth] = useState(0);
  const count = Math.ceil((width + height * 2) / (STRIPE * 2)) + 1;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.track, { height }]}>
      {Array.from({ length: width ? count : 0 }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.stripe,
            {
              left: i * STRIPE * 2 - height,
              top: -height,
              height: height * 3,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: 'hidden', backgroundColor: severityBands.DRILL.bg },
  stripe: {
    position: 'absolute',
    width: STRIPE,
    backgroundColor: severityBands.DRILL.fg,
    transform: [{ skewX: '-45deg' }],
  },
});
