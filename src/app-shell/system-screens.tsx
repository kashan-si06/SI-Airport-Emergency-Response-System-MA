import { Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { appVersion } from '@/api/client';
import { envProblems } from '@/config/env';
import { useColors } from '@/theme/theme';
import { gutter, space } from '@/theme/tokens';
import { BrandLockup } from '@/ui/brand';
import { Button } from '@/ui/button';
import { AmbientGlow } from '@/ui/hero-glow';
import { Icon, type IconName } from '@/ui/icon';
import { Text } from '@/ui/text';

function SystemScreen({
  icon,
  tone,
  title,
  message,
  children,
}: {
  icon: IconName;
  tone: 'danger' | 'caution';
  title: string;
  message: string;
  children?: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.canvas }]}>
      <AmbientGlow />
      <ScrollView contentContainerStyle={styles.content}>
        <BrandLockup />
        <Icon name={icon} size={28} color={colors[tone]} />
        <Text variant="largeTitle">{title}</Text>
        <Text variant="body" tone="textSecondary">
          {message}
        </Text>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Shown when the build has no valid backend configuration. Never falls back to sample data. */
export function ConfigErrorScreen() {
  const problems = envProblems();
  return (
    <SystemScreen
      icon="warning"
      tone="caution"
      title="ENS is not configured"
      message="This build has no valid server configuration, so it cannot receive or send emergency notifications. Contact your ENS administrator for a correctly configured build.">
      <View style={styles.list}>
        {problems.map((p) => (
          <Text key={p} variant="mono" tone="textSecondary">
            · {p}
          </Text>
        ))}
      </View>
    </SystemScreen>
  );
}

export function FatalScreen({ error }: { error: Error }) {
  return (
    <SystemScreen
      icon="critical"
      tone="danger"
      title="ENS could not start"
      message="A security or storage check failed during start-up. Restart the app; if this persists, reinstall from your company app store and contact the IT service desk.">
      <Text variant="mono" tone="textTertiary">
        {error.message}
      </Text>
    </SystemScreen>
  );
}

/** Server returned 426 for this build (NFR-M7 forced upgrade). */
export function UpgradeRequiredScreen({ minVersion }: { minVersion: string | null }) {
  return (
    <SystemScreen
      icon="shield"
      tone="caution"
      title="Update required"
      message={`This version of ENS (${appVersion}) is no longer supported${minVersion ? `; version ${minVersion} or later is required` : ''}. Update from your company app store to keep receiving alerts. SMS and voice alerts continue to reach you meanwhile.`}>
      <Button
        label={Platform.OS === 'ios' ? 'Open App Store' : 'Open Play Store'}
        icon="external"
        size="lg"
        fullWidth
        onPress={() =>
          void Linking.openURL(Platform.OS === 'ios' ? 'itms-apps://apps.apple.com' : 'market://details?id=in.sourceintegreta.ens')
        }
      />
    </SystemScreen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: gutter, paddingVertical: space[6], gap: space[4], maxWidth: 560, width: '100%', alignSelf: 'center' },
  list: { gap: space[1] },
});
