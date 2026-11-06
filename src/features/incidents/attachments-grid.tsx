import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Attachment } from '@/api/schemas';
import { formatTime } from '@/domain/time';
import { useColors } from '@/theme/theme';
import { gutter, space } from '@/theme/tokens';
import { Icon } from '@/ui/icon';
import { ImageBox } from '@/ui/image-box';
import { Text } from '@/ui/text';

export function AttachmentsGrid({ items, emptyMessage }: { items: Attachment[]; emptyMessage?: string }) {
  const colors = useColors();
  if (items.length === 0) {
    return (
      <Text variant="subhead" tone="textSecondary" style={styles.empty}>
        {emptyMessage ?? 'Photos from checklists and field reports appear here.'}
      </Text>
    );
  }
  return (
    <View style={styles.grid}>
      {items.map((a) => (
        <Pressable
          key={a.id}
          accessibilityRole="imagebutton"
          accessibilityLabel={`${a.caption ?? 'Photo'}${a.uploadedBy ? ` by ${a.uploadedBy.name}` : ''}${a.takenAt ? ` at ${formatTime(a.takenAt)}` : ''}`}
          onPress={() => router.push({ pathname: '/attachment', params: { url: a.url, caption: a.caption ?? '', by: a.uploadedBy?.name ?? '', at: a.takenAt ?? '' } })}
          style={[styles.cell, { borderColor: colors.border, backgroundColor: colors.surfaceSunken }]}>
          {a.mime.startsWith('image/') ? (
            <ImageBox flush source={{ uri: a.thumbnailUrl ?? a.url }} />
          ) : (
            <View style={styles.file}>
              <Icon name="doc" size={24} color={colors.textTertiary} />
            </View>
          )}
          <View style={[styles.caption, { backgroundColor: colors.scrim }]}>
            <Text variant="monoSmall" style={{ color: '#fff' }} numberOfLines={1} dense>
              {a.takenAt ? formatTime(a.takenAt) : ''} {a.uploadedBy?.name.split(' ')[0] ?? ''}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, paddingHorizontal: gutter },
  cell: { width: '32.6%', aspectRatio: 1, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  empty: { paddingHorizontal: gutter, paddingTop: space[4] },
  file: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  caption: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 4, paddingVertical: 2 },
});
