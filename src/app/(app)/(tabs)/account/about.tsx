import * as Application from 'expo-application';
import { Platform, StyleSheet, View } from 'react-native';

import { appVersion } from '@/api/client';
import { useSession } from '@/auth/session';
import { env } from '@/config/env';
import { installationId } from '@/notifications/registration';
import { gutter, space } from '@/theme/tokens';
import { BrandLockup } from '@/ui/brand';
import { KeyValue, Section } from '@/ui/list';
import { ScrollScreen } from '@/ui/screen';
import { Text } from '@/ui/text';

export default function About() {
  const airport = useSession((s) => s.me?.settings.airportName);
  const { apiBaseUrl, environment, certPins } = env();
  return (
    <ScrollScreen>
      <View style={styles.head}>
        <BrandLockup subtitle="Aviation Emergency Response System" />
        {airport ? (
          <Text variant="subhead" tone="textSecondary">
            {airport}
          </Text>
        ) : null}
      </View>
      <Section title="Build">
        <KeyValue label="Version" value={`${appVersion} (${Application.nativeBuildVersion ?? '—'})`} mono />
        <KeyValue label="Environment" value={environment.toUpperCase()} mono />
        <KeyValue label="Server" value={new URL(apiBaseUrl).host} mono />
        <KeyValue label="TLS pinning" value={Platform.OS === 'web' ? 'n/a (preview)' : certPins.length ? `${certPins.length} pins` : 'Off'} mono />
        <KeyValue label="Installation" value={installationId().slice(0, 8)} mono />
      </Section>
      <Section title="Image credits" footer="Photographs are cropped and colour graded, and show other airports.">
        <KeyValue label="Airfield at night" value="Mike McBey, CC BY 2.0" />
        <KeyValue label="Crash tender" value="Tony Hisgett, CC BY 2.0" />
        <KeyValue label="Landing lights" value="4300streetcar, CC BY 4.0" />
        <KeyValue label="Airport map" value="© OpenStreetMap contributors, ODbL" />
      </Section>
      <Text variant="footnote" tone="textTertiary" style={styles.foot}>
        © {new Date().getFullYear()} Source Integreta. ENS supplements — and never replaces — ATC radio, crash alarms and the airport PA system.
      </Text>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: gutter, paddingVertical: space[4], paddingTop: space[6], gap: space[3] },
  foot: { paddingHorizontal: gutter, paddingVertical: space[4] },
});
