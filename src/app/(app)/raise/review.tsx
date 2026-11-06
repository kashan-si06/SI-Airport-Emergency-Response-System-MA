import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { newIdempotencyKey } from '@/api/client';
import { useCatalog } from '@/api/queries';
import { useRaiseDraft } from '@/features/reports/raise-draft';
import { haptic } from '@/lib/haptics';
import { useOutbox } from '@/offline/outbox';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { KeyValue, Section } from '@/ui/list';
import { PageHead } from '@/ui/page-head';
import { ScrollScreen } from '@/ui/screen';
import { SeverityTag } from '@/ui/tags';

export default function RaiseReview() {
  const catalog = useCatalog();
  const { draft, reset } = useRaiseDraft();
  const [submitting, setSubmitting] = useState(false);

  const type = catalog.data?.emergencyTypes.find((t) => t.id === draft.emergencyTypeId);
  const point = catalog.data?.locations.find((p) => p.id === draft.pointId);
  const airline = catalog.data?.airlines.find((a) => a.iata === draft.airline);
  const locationText = [point?.name, draft.locationText.trim()].filter(Boolean).join(' — ');

  const submit = async () => {
    if (!draft.source || !draft.emergencyTypeId || !draft.severity) return;
    setSubmitting(true);
    haptic.heavy();
    const item = useOutbox.getState().enqueue({
      kind: 'fieldReport',
      key: newIdempotencyKey(),
      payload: {
        input: {
          source: draft.source,
          airline: draft.source === 'AIRLINE' ? draft.airline : null,
          flightNumber: draft.source === 'AIRLINE' ? draft.flightNumber.trim() : null,
          sector: draft.source === 'AIRLINE' ? draft.sector.trim() || null : null,
          personsOnBoard: draft.source === 'AIRLINE' && draft.personsOnBoard ? Number(draft.personsOnBoard) : null,
          emergencyTypeId: draft.emergencyTypeId,
          severity: draft.severity,
          headline: draft.headline.trim(),
          who: draft.who.trim(),
          what: draft.what.trim(),
          where: draft.where.trim(),
          when: draft.when.trim(),
          why: draft.why.trim(),
          location: { text: locationText, pointId: draft.pointId, geo: draft.geo },
          scope: draft.scope,
          occurredAt: new Date().toISOString(),
        },
        attachments: draft.photos,
      },
    });
    await useOutbox.getState().flush();
    const stillQueued = useOutbox.getState().items.find((i) => i.id === item.id);
    reset();
    setSubmitting(false);
    router.replace({
      pathname: '/raise/sent',
      params: { status: !stillQueued ? 'sent' : stillQueued.failed ? 'rejected' : 'queued', error: stillQueued?.lastError ?? '' },
    });
  };

  return (
    <ScrollScreen
      footer={
        <Button
          label="Send to AOCC"
          icon="send"
          variant="danger"
          size="xl"
          fullWidth
          loading={submitting}
          onPress={() => void submit()}
          caption="AOCC validates before anyone else is alerted"
        />
      }>
      <PageHead
        title={draft.headline}
        subtitle={[type?.name, draft.source === 'AIRLINE' ? 'Aircraft' : 'Airport facility'].filter(Boolean).join(' · ')}
        status={draft.severity ? <SeverityTag severity={draft.severity} /> : undefined}
      />

      {draft.source === 'AIRLINE' ? (
        <Section title="Flight">
          <KeyValue label="Airline" value={airline ? `${airline.name} (${airline.iata})` : draft.airline} />
          <KeyValue label="Flight" value={draft.flightNumber} mono />
          <KeyValue label="Sector" value={draft.sector || null} mono />
          <KeyValue label="Persons on board" value={draft.personsOnBoard || null} />
        </Section>
      ) : null}

      <Section title="Situation">
        <KeyValue label="Who" value={draft.who} />
        <KeyValue label="What" value={draft.what} />
        <KeyValue label="Where" value={draft.where} />
        <KeyValue label="When" value={draft.when} />
        <KeyValue label="Why" value={draft.why} />
      </Section>

      <Section title="Location">
        <KeyValue label="Location" value={locationText || null} />
        <KeyValue label="GPS" value={draft.geo ? `${draft.geo.lat.toFixed(5)}, ${draft.geo.lng.toFixed(5)}` : null} mono />
        <KeyValue label="Photos" value={draft.photos.length ? String(draft.photos.length) : null} />
        <KeyValue label="Requested scope" value={draft.scope === 'ALL_STATION' ? 'All station' : 'Relevant departments'} />
      </Section>

      <View style={styles.edit}>
        <Button label="Edit details" variant="ghost" icon="chevronLeft" onPress={() => router.back()} />
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  edit: { alignItems: 'flex-start', paddingHorizontal: space[2], marginTop: space[3] },
});
