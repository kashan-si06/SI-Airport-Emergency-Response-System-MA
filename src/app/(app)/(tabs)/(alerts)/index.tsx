import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useHome } from '@/api/queries';
import { SystemBanners } from '@/app-shell/system-banners';
import { useCan } from '@/auth/session';
import { byUrgency } from '@/domain/presentation';
import { DutyRow } from '@/features/account/duty-strip';
import { IncidentRow, PendingAlertCard } from '@/features/incidents/incident-row';
import { gutter, space } from '@/theme/tokens';
import { Button, IconButton } from '@/ui/button';
import { ErrorState, SkeletonRows } from '@/ui/feedback';
import { heroes, HeroScreen } from '@/ui/hero-screen';
import { Row, Section } from '@/ui/list';

/** Home answers one question first: does anything need me right now? */
export default function AlertsHome() {
  const home = useHome();
  const canReport = useCan('fieldreport.create');
  const canValidate = useCan('fieldreport.validate');
  const data = home.data;
  const reports = canValidate ? (data?.pendingFieldReports ?? 0) : 0;
  const quiet = !!data && data.pendingAck.length === 0 && data.active.length === 0;
  const needsResponse = (data?.pendingAck.length ?? 0) > 0;

  const pending = useMemo(() => byUrgency(data?.pendingAck ?? []), [data?.pendingAck]);
  const active = useMemo(() => byUrgency(data?.active ?? []), [data?.active]);

  const raise = () => router.push('/raise');

  const heading = needsResponse
    ? { headline: pending.length === 1 ? 'Needs your response' : `${pending.length} need your response`, message: null }
    : quiet
      ? { headline: 'All clear', message: 'No active incidents' }
      : data
        ? {
            headline: active.length === 1 ? '1 active incident' : `${active.length} active incidents`,
            message: 'Nothing needs your response right now.',
          }
        : { headline: null, message: null };

  return (
    <HeroScreen
      headline={heading.headline}
      message={heading.message}
      hero={heroes.airfieldNight}
      // While someone owes a response the red card has to come first.
      calm={!needsResponse}
      // While someone owes a response, raising a new emergency steps back to a small button.
      action={canReport && needsResponse ? <IconButton icon="plus" label="Raise an emergency" onPress={raise} /> : null}
      refreshing={home.isRefetching}
      onRefresh={() => void home.refetch()}>
      <SystemBanners />

      {home.isPending ? (
        <View style={{ marginTop: space[4] }}>
          <SkeletonRows rows={3} />
        </View>
      ) : !data ? (
        <ErrorState error={home.error} onRetry={() => void home.refetch()} />
      ) : (
        <>
          {pending.map((i, index) => (
            <PendingAlertCard key={i.id} incident={i} lead={index === 0} />
          ))}

          {canReport && !needsResponse ? (
            <View style={styles.raise}>
              <Button label="Raise emergency" icon="plus" variant="danger" size="lg" fullWidth hapticStyle="heavy" onPress={raise} />
            </View>
          ) : null}

          {reports > 0 ? (
            <Section>
              <Row
                icon="report"
                iconTone="caution"
                title={`${reports} field report${reports === 1 ? '' : 's'} to review`}
                onPress={() => router.push('/reports')}
              />
            </Section>
          ) : null}

          {active.length > 0 ? (
            <Section title="Active">
              {active.map((i) => (
                <IncidentRow key={i.id} incident={i} />
              ))}
            </Section>
          ) : null}

          {data.recent.length > 0 ? (
            <Section title="Earlier today">
              {data.recent.map((i) => (
                <IncidentRow key={i.id} incident={i} />
              ))}
            </Section>
          ) : null}

          <Section>
            <DutyRow onDuty={data.onDuty} />
            <Row title="History" onPress={() => router.push('/history')} />
            <Row title="Broadcasts" onPress={() => router.push('/broadcasts')} />
          </Section>
        </>
      )}
    </HeroScreen>
  );
}

const styles = StyleSheet.create({
  raise: { paddingHorizontal: gutter, paddingTop: space[4] },
});
