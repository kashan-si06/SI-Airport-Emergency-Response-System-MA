import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { opsApi } from '@/api/endpoints';
import type { Channel, DispatchPreview } from '@/api/schemas';
import { channelMeta } from '@/domain/presentation';
import { useColors } from '@/theme/theme';
import { gutter, space } from '@/theme/tokens';
import { describeError, SkeletonRows } from '@/ui/feedback';
import { Text } from '@/ui/text';

type Args = {
  templateId: string;
  notificationId: string | null;
  levelNo: number;
  channels: Channel[];
  placeholderValues: Record<string, string>;
  scope: 'DEFAULT' | 'ALL_STATION';
};

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Server-rendered preview: exact wording and who will be alerted (FR-REQ-03). */
export function useDispatchPreview(args: Args | null) {
  const debounced = useDebounced(args, 400);
  return useQuery({
    queryKey: ['preview', debounced],
    queryFn: () => opsApi.preview(debounced!),
    enabled: !!debounced,
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function DispatchPreviewPanel({ preview, loading, error }: { preview: DispatchPreview | undefined; loading: boolean; error: unknown }) {
  const colors = useColors();
  if (!preview) {
    if (loading) return <SkeletonRows rows={2} />;
    if (error) {
      const e = describeError(error);
      return (
        <Text variant="footnote" tone="danger" style={styles.pad}>
          Preview unavailable — {e.message}
        </Text>
      );
    }
    return null;
  }
  return (
    <View style={[styles.wrap, { borderColor: colors.separator }]}>
      <View style={styles.reach}>
        <Text variant="section">
          Alerts {preview.recipientCount} {preview.recipientCount === 1 ? 'person' : 'people'}
        </Text>
        <Text variant="footnote" tone="textSecondary">
          {preview.channels.map((c) => channelMeta[c].label).join(', ')}
        </Text>
      </View>
      <View style={styles.depts}>
        {preview.byDepartment.map((d) => (
          <Text key={d.department.id} variant="monoSmall" tone="textSecondary" dense>
            {d.department.code} {d.count}
          </Text>
        ))}
      </View>
      <View style={[styles.message, { borderTopColor: colors.separator }]}>
        <Text variant="overline" tone="textSecondary">
          Message preview
        </Text>
        <Text variant="title2">
          {preview.renderedHeading}
        </Text>
        <Text variant="callout" tone="textSecondary">
          {preview.renderedBody}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: gutter },
  wrap: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  reach: { paddingHorizontal: gutter, paddingVertical: space[4], gap: space[1] },
  depts: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space[4], rowGap: space[1], paddingHorizontal: gutter, paddingVertical: space[3] },
  message: { paddingHorizontal: gutter, paddingVertical: space[4], gap: space[1], borderTopWidth: StyleSheet.hairlineWidth },
});
