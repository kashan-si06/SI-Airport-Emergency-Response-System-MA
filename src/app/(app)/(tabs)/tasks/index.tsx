import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useChecklists } from '@/api/queries';
import type { ChecklistListItem } from '@/api/schemas';
import { SystemBanners } from '@/app-shell/system-banners';
import { haptic } from '@/lib/haptics';
import { useColors } from '@/theme/theme';
import { gutter, space } from '@/theme/tokens';
import { EmptyState, ErrorState, ProgressBar, SkeletonRows } from '@/ui/feedback';
import { heroes, HeroScreen } from '@/ui/hero-screen';
import { Section } from '@/ui/list';
import { SegmentedControl } from '@/ui/segmented';
import { Text } from '@/ui/text';

export default function ChecklistsTab() {
  const [scope, setScope] = useState<'active' | 'resolved'>('active');
  const q = useChecklists(scope);

  return (
    <HeroScreen hero={heroes.crashTender} headline="Checklists" message="Work through your department’s steps." refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      <SystemBanners showDrill={false} />
      <View style={styles.seg}>
        <SegmentedControl
          accessibilityLabel="Checklist scope"
          value={scope}
          onChange={setScope}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'resolved', label: 'Resolved' },
          ]}
        />
      </View>
      {q.isPending ? (
        <SkeletonRows rows={3} />
      ) : !q.data ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState
          icon="checklist"
          title={scope === 'active' ? 'No open checklists' : 'Nothing resolved yet'}
          message={scope === 'active' ? 'They appear when your department is involved.' : undefined}
        />
      ) : (
        <Section>
          {q.data.map((c) => (
            <ChecklistRow key={c.id} item={c} />
          ))}
        </Section>
      )}
    </HeroScreen>
  );
}

function ChecklistRow({ item: c }: { item: ChecklistListItem }) {
  const colors = useColors();
  const complete = c.done === c.total;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${c.title}. ${c.incident.title}. ${c.done} of ${c.total} done${c.mandatoryOpen ? `. ${c.mandatoryOpen} required steps open` : ''}`}
      onPress={() => {
        haptic.tap();
        router.push({ pathname: '/incident/[id]', params: { id: c.incident.id, tab: 'checklist' } });
      }}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfacePressed }]}>
      <View style={styles.body}>
        <Text variant="title2" numberOfLines={2}>
          {c.title}
        </Text>
        <Text variant="subhead" tone="textSecondary" numberOfLines={1}>
          {c.incident.title}
        </Text>
        {c.mandatoryOpen > 0 ? (
          <Text variant="footnote" weight="500" tone="danger">
            {c.mandatoryOpen} required step{c.mandatoryOpen > 1 ? 's' : ''} open
          </Text>
        ) : null}
        <View style={styles.bar}>
          <ProgressBar value={c.done} total={c.total} height={2} />
        </View>
      </View>
      <Text variant="title1" style={{ color: complete ? colors.textSecondary : colors.text }} dense>
        {c.done}
        <Text variant="subhead" tone="textSecondary">{`/${c.total}`}</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  seg: { paddingHorizontal: gutter, paddingTop: space[3] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[4], paddingHorizontal: gutter, paddingVertical: space[4] },
  body: { flex: 1, gap: 3 },
  bar: { marginTop: space[2] },
});
