import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useCatalog } from '@/api/queries';
import type { LocationPoint } from '@/api/schemas';
import { PhotoStrip } from '@/features/media/photo-strip';
import { StepHeader } from '@/features/reports/step-header';
import { step3Errors, useRaiseDraft } from '@/features/reports/raise-draft';
import { haptic } from '@/lib/haptics';
import { useColors } from '@/theme/theme';
import { gutter, space } from '@/theme/tokens';
import { AirportMap } from '@/ui/airport-map';
import { Button } from '@/ui/button';
import { ChoiceGroup } from '@/ui/choice';
import { Banner, ErrorState, SkeletonRows } from '@/ui/feedback';
import { TextField } from '@/ui/field';
import { Icon } from '@/ui/icon';
import { ScrollScreen } from '@/ui/screen';
import { SearchPicker } from '@/ui/search-picker';
import { SegmentedControl } from '@/ui/segmented';
import { Text } from '@/ui/text';
import { toast } from '@/ui/toast';

const KINDS: { value: LocationPoint['kind'] | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'STAND', label: 'Stands' },
  { value: 'TAXIWAY', label: 'Taxiways' },
  { value: 'GATE', label: 'Gates' },
];

/** Haversine distance in metres — used to suggest the nearest known point. */
function distance(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function RaiseStep3() {
  const colors = useColors();
  const catalog = useCatalog();
  const { draft, set } = useRaiseDraft();
  const [kind, setKind] = useState<(typeof KINDS)[number]['value']>('ALL');
  const [locating, setLocating] = useState(false);
  const [touched, setTouched] = useState(false);
  const errors = touched ? step3Errors(draft) : {};

  if (!catalog.data) {
    return catalog.isPending ? <SkeletonRows rows={4} /> : <ErrorState error={catalog.error} onRetry={() => void catalog.refetch()} />;
  }
  const points = catalog.data.locations.filter((p) => kind === 'ALL' || p.kind === kind);

  const attachGps = async () => {
    setLocating(true);
    try {
      let perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== 'granted') perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        toast.caution('Location is off', 'Pick the location from the list instead.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const geo = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy ?? null };
      const nearest = catalog.data.locations
        .filter((p) => p.geo)
        .map((p) => ({ p, d: distance(geo, p.geo!) }))
        .sort((a, b) => a.d - b.d)[0];
      set({ geo, ...(nearest && nearest.d < 250 && !draft.pointId ? { pointId: nearest.p.id } : {}) });
      haptic.success();
      toast.info('Position attached', nearest && nearest.d < 250 ? `Nearest: ${nearest.p.name} (${Math.round(nearest.d)} m)` : `±${Math.round(geo.accuracy ?? 0)} m`);
    } catch {
      toast.caution('Could not get a GPS fix', 'Pick the location from the list instead.');
    } finally {
      setLocating(false);
    }
  };

  const next = () => {
    setTouched(true);
    if (Object.keys(step3Errors(draft)).length > 0) return haptic.warning();
    router.push('/raise/review');
  };

  return (
    <ScrollScreen footer={<Button label="Review report" trailingIcon="chevronRight" size="lg" fullWidth onPress={next} />}>
      <StepHeader step={3} total={3} title="Where is it?" />
      <View style={styles.block}>
        <Button
          label={draft.geo ? 'GPS attached' : 'Use my current position'}
          // Separate from the label, which is set in capitals: a metre must stay a lowercase m.
          caption={draft.geo ? `±${Math.round(draft.geo.accuracy ?? 0)} m` : undefined}
          icon="gps"
          variant={draft.geo ? 'secondary' : 'primary'}
          loading={locating}
          fullWidth
          onPress={() => void attachGps()}
        />
        <SegmentedControl accessibilityLabel="Location type" value={kind} onChange={setKind} options={KINDS} />
        <SearchPicker
          label="Airport location"
          placeholder="Search stand, gate, taxiway, building"
          value={draft.pointId}
          onChange={(pointId) => set({ pointId })}
          limit={6}
          error={errors.location}
          items={points.map((p) => ({ value: p.id, label: p.name, description: p.kind.toLowerCase(), icon: 'location' }))}
        />
        <TextField
          label="Location details"
          value={draft.locationText}
          onChangeText={(locationText) => set({ locationText })}
          maxLength={200}
          placeholder="e.g. Near the fuel hydrant, west side"
        />

        <View style={styles.map}>
          <AirportMap pin={draft.geo ?? points.find((p) => p.id === draft.pointId)?.geo} />
        </View>

        <PhotoStrip photos={draft.photos} onChange={(photos) => set({ photos })} max={5} />

        <Text variant="section">
          Who should AOCC alert?
        </Text>
        <ChoiceGroup<'DEFAULT' | 'ALL_STATION'>
          accessibilityLabel="Requested scope"
          value={draft.scope}
          onChange={(scope) => set({ scope })}
          options={[
            { value: 'DEFAULT', label: 'Relevant departments', description: 'AOCC alerts the departments in the emergency plan' },
            { value: 'ALL_STATION', label: 'All station', description: 'Request a station-wide alert — AOCC decides' },
          ]}
        />
        {draft.scope === 'ALL_STATION' ? (
          <Banner flush tone="caution" icon="warning" title="All-station is a request" message="AOCC confirms scope when validating. Use only for airport-wide threats." />
        ) : null}
        <View style={styles.note}>
          <Icon name="info" size={14} color={colors.textTertiary} />
          <Text variant="caption" tone="textTertiary" style={{ flex: 1 }}>
            Photo location data is removed before upload; capture time is kept.
          </Text>
        </View>
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  block: { paddingHorizontal: gutter, gap: space[5] },
  map: { marginHorizontal: -gutter },
  note: { flexDirection: 'row', gap: space[2], alignItems: 'flex-start' },
});
