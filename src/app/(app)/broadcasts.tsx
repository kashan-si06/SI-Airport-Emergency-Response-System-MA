import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { useBroadcasts } from '@/api/queries';
import type { Broadcast } from '@/api/schemas';
import { channelMeta, severityMeta } from '@/domain/presentation';
import { formatDateTime, formatRelative } from '@/domain/time';
import { useColors } from '@/theme/theme';
import { gutter, space } from '@/theme/tokens';
import { EmptyState, ErrorState, SkeletonRows } from '@/ui/feedback';
import { AmbientGlow } from '@/ui/hero-glow';
import { Text } from '@/ui/text';

export default function BroadcastsFeed() {
  const colors = useColors();
  const q = useBroadcasts();
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];

  if (q.isPending) return <SkeletonRows rows={4} />;
  if (!q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AmbientGlow />
      <FlatList
        data={items}
        keyExtractor={(b) => b.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={items.length === 0 ? { flexGrow: 1 } : { paddingBottom: space[12] }}
        ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: colors.separator }]} />}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={colors.textSecondary} />}
        onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && void q.fetchNextPage()}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={<EmptyState icon="megaphone" title="No broadcasts" message="Messages from AOCC and Incident Commanders to department SPOCs appear here." />}
        ListFooterComponent={q.isFetchingNextPage ? <SkeletonRows rows={1} /> : undefined}
        renderItem={({ item }) => <BroadcastRow b={item} />}
      />
    </View>
  );
}

function BroadcastRow({ b }: { b: Broadcast }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Broadcast from ${b.sentBy.name} on ${b.incidentDisplayId}: ${b.text}`}
      onPress={() => router.push({ pathname: '/incident/[id]', params: { id: b.notificationId, tab: 'timeline' } })}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.surfacePressed : 'transparent' }]}>
      <View style={styles.titleLine}>
        <Text variant="body" style={styles.shrink}>
          {b.text}
        </Text>
        <Text variant="subhead" tone="textSecondary" dense accessibilityLabel={formatDateTime(b.sentAt)}>
          {formatRelative(b.sentAt)}
        </Text>
      </View>
      <Text variant="subhead" tone="textSecondary" numberOfLines={1}>
        {b.sentBy.name} · {b.incidentTitle}
      </Text>
      <Text variant="footnote" tone="textSecondary" numberOfLines={1}>
        <Text variant="footnote" style={{ color: b.isDrill ? colors.drill : colors[severityMeta[b.severity].tone.fg] }}>
          {b.isDrill ? 'Drill' : severityMeta[b.severity].label}
        </Text>
        {` · ${b.channels.map((c) => channelMeta[c].label).join(', ')} · `}
        <Text variant="monoSmall" tone="textTertiary" dense>
          {b.incidentDisplayId}
        </Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: gutter, paddingVertical: space[4], gap: space[1] },
  titleLine: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space[3] },
  shrink: { flexShrink: 1 },
  sep: { height: StyleSheet.hairlineWidth },
});
