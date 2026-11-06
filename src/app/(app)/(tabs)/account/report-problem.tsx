import { useMutation } from '@tanstack/react-query';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, Switch, View } from 'react-native';

import { appVersion } from '@/api/client';
import { meApi } from '@/api/endpoints';
import { log } from '@/lib/log';
import { useColors } from '@/theme/theme';
import { gutter, space } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { Banner, describeError } from '@/ui/feedback';
import { TextField } from '@/ui/field';
import { ScrollScreen } from '@/ui/screen';
import { Text } from '@/ui/text';
import { toast } from '@/ui/toast';

export default function ReportProblem() {
  const colors = useColors();
  const [message, setMessage] = useState('');
  const [includeLogs, setIncludeLogs] = useState(false);
  const [touched, setTouched] = useState(false);

  const send = useMutation({
    mutationFn: () =>
      meApi.feedback({
        message: message.trim(),
        logs: includeLogs ? log.snapshot() : null,
        device: { platform: Platform.OS, os: Device.osVersion, model: Device.modelName, appVersion },
      }),
    onSuccess: () => {
      toast.success('Report sent', 'The ENS support team will follow up.');
      router.back();
    },
  });

  const invalid = message.trim().length < 10;

  return (
    <ScrollScreen
      footer={
        <Button
          label="Send report"
          icon="send"
          size="lg"
          fullWidth
          loading={send.isPending}
          onPress={() => {
            setTouched(true);
            if (!invalid) send.mutate();
          }}
        />
      }>
      {send.error ? <Banner tone="danger" icon="warning" {...describeError(send.error)} /> : null}
      <View style={styles.pad}>
        <Banner flush tone="caution" icon="phone" title="Not for emergencies" message="To report an incident use Raise emergency or call AOCC." />
        <TextField
          label="What went wrong?"
          required
          value={message}
          onChangeText={setMessage}
          maxLength={2000}
          multiline
          placeholder="What you were doing, what you expected, what happened"
          error={touched && invalid ? 'Describe the problem in at least 10 characters.' : null}
        />
        <View style={[styles.toggle, { borderColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text variant="body">Attach diagnostic log</Text>
            <Text variant="footnote" tone="textSecondary">
              Recent app events from this phone. Phone numbers, emails and tokens are removed.
            </Text>
          </View>
          <Switch value={includeLogs} onValueChange={setIncludeLogs} trackColor={{ true: colors.accent, false: colors.borderStrong }} accessibilityLabel="Attach diagnostic log" />
        </View>
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: gutter, paddingVertical: space[4], gap: space[4] },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space[3], borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space[4] },
});
