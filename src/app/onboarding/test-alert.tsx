import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/auth/session';
import { TestAlertPanel } from '@/features/devices/test-alert-panel';
import { pushSupported } from '@/notifications/setup';
import { useColors } from '@/theme/theme';
import { gutter, space } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { heroes, OpeningHero, OpeningSpacer, PageHeading } from '@/ui/hero-screen';
import { Text } from '@/ui/text';

export default function TestAlertOnboarding() {
  const colors = useColors();
  const markOnboarded = useSession((s) => s.markOnboarded);
  const [verified, setVerified] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <OpeningHero hero={heroes.marshaller} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Button label="Back" variant="ghost" icon="chevronLeft" onPress={() => router.back()} style={styles.back} />
          <OpeningSpacer />
          <Text variant="overline" tone="textSecondary">
            Step 2 of 2
          </Text>
          <PageHeading headline="Test alert" message="Check that alerts reach this phone." />
          <TestAlertPanel onVerified={() => setVerified(true)} />
        </ScrollView>
        <View style={[styles.footer, { borderColor: colors.border }]}>
          <Button
            label={verified || !pushSupported ? 'Done' : 'Skip for now'}
            variant={verified || !pushSupported ? 'primary' : 'secondary'}
            size="lg"
            fullWidth
            onPress={markOnboarded}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[5], gap: space[4], maxWidth: 640, width: '100%', alignSelf: 'center' },
  back: { alignSelf: 'flex-start', marginLeft: -space[4] },
  footer: { paddingHorizontal: gutter, paddingVertical: space[3], borderTopWidth: StyleSheet.hairlineWidth },
});
