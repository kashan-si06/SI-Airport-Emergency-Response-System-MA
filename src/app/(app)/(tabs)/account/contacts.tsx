import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Platform, StyleSheet, Switch, View } from 'react-native';

import { meApi } from '@/api/endpoints';
import { qk, useMe } from '@/api/queries';
import { useSession } from '@/auth/session';
import { formatDate } from '@/domain/time';
import { useColors } from '@/theme/theme';
import { gutter, space } from '@/theme/tokens';
import { describeError, ErrorState, SkeletonRows } from '@/ui/feedback';
import { Section } from '@/ui/list';
import { ScrollScreen } from '@/ui/screen';
import { Text } from '@/ui/text';
import { toast } from '@/ui/toast';

const typeLabel = { EMAIL: 'Email', MOBILE: 'Mobile (SMS & voice)', WHATSAPP: 'WhatsApp' } as const;

/** Contact points and WhatsApp consent (PRD §7.11; DPDP consent record). */
export default function Contacts() {
  const colors = useColors();
  const q = useMe();
  const qc = useQueryClient();
  const setMe = useSession((s) => s.setMe);

  const optIn = useMutation({
    mutationFn: (v: boolean) => meApi.setWhatsappOptIn(v),
    onSuccess: (me) => {
      qc.setQueryData(qk.me, me);
      setMe(me);
      toast.success(me.whatsappOptIn ? 'WhatsApp alerts on' : 'WhatsApp alerts off');
    },
    onError: (e) => toast.danger(describeError(e).title, describeError(e).message),
  });

  if (q.isPending) return <SkeletonRows rows={3} />;
  if (!q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const me = q.data;

  return (
    <ScrollScreen>
      <Section
        title="Where ENS reaches you"
        footer="Contact your ENS administrator to change these.">
        {me.contactPoints.map((c) => (
          <View key={`${c.type}-${c.value}`} style={styles.row} accessible accessibilityLabel={`${typeLabel[c.type]} ${c.value}, ${c.verified ? 'verified' : 'not verified'}`}>
            <View style={{ flex: 1 }}>
              <Text variant="footnote" tone="textSecondary">
                {typeLabel[c.type]}
              </Text>
              <Text variant="mono">{c.value}</Text>
            </View>
            <Text variant="footnote" tone={c.verified ? 'textSecondary' : 'caution'}>
              {c.verified ? 'Verified' : 'Unverified'}
            </Text>
          </View>
        ))}
      </Section>

      <Section
        title="WhatsApp"
        footer={
          me.whatsappOptIn && me.whatsappOptInAt
            ? `Consent recorded ${formatDate(me.whatsappOptInAt)}. You can withdraw at any time; SMS and voice continue.`
            : 'With your consent, ENS also sends alerts via WhatsApp using approved templates. Withdraw at any time.'
        }>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text variant="body">Receive alerts on WhatsApp</Text>
          </View>
          <Switch
            value={me.whatsappOptIn}
            disabled={optIn.isPending}
            onValueChange={(v) => optIn.mutate(v)}
            accessibilityLabel="Receive alerts on WhatsApp"
            trackColor={{ true: colors.accent, false: colors.borderStrong }}
            thumbColor={Platform.OS === 'android' ? colors.surfaceRaised : undefined}
          />
        </View>
      </Section>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: gutter, paddingVertical: space[3], minHeight: 56 },
});
