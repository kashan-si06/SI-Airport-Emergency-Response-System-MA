import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { newIdempotencyKey } from '@/api/client';
import { opsApi } from '@/api/endpoints';
import { qk, useIncident } from '@/api/queries';
import type { Channel } from '@/api/schemas';
import { haptic } from '@/lib/haptics';
import { gutter, space } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { ChannelPicker } from '@/ui/channel-picker';
import { ChoiceGroup } from '@/ui/choice';
import { Banner, describeError, ErrorState, SkeletonRows } from '@/ui/feedback';
import { TextField } from '@/ui/field';
import { PageHead } from '@/ui/page-head';
import { ScrollScreen } from '@/ui/screen';
import { Text } from '@/ui/text';
import { toast } from '@/ui/toast';

/** Free-text message to department SPOCs (FR-CMD-08, MOB-OPS-04). */
export default function BroadcastCompose() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const incident = useIncident(id);
  const key = useRef(newIdempotencyKey()).current;
  const [text, setText] = useState('');
  const [audience, setAudience] = useState<'INVOLVED' | 'ALL'>('INVOLVED');
  const [channels, setChannels] = useState<Channel[]>(['PUSH', 'SMS']);
  const [touched, setTouched] = useState(false);

  const send = useMutation({
    mutationFn: () => opsApi.broadcast(id, { text: text.trim(), channels, audience }, key),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.incident(id) });
      void qc.invalidateQueries({ queryKey: qk.broadcasts });
      haptic.success();
      toast.success('Broadcast sent', audience === 'ALL' ? 'All department SPOCs' : 'SPOCs of involved departments');
      router.back();
    },
    onError: () => haptic.error(),
  });

  const d = incident.data;
  if (!d) return incident.isPending ? <SkeletonRows rows={3} /> : <ErrorState error={incident.error} />;

  const tooShort = text.trim().length < 5;
  const err = send.error ? describeError(send.error) : null;

  return (
    <ScrollScreen
      footer={
        <Button
          label="Send broadcast"
          icon="megaphone"
          size="lg"
          fullWidth
          loading={send.isPending}
          onPress={() => {
            setTouched(true);
            if (tooShort) return haptic.warning();
            send.mutate();
          }}
        />
      }>
      <PageHead compact title={d.title} id={d.displayId} />
      {err ? <Banner tone="danger" icon="warning" title={err.title} message={err.message} /> : null}
      <View style={styles.block}>
        <TextField
          label="Message"
          required
          value={text}
          onChangeText={setText}
          maxLength={500}
          multiline
          autoFocus
          placeholder="e.g. All SPOCs report status to AOCC on channel 3 by 14:45."
          error={touched && tooShort ? 'Write at least 5 characters.' : null}
        />
        <Text variant="section">
          Audience
        </Text>
        <ChoiceGroup<'INVOLVED' | 'ALL'>
          accessibilityLabel="Audience"
          value={audience}
          onChange={setAudience}
          options={[
            { value: 'INVOLVED', label: 'Involved departments', description: `${d.departments.length} departments on this incident` },
            { value: 'ALL', label: 'All department SPOCs', description: 'Every department, including those not involved' },
          ]}
        />
        <Text variant="section">
          Channels
        </Text>
        <ChannelPicker available={['PUSH', 'SMS', 'WHATSAPP', 'EMAIL']} value={channels} onChange={setChannels} />
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  block: { paddingHorizontal: gutter, gap: space[3] },
});
