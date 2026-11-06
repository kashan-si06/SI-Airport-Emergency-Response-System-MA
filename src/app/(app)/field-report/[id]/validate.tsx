import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { newIdempotencyKey } from '@/api/client';
import { fieldReportApi } from '@/api/endpoints';
import { qk, useFieldReport, useTemplates } from '@/api/queries';
import type { Severity } from '@/api/schemas';
import { DispatchPreviewPanel, useDispatchPreview } from '@/features/ops/dispatch-preview';
import { initialTagValues, ManualTagFields, missingMandatory } from '@/features/ops/manual-tags';
import { severityMeta } from '@/domain/presentation';
import { haptic } from '@/lib/haptics';
import { authenticate } from '@/security/app-lock';
import { gutter, space } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { ChoiceGroup } from '@/ui/choice';
import { Banner, describeError, EmptyState, ErrorState, SkeletonRows } from '@/ui/feedback';
import { PageHead } from '@/ui/page-head';
import { ScrollScreen } from '@/ui/screen';
import { SegmentedControl } from '@/ui/segmented';
import { Text } from '@/ui/text';
import { toast } from '@/ui/toast';

/** AOCC maps a field report to a scenario template and broadcasts it (FR-RAISE-02). */
export default function ValidateReport() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const report = useFieldReport(id);
  const templates = useTemplates(report.data?.emergencyType.id ?? null);
  const key = useRef(newIdempotencyKey()).current;

  const [templateId, setTemplateId] = useState<string | null>(null);
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [scope, setScope] = useState<'DEFAULT' | 'ALL_STATION'>('DEFAULT');
  const [values, setValues] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);

  const template = templates.data?.find((t) => t.id === templateId) ?? null;
  const level1 = template?.levels.find((l) => l.levelNo === 1) ?? null;

  useEffect(() => {
    if (report.data && !severity) {
      setSeverity(report.data.severity);
      setScope(report.data.scope);
    }
  }, [report.data, severity]);
  useEffect(() => {
    if (templates.data?.length === 1 && !templateId) setTemplateId(templates.data[0].id);
  }, [templates.data, templateId]);
  useEffect(() => {
    if (level1) setValues(initialTagValues(level1.manualTags));
  }, [level1?.levelNo, templateId]);

  const preview = useDispatchPreview(
    template && level1 ? { templateId: template.id, notificationId: null, levelNo: 1, channels: level1.channels, placeholderValues: values, scope } : null,
  );

  const validate = useMutation({
    mutationFn: async () => {
      if (!(await authenticate('Confirm broadcast'))) throw new Error('cancelled');
      return fieldReportApi.validate(id, { templateId: template!.id, severity: severity!, placeholderValues: values, scope }, key);
    },
    onSuccess: (incident) => {
      void qc.invalidateQueries({ queryKey: ['fieldReports'] });
      void qc.invalidateQueries({ queryKey: qk.home });
      haptic.success();
      toast.success(`Broadcast as ${incident.displayId}`, `${preview.data?.recipientCount ?? ''} people alerted`);
      router.dismissAll();
      router.push({ pathname: '/incident/[id]', params: { id: incident.id } });
    },
    onError: (e) => {
      if (!(e instanceof Error && e.message === 'cancelled')) haptic.error();
    },
  });

  if (!report.data) return report.isPending ? <SkeletonRows rows={4} /> : <ErrorState error={report.error} />;
  if (report.data.status !== 'PENDING') {
    return <EmptyState icon="checkCircle" title="Already handled" message="Another operator has validated or rejected this report." />;
  }

  const missing = level1 ? missingMandatory(level1.manualTags, values) : [];
  const err = validate.error && !(validate.error instanceof Error && validate.error.message === 'cancelled') ? describeError(validate.error) : null;

  return (
    <ScrollScreen
      footer={
        <Button
          label="Broadcast alert"
          icon="send"
          variant="danger"
          size="lg"
          fullWidth
          disabled={!template || !severity}
          loading={validate.isPending}
          caption={preview.data ? `Alerts ${preview.data.recipientCount} people · confirm with biometrics` : 'Choose a template'}
          onPress={() => {
            if (missing.length > 0) {
              setShowErrors(true);
              return haptic.warning();
            }
            validate.mutate();
          }}
        />
      }>
      <PageHead compact title={report.data.headline} id={report.data.displayId} subtitle={`${report.data.emergencyType.name} · ${report.data.location.text}`} />
      {err ? <Banner tone="danger" icon="warning" title={err.title} message={err.message} /> : null}

      <View style={styles.block}>
        <Text variant="section">
          Message type / template
        </Text>
        {templates.isPending ? (
          <SkeletonRows rows={2} />
        ) : templates.data && templates.data.length > 0 ? (
          <ChoiceGroup<string>
            accessibilityLabel="Template"
            value={templateId}
            onChange={setTemplateId}
            options={templates.data.map((t) => ({
              value: t.id,
              label: t.messageType.name,
              description: `${t.department.code} · v${t.version} · ${t.levels.length} stages`,
            }))}
          />
        ) : (
          <Banner tone="caution" icon="warning" title="No template for this emergency type" message="Validate from the web console, where a template can be chosen across types." />
        )}
      </View>

      <View style={styles.block}>
        <Text variant="section">
          Severity
        </Text>
        <SegmentedControl<Severity>
          accessibilityLabel="Severity"
          value={severity ?? 'HIGH'}
          onChange={setSeverity}
          options={(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((s) => ({ value: s, label: severityMeta[s].label }))}
        />
        <Text variant="section" style={{ marginTop: space[3] }}>
          Scope
        </Text>
        <SegmentedControl
          accessibilityLabel="Scope"
          value={scope}
          onChange={setScope}
          options={[
            { value: 'DEFAULT', label: 'Template recipients' },
            { value: 'ALL_STATION', label: 'All station' },
          ]}
        />
      </View>

      {level1 && level1.manualTags.length > 0 ? (
        <View style={styles.block}>
          <Text variant="section">
            Incident facts
          </Text>
          <ManualTagFields tags={level1.manualTags} values={values} onChange={setValues} showErrors={showErrors} />
        </View>
      ) : null}

      <View style={{ marginTop: space[6] }}>
        <DispatchPreviewPanel preview={preview.data} loading={preview.isFetching} error={preview.error} />
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  block: { paddingHorizontal: gutter, marginTop: space[5], gap: space[2] },
});
