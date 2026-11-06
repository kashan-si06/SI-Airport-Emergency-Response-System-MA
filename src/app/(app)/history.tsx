import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Platform, RefreshControl, StyleSheet, TextInput, View } from 'react-native';

import { useHistory } from '@/api/queries';
import { IncidentRow } from '@/features/incidents/incident-row';
import { useColors } from '@/theme/theme';
import { gutter, radius, space } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { EmptyState, ErrorState, SkeletonRows } from '@/ui/feedback';
import { AmbientGlow } from '@/ui/hero-glow';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';

/** Past incidents: last 90 days by default, search reaches further back (MOB-INC-06). */
export default function History() {
  const colors = useColors();
  const [input, setInput] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), 350);
    return () => clearTimeout(t);
  }, [input]);

  const history = useHistory(q);
  const items = history.data?.pages.flatMap((p) => p.items) ?? [];

  const searchField =
    Platform.OS === 'ios' ? null : (
      <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}>
        <Icon name="search" size={16} color={colors.textTertiary} />
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="ID, flight, type or location"
          placeholderTextColor={colors.textTertiary}
          style={[typography.body, styles.input, { color: colors.text }]}
          accessibilityLabel="Search incidents"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AmbientGlow />
      <Stack.Screen
        options={{
          headerSearchBarOptions:
            Platform.OS === 'ios'
              ? { placeholder: 'ID, flight, type or location', onChangeText: (e) => setInput(e.nativeEvent.text), hideWhenScrolling: false }
              : undefined,
        }}
      />
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          <View>
            {searchField}
            <Text variant="caption" tone="textTertiary" style={styles.scope}>
              {q ? `Results for “${q}” — all retained history` : 'Last 90 days on this device · search to go further back'}
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator }} />}
        renderItem={({ item }) => (
          <IncidentRow incident={item} />
        )}
        refreshControl={<RefreshControl refreshing={history.isRefetching} onRefresh={() => void history.refetch()} tintColor={colors.textSecondary} />}
        onEndReached={() => history.hasNextPage && !history.isFetchingNextPage && void history.fetchNextPage()}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          history.isPending ? (
            <SkeletonRows rows={4} />
          ) : history.error && !history.data ? (
            <ErrorState error={history.error} onRetry={() => void history.refetch()} />
          ) : (
            <EmptyState icon="history" title={q ? 'No matches' : 'No past incidents'} message={q ? 'Try an incident ID like ID-114343 or a flight number.' : undefined} />
          )
        }
        ListFooterComponent={history.isFetchingNextPage ? <SkeletonRows rows={1} /> : <View style={{ height: space[12] }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    margin: space[4],
    marginBottom: 0,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radius.md,
    paddingHorizontal: space[3],
    minHeight: 52,
  },
  input: { flex: 1, paddingVertical: space[2] },
  scope: { paddingHorizontal: gutter, paddingTop: space[3], paddingBottom: space[2] },
});
