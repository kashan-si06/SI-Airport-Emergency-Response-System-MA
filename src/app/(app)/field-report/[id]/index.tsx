import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { newIdempotencyKey } from '@/api/client';
import { fieldReportApi } from '@/api/endpoints';
import { qk, useFieldReport } from '@/api/queries';
import { useCan, useSession } from '@/auth/session';
import { AttachmentsGrid } from '@/features/incidents/attachments-grid';
import { ReportStatusTag } from '@/features/reports/report-row';
import { formatDateTime, formatElapsed } from '@/domain/time';
import { haptic } from '@/lib/haptics';
import { useNow } from '@/lib/use-now';
import { gutter, space } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { Banner, describeError, ErrorState, SkeletonRows } from '@/ui/feedback';
import { TextField } from '@/ui/field';
import { AirportMap } from '@/ui/airport-map';
import { KeyValue, Row, Section } from '@/ui/list';
import { PageHead } from '@/ui/page-head';
import { ScrollScreen } from '@/ui/screen';
import { SeverityTag } from '@/ui/tags';
import { toast } from '@/ui/toast';

export default function FieldReportDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const me = useSession((s) => s.me);
  const report = useFieldReport(id);
  const canValidate = useCan('fieldreport.validate');
  const nowMs = useNow();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const key = useRef(newIdempotencyKey()).current;

  const reject = useMutation({
    mutationFn: () => fieldReportApi.reject(id, reason.trim(), key),
    onSuccess: (r) => {
      qc.setQueryData(qk.report(id), r);
      void qc.invalidateQueries({ queryKey: ['fieldReports'] });
      void qc.invalidateQueries({ queryKey: qk.home });
      haptic.success();
      toast.info('Report rejected', 'The reporter has been notified with your reason.');
      setRejecting(false);
    },
    onError: () => haptic.error(),
  });

  const r = report.data;
  if (!r) return report.isPending ? <SkeletonRows rows={5} /> : <ErrorState error={report.error} onRetry={() => void report.refetch()} />;

  const pending = r.status === 'PENDING';
  const isMine = r.reporter.id === me?.user.id;
  const actionable = pending && canValidate;

  return (
    <>
      <Stack.Screen options={{ title: r.displayId }} />
      <ScrollScreen
        footer={
          actionable ? (
            rejecting ? (
              <>
                <Button
                  label="Reject report"
                  variant="danger"
                  size="lg"
                  fullWidth
                  loading={reject.isPending}
                  disabled={reason.trim().length < 5}
                  onPress={() => reject.mutate()}
                />
                <Button label="Cancel" variant="ghost" onPress={() => setRejecting(false)} />
              </>
            ) : (
              <>
                <Button
                  label="Validate & broadcast"
                  icon="send"
                  size="lg"
                  fullWidth
                  onPress={() => router.push({ pathname: '/field-report/[id]/validate', params: { id } })}
                />
                <Button label="Reject with reason" variant="ghost" onPress={() => setRejecting(true)} />
              </>
            )
          ) : undefined
        }>
        <PageHead
          title={r.headline}
          subtitle={`${r.emergencyType.name} · ${r.source === 'AIRLINE' ? 'Aircraft' : 'Airport facility'}`}
          id={`${formatDateTime(r.createdAt)}${pending ? `  ·  waiting ${formatElapsed(r.createdAt, nowMs)}` : ''}`}
          status={
            <>
              <SeverityTag severity={r.severity} solid={pending} />
              <ReportStatusTag report={r} />
            </>
          }
        />

        {r.status === 'BROADCAST' && r.notificationId ? (
          <Section>
            <Row
              title={`Broadcast as ${r.notificationDisplayId}`}
              subtitle="Open the live incident"
              onPress={() => router.push({ pathname: '/incident/[id]', params: { id: r.notificationId! } })}
            />
          </Section>
        ) : null}
        {r.status === 'REJECTED' ? (
          <Banner tone="caution" icon="info" title="Rejected by AOCC" message={r.rejectReason ?? 'No reason recorded.'} />
        ) : null}
        {pending && isMine && !canValidate ? (
          <Banner tone="info" icon="clock" title="With AOCC for validation" message="You will get a notification when it is broadcast or rejected." />
        ) : null}

        {rejecting ? (
          <View style={styles.reject}>
            <TextField
              label="Reason for rejection"
              required
              value={reason}
              onChangeText={setReason}
              maxLength={300}
              multiline
              autoFocus
              placeholder="Sent to the reporter, e.g. Verified with ARFF — no fire."
              error={reject.error ? describeError(reject.error).message : null}
            />
          </View>
        ) : null}

        {r.source === 'AIRLINE' ? (
          <Section title="Flight">
            <KeyValue label="Airline" value={r.airline} />
            <KeyValue label="Flight" value={r.flightNumber} mono />
            <KeyValue label="Sector" value={r.sector} mono />
            <KeyValue label="Persons on board" value={r.personsOnBoard?.toString()} mono />
          </Section>
        ) : null}

        {r.location.geo ? (
          <View style={{ marginTop: space[8] }}>
            <AirportMap pin={r.location.geo} />
          </View>
        ) : null}

        <Section title="Situation">
          <KeyValue label="Who" value={r.who} />
          <KeyValue label="What" value={r.what} />
          <KeyValue label="Where" value={r.where} />
          <KeyValue label="When" value={r.when} />
          <KeyValue label="Why" value={r.why} />
        </Section>

        <Section title="Location">
          <KeyValue label="Location" value={r.location.text} />
          <KeyValue label="GPS" value={r.location.geo ? `${r.location.geo.lat.toFixed(5)}, ${r.location.geo.lng.toFixed(5)}` : null} mono />
          <KeyValue label="Requested scope" value={r.scope === 'ALL_STATION' ? 'All station' : 'Relevant departments'} />
        </Section>

        <Section title="Reporter">
          <Row title={r.reporter.name} subtitle={[r.reporter.designation, r.reporter.department?.name].filter(Boolean).join(' · ')} />
        </Section>

        {r.attachments.length > 0 ? (
          <Section title="Photos">
            <View style={{ paddingVertical: space[3] }}>
              <AttachmentsGrid items={r.attachments} />
            </View>
          </Section>
        ) : null}
      </ScrollScreen>
    </>
  );
}

const styles = StyleSheet.create({
  reject: { paddingHorizontal: gutter, paddingVertical: space[4] },
});
