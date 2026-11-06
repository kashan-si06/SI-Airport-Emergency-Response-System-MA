import { router } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { useMyReports, usePendingReports } from '@/api/queries';
import { SystemBanners } from '@/app-shell/system-banners';
import { useCan, useSession } from '@/auth/session';
import { ReportRow } from '@/features/reports/report-row';
import { formatTime } from '@/domain/time';
import { useOutbox, type OutboxItem } from '@/offline/outbox';
import { useColors } from '@/theme/theme';
import { gutter, space } from '@/theme/tokens';
import { Button, IconButton } from '@/ui/button';
import { EmptyState, ErrorState, SkeletonRows } from '@/ui/feedback';
import { heroes, HeroScreen } from '@/ui/hero-screen';
import { Section } from '@/ui/list';
import { Text } from '@/ui/text';

type QueuedReport = Extract<OutboxItem, { kind: 'fieldReport' }>;

export default function ReportsTab() {
  const canCreate = useCan('fieldreport.create');
  const canValidate = useCan('fieldreport.validate');
  const mine = useMyReports();
  const pending = usePendingReports(canValidate);
  const queued = useOutbox(useShallow((s) => s.items.filter((i): i is QueuedReport => i.kind === 'fieldReport')));

  return (
    <HeroScreen
      hero={heroes.radio}
      headline="Reports"
      message="Report an emergency and track it with AOCC."
      action={canCreate ? <IconButton icon="plus" label="Raise emergency" tone="accent" onPress={() => router.push('/raise')} /> : null}
      refreshing={mine.isRefetching || pending.isRefetching}
      onRefresh={() => {
        void mine.refetch();
        if (canValidate) void pending.refetch();
      }}>
      <SystemBanners showDrill={false} />

      {queued.length > 0 ? <QueuedReports items={queued} /> : null}

      {canValidate ? (
        <Section title="To review">
          {pending.isPending ? (
            <SkeletonRows rows={2} />
          ) : pending.data && pending.data.length > 0 ? (
            pending.data.map((r) => <ReportRow key={r.id} report={r} showSla />)
          ) : pending.data ? (
            <View style={styles.inline}>
              <Text variant="subhead" tone="textSecondary">
                No field reports waiting.
              </Text>
            </View>
          ) : (
            <ErrorState error={pending.error} onRetry={() => void pending.refetch()} />
          )}
        </Section>
      ) : null}

      {canCreate ? (
        <>
          <Section title="My reports">
            {mine.isPending ? (
              <SkeletonRows rows={2} />
            ) : mine.data && mine.data.length > 0 ? (
              mine.data.map((r) => <ReportRow key={r.id} report={r} />)
            ) : mine.data ? (
              <EmptyState icon="report" title="No reports yet" message="Tap + to report an emergency." />
            ) : (
              <ErrorState error={mine.error} onRetry={() => void mine.refetch()} />
            )}
          </Section>
        </>
      ) : null}
    </HeroScreen>
  );
}

/** Reports captured offline: loudly NOT SENT with a direct line to AOCC (MOB-RSE-05). */
function QueuedReports({ items }: { items: QueuedReport[] }) {
  const colors = useColors();
  const aocc = useSession((s) => s.me?.settings.aoccPhone);
  return (
    <View style={[styles.queued, { backgroundColor: colors.dangerMuted }]}>
      <Text variant="title2" tone="danger">
        Not sent: {items.length} report{items.length > 1 ? 's' : ''} waiting for connection
      </Text>
      {items.map((i) => (
        <Text key={i.id} variant="footnote" tone="textSecondary">
          {formatTime(i.createdAt)} · {i.payload.input.headline}
          {i.failed ? ` — rejected: ${i.lastError}` : ''}
        </Text>
      ))}
      <Text variant="footnote" tone="text">
        AOCC has not received {items.length > 1 ? 'these' : 'this'}. If urgent, call now.
      </Text>
      {aocc ? <Button label={`Call AOCC  ${aocc}`} icon="phone" variant="danger" fullWidth onPress={() => void Linking.openURL(`tel:${aocc}`)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inline: { paddingHorizontal: gutter, paddingVertical: space[4] },
  queued: { marginTop: space[4], paddingHorizontal: gutter, paddingVertical: space[4], gap: space[2] },
});
