import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import type { Severity } from '@/api/schemas';
import { StepHeader } from '@/features/reports/step-header';
import { step2Errors, useRaiseDraft } from '@/features/reports/raise-draft';
import { severityMeta } from '@/domain/presentation';
import { formatDateTime } from '@/domain/time';
import { haptic } from '@/lib/haptics';
import { gutter, space } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { ChoiceGroup } from '@/ui/choice';
import { TextField } from '@/ui/field';
import { ScrollScreen } from '@/ui/screen';
import { Text } from '@/ui/text';

const W5 = [
  { key: 'who', label: 'Who', placeholder: 'People / aircraft / units involved' },
  { key: 'what', label: 'What', placeholder: 'What is happening' },
  { key: 'where', label: 'Where', placeholder: 'Exact position, e.g. Stand 14, nose gear' },
  { key: 'when', label: 'When', placeholder: 'Time observed' },
  { key: 'why', label: 'Why / cause', placeholder: 'Known or suspected cause — "unknown" is fine' },
] as const;

export default function RaiseStep2() {
  const { draft, set } = useRaiseDraft();
  const [touched, setTouched] = useState(false);
  const errors = touched ? step2Errors(draft) : {};
  const refs = useRef<(ComponentRef<typeof TextInput> | null)[]>([]);

  useEffect(() => {
    if (!draft.when) set({ when: `${formatDateTime(new Date().toISOString())} IST` });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const next = () => {
    setTouched(true);
    if (Object.keys(step2Errors(draft)).length > 0) return haptic.warning();
    router.push('/raise/location');
  };

  return (
    <ScrollScreen footer={<Button label="Next: location" trailingIcon="chevronRight" size="lg" fullWidth onPress={next} />}>
      <StepHeader step={2} total={3} title="Describe the situation" />
      <View style={styles.block}>
        <Text variant="section">
          Severity
        </Text>
        <ChoiceGroup<Severity>
          accessibilityLabel="Severity"
          value={draft.severity}
          onChange={(severity) => set({ severity })}
          options={(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((s) => ({
            value: s,
            label: severityMeta[s].label,
            icon: severityMeta[s].icon,
            description:
              s === 'CRITICAL'
                ? 'Threat to life or aircraft — immediate response'
                : s === 'HIGH'
                  ? 'Serious, escalating — urgent response'
                  : s === 'MEDIUM'
                    ? 'Contained — needs attention'
                    : 'Minor — for awareness',
          }))}
        />
        {errors.severity ? (
          <Text variant="footnote" tone="danger">
            {errors.severity}
          </Text>
        ) : null}

        <TextField
          label="Headline"
          required
          value={draft.headline}
          onChangeText={(headline) => set({ headline })}
          maxLength={120}
          placeholder="e.g. Smoke from APU, Stand 14"
          returnKeyType="next"
          onSubmitEditing={() => refs.current[0]?.focus()}
          error={errors.headline}
        />

        {W5.map((f, i) => (
          <TextField
            key={f.key}
            ref={(r) => {
              refs.current[i] = r;
            }}
            label={f.label}
            required
            value={draft[f.key]}
            onChangeText={(v) => set({ [f.key]: v })}
            maxLength={300}
            multiline
            placeholder={f.placeholder}
            error={errors[f.key]}
          />
        ))}
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  block: { paddingHorizontal: gutter, gap: space[4] },
});
