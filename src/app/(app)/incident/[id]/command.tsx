import { useMutation } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { newIdempotencyKey } from '@/api/client';
import { opsApi } from '@/api/endpoints';
import { useCommand } from '@/api/queries';
import { useCan } from '@/auth/session';
import { DepartmentProgressList } from '@/features/incidents/department-progress';
import { TeamList } from '@/features/incidents/team-list';
import { isLive } from '@/domain/presentation';
import { formatElapsed } from '@/domain/time';
import { haptic } from '@/lib/haptics';
import { useNow } from '@/lib/use-now';
import { gutter, space } from '@/theme/tokens';
import { Button, IconButton } from '@/ui/button';
import { Banner, ErrorState, ProgressBar, SkeletonRows, StackedBar, describeError } from '@/ui/feedback';
import { Row, Section } from '@/ui/list';
import { PageHead } from '@/ui/page-head';
import { ScrollScreen } from '@/ui/screen';
import { Legend, StatStrip } from '@/ui/stats';
import { DrillTag, SeverityTag, StatusTag } from '@/ui/tags';
import { Text } from '@/ui/text';
import { toast } from '@/ui/toast';

export default function CommandDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const nowMs = useNow();
  const cmd = useCommand(id);
  const canUpdate = useCan('incident.update');
  const canBroadcast = useCan('incident.broadcast');
  const [lastRenotify, setLastRenotify] = useState<number | null>(null);

  const renotify = useMutation({
    mutationFn: (recipientIds: string[]) => opsApi.renotify(id, { recipientIds, channels: ['PUSH', 'SMS', 'IVRS'] }, newIdempotencyKey()),
    onSuccess: (_d, ids) => {
      haptic.success();
      setLastRenotify(Date.now());
      toast.success('Re-notified', `${ids.length} non-responder${ids.length > 1 ? 's' : ''} via app, SMS and voice`);
      void cmd.refetch();
    },
    onError: (e) => toast.danger(describeError(e).title, describeError(e).message),
  });

  const c = cmd.data;
  if (!c) {
    return cmd.isPending ? <SkeletonRows rows={5} /> : <ErrorState error={cmd.error} onRetry={() => void cmd.refetch()} />;
  }
  const i = c.incident;
  const live = isLive(i.status);
  const renotifyCoolingDown = !!lastRenotify && nowMs - lastRenotify < 60_000;
  const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '—');
  const ackOnly = Math.max(0, c.ack.acknowledged - c.ack.onScene - c.ack.responding - c.ack.unable);

  return (
    <>
      <Stack.Screen
        options={{
          title: i.displayId,
          headerRight: () => (
            <IconButton icon="doc" label="Incident detail" onPress={() => router.push({ pathname: '/incident/[id]', params: { id } })} />
          ),
        }}
      />
      <ScrollScreen refreshing={cmd.isRefetching} onRefresh={() => void cmd.refetch()}>
        {cmd.isError ? <Banner tone="caution" icon="wifiOff" title="Live data paused" message="Showing the last update received. Reconnecting…" /> : null}

        <PageHead
          title={i.title}
          subtitle={`Incident commander: ${c.incidentCommander?.name ?? 'Not assigned'}`}
          meta={formatElapsed(i.createdAt, nowMs)}
          status={
            <>
              {i.isDrill ? <DrillTag /> : <SeverityTag severity={i.severity} solid={live} />}
              {!live ? <StatusTag status={i.status} /> : null}
            </>
          }
        />

        <View>
          <StatStrip
            stats={[
              { label: 'Acknowledged', value: pct(c.ack.acknowledged, c.ack.notified), sub: `${c.ack.acknowledged}/${c.ack.notified}` },
              { label: 'Waiting on', value: c.ack.noResponse + c.ack.pending, tone: c.ack.noResponse > 0 ? 'danger' : 'text', sub: c.ack.failed > 0 ? `${c.ack.failed} failed` : `of ${c.ack.notified} notified` },
              { label: 'Tasks', value: pct(c.progress.done, c.progress.total), sub: `${c.progress.done}/${c.progress.total}` },
            ]}
          />
        </View>

        <Section title="Responder status">
          <View style={styles.pad}>
            <StackedBar
              height={10}
              segments={[
                { label: 'On scene', value: c.ack.onScene, tone: 'success' },
                { label: 'Responding', value: c.ack.responding, tone: 'info' },
                { label: 'Acknowledged', value: ackOnly, tone: 'textSecondary' },
                { label: 'Unable', value: c.ack.unable, tone: 'caution' },
                { label: 'Awaiting', value: c.ack.pending, tone: 'borderStrong' },
                { label: 'No response', value: c.ack.noResponse, tone: 'danger' },
              ]}
            />
            <Legend
              items={[
                { label: 'On scene', value: c.ack.onScene, tone: 'success' },
                { label: 'Responding', value: c.ack.responding, tone: 'info' },
                { label: 'Acknowledged', value: ackOnly, tone: 'textSecondary' },
                { label: 'Unable', value: c.ack.unable, tone: 'caution' },
                { label: 'Awaiting', value: c.ack.pending, tone: 'borderStrong' },
                { label: 'No response', value: c.ack.noResponse, tone: 'danger' },
              ]}
            />
          </View>
        </Section>

        <Section title="Acknowledged by department">
          {c.ackByDepartment.map((d) => (
            <View key={d.department.id} style={styles.deptAck}>
              <Text variant="mono" weight="500" style={styles.code} dense>
                {d.department.code}
              </Text>
              <View style={{ flex: 1 }}>
                <ProgressBar value={d.acknowledged} total={d.notified} height={2} />
              </View>
              <Text variant="footnote" tone="textSecondary" style={styles.count} dense>
                {d.acknowledged}/{d.notified}
              </Text>
            </View>
          ))}
        </Section>

        <Section title="Department checklists" accessory={<Text variant="footnote" tone="textSecondary" style={styles.tabular}>{c.progress.done}/{c.progress.total}</Text>}>
          <DepartmentProgressList items={c.departments} plain />
        </Section>

        <Section
          title="Not responding"
          accessory={<Text variant="footnote" weight="500" tone={c.nonResponders.length ? 'danger' : 'textSecondary'} style={styles.tabular}>{c.nonResponders.length}</Text>}
          footer={c.nonResponders.length ? 'Automatic IVRS re-calls and escalation continue per the template policy.' : undefined}>
          {c.nonResponders.length > 0 ? (
            <TeamList recipients={c.nonResponders} plain />
          ) : (
            <Row title="Everyone notified has responded" />
          )}
        </Section>

        {live && (canUpdate || canBroadcast) ? (
          <View style={styles.actions}>
            {canUpdate && c.nonResponders.length > 0 ? (
              <Button
                label={`Re-notify ${c.nonResponders.length} non-responder${c.nonResponders.length > 1 ? 's' : ''}`}
                icon="refresh"
                variant="secondary"
                fullWidth
                loading={renotify.isPending}
                disabled={renotifyCoolingDown}
                caption={renotifyCoolingDown ? 'Sent — available again in 1 min' : 'App, SMS and voice'}
                onPress={() => renotify.mutate(c.nonResponders.map((r) => r.id))}
              />
            ) : null}
            {canUpdate ? (
              <Button label="Send update" icon="send" fullWidth onPress={() => router.push({ pathname: '/incident/[id]/update', params: { id, type: 'UPDATE' } })} />
            ) : null}
            {canBroadcast ? (
              <Button label="Broadcast to SPOCs" icon="megaphone" variant="secondary" fullWidth onPress={() => router.push({ pathname: '/incident/[id]/broadcast', params: { id } })} />
            ) : null}
          </View>
        ) : null}
      </ScrollScreen>
    </>
  );
}

const styles = StyleSheet.create({
  tabular: { fontVariant: ['tabular-nums'] },
  pad: { paddingHorizontal: gutter, paddingVertical: space[4], gap: space[3] },
  deptAck: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: gutter, paddingVertical: space[3] },
  code: { width: 48 },
  count: { width: 40, textAlign: 'right', fontVariant: ['tabular-nums'] },
  actions: { paddingHorizontal: gutter, paddingVertical: space[4], gap: space[2], marginTop: space[2] },
});
