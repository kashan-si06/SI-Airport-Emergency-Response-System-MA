import { StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { gutter, space } from '@/theme/tokens';
import { ScrollScreen } from '@/ui/screen';
import { Text } from '@/ui/text';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'Purpose',
    body: 'ENS processes your personal data only to notify you of airport emergencies, record your acknowledgement and response, and coordinate department checklists.',
  },
  {
    title: 'What this app processes',
    body: 'Your directory profile (name, employee ID, department, designation), contact points, this device’s identifier and push token, your acknowledgements and responder status, checklist actions, field reports and photos you submit, and — only when you choose — a one-time location with "On scene" or a field report. Location is never tracked in the background.',
  },
  {
    title: 'Where it is stored',
    body: 'All ENS data is hosted in India. On this phone, cached incident data is encrypted with a key held in the device keystore and is erased when you sign out or your device is revoked.',
  },
  {
    title: 'Retention',
    body: 'Incident and audit records are retained for the period required by the airport’s regulatory obligations (currently five years). Diagnostic logs leave the phone only if you attach them to a problem report.',
  },
  {
    title: 'Your choices and rights',
    body: 'You may withdraw WhatsApp consent at any time in Contact details. You may request access to or correction of your data through the ENS administrator. Emergency notifications by SMS and voice are part of your duty role and continue regardless of app settings.',
  },
  {
    title: 'Third parties',
    body: 'Push notifications are routed through Apple (APNs) or Google (FCM) carrying only an incident identifier and short display text. The app contains no advertising or analytics SDKs; crash reports are scrubbed of personal data.',
  },
];

/** Notice aligned to the Digital Personal Data Protection Act, 2023 (PRD §13). */
export default function Privacy() {
  const airport = useSession((s) => s.me?.settings.airportName);
  return (
    <ScrollScreen>
      <View style={styles.pad}>
        <Text variant="footnote" tone="textSecondary">
          Data fiduciary: {airport ?? 'the airport operator'}. Processor: Source Integreta.
        </Text>
        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text variant="section" accessibilityRole="header">
              {s.title}
            </Text>
            <Text variant="callout" tone="textSecondary">
              {s.body}
            </Text>
          </View>
        ))}
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: gutter, paddingVertical: space[4], gap: space[5] },
  section: { gap: space[1.5] },
});
