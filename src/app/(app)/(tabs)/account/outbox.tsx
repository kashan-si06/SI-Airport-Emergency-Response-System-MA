import { StyleSheet, View } from 'react-native';

import { responderMeta } from '@/domain/presentation';
import { formatTimeSeconds } from '@/domain/time';
import { confirm } from '@/lib/confirm';
import { useOutbox, type OutboxItem } from '@/offline/outbox';
import { useIsOnline } from '@/offline/sync';
import { gutter, space } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { Banner, EmptyState } from '@/ui/feedback';
import { Section } from '@/ui/list';
import { ScrollScreen } from '@/ui/screen';
import { Text } from '@/ui/text';

function describe(i: OutboxItem): { title: string; detail: string } {
  switch (i.kind) {
    case 'ack':
      return { title: `${responderMeta[i.payload.status].label} · ${i.payload.displayId}`, detail: i.payload.reason ?? 'Responder status' };
    case 'task':
      return { title: `Checklist: ${i.payload.action.toLowerCase()}`, detail: i.payload.taskText + (i.payload.attachments.length ? ` · ${i.payload.attachments.length} photo(s)` : '') };
    case 'deptStatus':
      return { title: 'Department status', detail: i.payload.status.replace('_', ' ').toLowerCase() };
    case 'fieldReport':
      return { title: 'Field report', detail: i.payload.input.headline };
    case 'duty':
      return { title: i.payload.onDuty ? 'Going on duty' : 'Going off duty', detail: 'Availability' };
  }
}

/** Transparent view of everything not yet confirmed by ENS (MOB-OFF-02/03). */
export default function OutboxScreen() {
  const online = useIsOnline();
  const items = useOutbox((s) => s.items);
  const flushing = useOutbox((s) => s.flushing);
  const { flush, retry, discard } = useOutbox.getState();

  if (items.length === 0) {
    return (
      <ScrollScreen>
        <EmptyState icon="checkCircle" title="Everything is sent" message="Acknowledgements, checklist updates and reports you make offline wait here until AOCC receives them." />
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen
      footer={<Button label={flushing ? 'Sending…' : 'Send now'} icon="sync" fullWidth loading={flushing} disabled={!online} onPress={() => void flush()} />}>
      {!online ? <Banner tone="caution" icon="wifiOff" title="Offline" message="Queued actions send automatically when you reconnect." /> : null}
      <Section title="Waiting to send" footer="Sent in order with the time you acted, so AOCC sees the real sequence.">
        {items.map((i) => {
          const d = describe(i);
          return (
            <View key={i.id} style={styles.row}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="title2">
                  {d.title}
                </Text>
                <Text variant="footnote" tone="textSecondary" numberOfLines={2}>
                  {d.detail}
                </Text>
                <Text variant="footnote" tone="textSecondary">
                  {formatTimeSeconds(i.createdAt)} · {i.attempts} attempt{i.attempts === 1 ? '' : 's'}
                </Text>
                {i.lastError ? (
                  <Text variant="caption" tone={i.failed ? 'danger' : 'textTertiary'}>
                    {i.failed ? 'Rejected: ' : 'Last error: '}
                    {i.lastError}
                  </Text>
                ) : null}
                {i.failed ? (
                  <View style={styles.actions}>
                    <Button label="Retry" variant="secondary" onPress={() => retry(i.id)} />
                    <Button
                      label="Discard"
                      variant="ghost"
                      onPress={async () => {
                        if (await confirm({ title: 'Discard this action?', message: 'AOCC will never receive it.', confirmLabel: 'Discard', destructive: true })) discard(i.id);
                      }}
                    />
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </Section>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space[3], paddingHorizontal: gutter, paddingVertical: space[4], alignItems: 'flex-start' },
  actions: { flexDirection: 'row', gap: space[2], marginTop: space[2] },
});
