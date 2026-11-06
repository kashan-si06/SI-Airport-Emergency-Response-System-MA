import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PermissionChecklist } from '@/features/devices/permission-checklist';
import { isDegraded, usePermissionHealth } from '@/notifications/permission-health';
import { pushSupported, pushUnavailableCopy } from '@/notifications/setup';
import { useColors } from '@/theme/theme';
import { gutter, space } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { Banner } from '@/ui/feedback';
import { heroes, OpeningHero, OpeningSpacer, PageHeading } from '@/ui/hero-screen';
import { Text } from '@/ui/text';

/** M-02: explains each permission and why it matters before asking (MOB-ONB-03). */
export default function PermissionsOnboarding() {
  const colors = useColors();
  const health = usePermissionHealth((s) => s.health);
  const degraded = isDegraded(health);
  const notificationsOk = !pushSupported || health?.notifications === 'granted';

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <OpeningHero hero={heroes.approach} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <OpeningSpacer />
          <Text variant="overline" tone="textSecondary">
            Step 1 of 2
          </Text>
          <PageHeading headline="Allow alerts" message="So an emergency always reaches you." />

          {!pushSupported ? (
            <Banner flush
              tone="info"
              icon="info"
              title={pushUnavailableCopy.title}
              message={pushUnavailableCopy.message}
            />
          ) : null}

          <PermissionChecklist />

          {degraded ? (
            <Banner flush
              tone="caution"
              icon="warning"
              title="Alerts may not wake you"
              message="You’ll still get SMS and calls."
            />
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { borderColor: colors.border, backgroundColor: colors.canvas }]}>
          <Button
            label="Continue"
            trailingIcon="chevronRight"
            size="lg"
            fullWidth
            variant={notificationsOk ? 'primary' : 'secondary'}
            onPress={() => router.push('/onboarding/test-alert')}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[5], gap: space[4], maxWidth: 640, width: '100%', alignSelf: 'center' },
  footer: { paddingHorizontal: gutter, paddingTop: space[3], paddingBottom: space[3], borderTopWidth: StyleSheet.hairlineWidth },
});
