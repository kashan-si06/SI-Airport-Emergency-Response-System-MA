import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { useActiveIncidents } from '@/api/queries';
import { SystemBanners } from '@/app-shell/system-banners';
import { byUrgency } from '@/domain/presentation';
import { IncidentRow } from '@/features/incidents/incident-row';
import { space } from '@/theme/tokens';
import { EmptyState, ErrorState, SkeletonRows } from '@/ui/feedback';
import { AirportMap } from '@/ui/airport-map';
import { HeroScreen } from '@/ui/hero-screen';
import { Section } from '@/ui/list';
import { StatStrip } from '@/ui/stats';

/** Live operations overview across concurrent incidents (FR-CMD-01, MOB-OPS-01). */
export default function CommandOverview() {
  const active = useActiveIncidents();
  const items = useMemo(() => byUrgency(active.data ?? []), [active.data]);

  const notified = items.reduce((s, i) => s + i.ack.notified, 0);
  const acked = items.reduce((s, i) => s + i.ack.acknowledged, 0);
  const tasksDone = items.reduce((s, i) => s + (i.tasks?.done ?? 0), 0);
  const tasksTotal = items.reduce((s, i) => s + (i.tasks?.total ?? 0), 0);
  const live = items.filter((i) => !i.isDrill).length;

  return (
    <HeroScreen headline="Command" message="Live operations across active incidents." refreshing={active.isRefetching} onRefresh={() => void active.refetch()}>
      <SystemBanners showDrill={false} />
      {active.isPending ? (
        <View style={{ marginTop: space[6] }}>
          <SkeletonRows rows={3} />
        </View>
      ) : active.error && !active.data ? (
        <ErrorState error={active.error} onRetry={() => void active.refetch()} />
      ) : (
        <>
          <AirportMap />
          <View>
            <StatStrip
              stats={[
                { label: 'Active', value: live, tone: live > 0 ? 'danger' : 'text', sub: items.length > live ? `+${items.length - live} drill` : undefined },
                { label: 'Acknowledged', value: notified ? `${Math.round((acked / notified) * 100)}%` : '—', sub: `${acked}/${notified}` },
                { label: 'Tasks', value: tasksTotal ? `${Math.round((tasksDone / tasksTotal) * 100)}%` : '—', sub: `${tasksDone}/${tasksTotal}` },
              ]}
            />
          </View>
          <Section>
            {items.length > 0 ? (
              items.map((i) => (
                <IncidentRow
                  key={i.id}
                  incident={i}
                  onPress={() => router.push({ pathname: '/incident/[id]/command', params: { id: i.id } })}
                />
              ))
            ) : (
              <EmptyState icon="command" title="No active incidents" />
            )}
          </Section>
        </>
      )}
    </HeroScreen>
  );
}
