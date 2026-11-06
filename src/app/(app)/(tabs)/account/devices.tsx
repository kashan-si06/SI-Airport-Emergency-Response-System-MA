import { useMutation, useQueryClient } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';

import { deviceApi } from '@/api/endpoints';
import { qk, useDevices } from '@/api/queries';
import type { Device } from '@/api/schemas';
import { formatDateTime, formatRelative } from '@/domain/time';
import { confirm } from '@/lib/confirm';
import { gutter, space } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { describeError, EmptyState, ErrorState, SkeletonRows } from '@/ui/feedback';
import { Section } from '@/ui/list';
import { ScrollScreen } from '@/ui/screen';
import { Tag } from '@/ui/tags';
import { Text } from '@/ui/text';
import { toast } from '@/ui/toast';

/** Registered devices (MOB-ONB-02/08): all receive alerts; first ack wins. */
export default function Devices() {
  const q = useDevices();
  const qc = useQueryClient();
  const revoke = useMutation({
    mutationFn: (id: string) => deviceApi.revoke(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.devices });
      toast.success('Device signed out', 'It no longer receives ENS alerts.');
    },
    onError: (e) => toast.danger(describeError(e).title, describeError(e).message),
  });

  const onRevoke = async (d: Device) => {
    const ok = await confirm({
      title: `Sign out ${d.model ?? 'this device'}?`,
      message: 'It stops receiving app alerts immediately. SMS and voice continue.',
      confirmLabel: 'Sign out device',
      destructive: true,
    });
    if (ok) revoke.mutate(d.id);
  };

  if (q.isPending) return <SkeletonRows rows={2} />;
  if (!q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;

  return (
    <ScrollScreen refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      <Section title="Receiving your alerts" footer="Every device below rings for your alerts. Acknowledging on one stops the others.">
        {q.data.length === 0 ? <EmptyState icon="device" title="No devices registered" /> : q.data.map((d) => <DeviceRow key={d.id} d={d} onRevoke={() => void onRevoke(d)} />)}
      </Section>
    </ScrollScreen>
  );
}

function DeviceRow({ d, onRevoke }: { d: Device; onRevoke: () => void }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.title}>
          <Text variant="title2">{d.model ?? (d.platform === 'ios' ? 'iPhone' : 'Android phone')}</Text>
          {d.current ? <Tag label="This phone" fg="textSecondary" /> : null}
        </View>
        <Text variant="footnote" tone="textSecondary">
          {d.platform === 'ios' ? 'iOS' : 'Android'} {d.osVersion ?? ''} · ENS {d.appVersion ?? ''}
        </Text>
        <View style={styles.title}>
          {d.verifiedAt ? (
            <Tag label={`Verified ${formatDateTime(d.verifiedAt)}`} fg="textSecondary" />
          ) : (
            <Tag label="Not verified" fg="caution" />
          )}
          {d.degraded ? <Tag label="Alerts degraded" fg="danger" /> : null}
        </View>
        {d.lastSeen ? (
          <Text variant="caption" tone="textTertiary">
            Last seen {formatRelative(d.lastSeen)}
          </Text>
        ) : null}
      </View>
      {!d.current ? <Button label="Sign out" variant="ghost" onPress={onRevoke} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], paddingHorizontal: gutter, paddingVertical: space[4] },
  title: { flexDirection: 'row', alignItems: 'center', gap: space[2], flexWrap: 'wrap' },
});
