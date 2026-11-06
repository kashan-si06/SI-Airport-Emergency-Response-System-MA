import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useCatalog } from '@/api/queries';
import { StepHeader } from '@/features/reports/step-header';
import { step1Errors, useRaiseDraft } from '@/features/reports/raise-draft';
import { severityMeta } from '@/domain/presentation';
import { haptic } from '@/lib/haptics';
import { gutter, space } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { ChoiceGroup } from '@/ui/choice';
import { ErrorState, SkeletonRows } from '@/ui/feedback';
import { TextField } from '@/ui/field';
import { ScrollScreen } from '@/ui/screen';
import { SearchPicker } from '@/ui/search-picker';
import { Text } from '@/ui/text';

export default function RaiseStep1() {
  const catalog = useCatalog();
  const { draft, set } = useRaiseDraft();
  const [touched, setTouched] = useState(false);
  const errors = touched ? step1Errors(draft) : {};

  if (!catalog.data) {
    return catalog.isPending ? <SkeletonRows rows={4} /> : <ErrorState error={catalog.error} onRetry={() => void catalog.refetch()} />;
  }

  const types = catalog.data.emergencyTypes.filter((t) =>
    draft.source === 'AIRLINE' ? t.category !== 'AIRPORT' : draft.source === 'AIRPORT' ? t.category !== 'AIRCRAFT' : true,
  );

  const next = () => {
    setTouched(true);
    if (Object.keys(step1Errors(draft)).length > 0) return haptic.warning();
    router.push('/raise/details');
  };

  return (
    <ScrollScreen footer={<Button label="Next: situation" trailingIcon="chevronRight" size="lg" fullWidth onPress={next} />}>
      <StepHeader step={1} total={3} title="What kind of emergency?" />
      <View style={styles.block}>
        <ChoiceGroup<'AIRLINE' | 'AIRPORT'>
          accessibilityLabel="Source"
          value={draft.source}
          onChange={(source) => set({ source, emergencyTypeId: null })}
          options={[
            { value: 'AIRLINE', label: 'Aircraft', description: 'An aircraft or flight is involved', icon: 'aircraft' },
            { value: 'AIRPORT', label: 'Airport facility', description: 'Terminal, airside or landside', icon: 'location' },
          ]}
        />
        {errors.source ? (
          <Text variant="footnote" tone="danger">
            {errors.source}
          </Text>
        ) : null}

        {draft.source ? (
          <SearchPicker
            label="Emergency type"
            placeholder="Search e.g. fire, bird strike, bomb"
            value={draft.emergencyTypeId}
            error={errors.type}
            onChange={(id) => {
              const t = catalog.data.emergencyTypes.find((x) => x.id === id);
              set({ emergencyTypeId: id, severity: draft.severity ?? t?.defaultSeverity ?? null });
            }}
            items={types.map((t) => ({
              value: t.id,
              label: t.name,
              description: `${severityMeta[t.defaultSeverity].label} by default${t.sensitive ? ' · Sensitive' : ''}`,
              icon: severityMeta[t.defaultSeverity].icon,
              keywords: t.code,
            }))}
          />
        ) : null}

        {draft.source === 'AIRLINE' ? (
          <>
            <SearchPicker
              label="Airline"
              placeholder="Search name or IATA code"
              value={draft.airline}
              error={errors.airline}
              onChange={(airline) => set({ airline })}
              limit={5}
              items={catalog.data.airlines.map((a) => ({ value: a.iata, label: a.name, description: `${a.iata} / ${a.icao}`, keywords: `${a.iata} ${a.icao}` }))}
            />
            <View style={styles.row}>
              <View style={styles.flex}>
                <TextField
                  label="Flight number"
                  required
                  mono
                  value={draft.flightNumber}
                  onChangeText={(v) => set({ flightNumber: v.toUpperCase() })}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={8}
                  counter={false}
                  placeholder="AI 101"
                  error={errors.flightNumber}
                />
              </View>
              <View style={styles.flex}>
                <TextField
                  label="Persons on board"
                  value={draft.personsOnBoard}
                  onChangeText={(v) => set({ personsOnBoard: v.replace(/\D/g, '') })}
                  keyboardType="number-pad"
                  maxLength={3}
                  counter={false}
                  placeholder="If known"
                  error={errors.personsOnBoard}
                />
              </View>
            </View>
            <TextField
              label="Sector"
              mono
              value={draft.sector}
              onChangeText={(v) => set({ sector: v.toUpperCase() })}
              autoCapitalize="characters"
              maxLength={12}
              counter={false}
              placeholder="DEL-BOM"
            />
          </>
        ) : null}
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  block: { paddingHorizontal: gutter, gap: space[5] },
  row: { flexDirection: 'row', gap: space[3] },
  flex: { flex: 1 },
});
