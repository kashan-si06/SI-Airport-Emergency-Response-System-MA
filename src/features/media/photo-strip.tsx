import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { haptic } from '@/lib/haptics';
import type { LocalAttachment } from '@/offline/outbox';
import { useColors } from '@/theme/theme';
import { space } from '@/theme/tokens';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { toast } from '@/ui/toast';

import { capturePhoto } from './capture';

type Props = {
  photos: LocalAttachment[];
  onChange: (photos: LocalAttachment[]) => void;
  max: number;
  required?: boolean;
};

/** Horizontal capture strip: camera tile + thumbnails with remove. */
export function PhotoStrip({ photos, onChange, max, required }: Props) {
  const colors = useColors();

  const add = async (source: 'camera' | 'library') => {
    const r = await capturePhoto(source);
    if (r.ok) {
      haptic.success();
      onChange([...photos, r.attachment]);
    } else if (r.reason === 'permission') {
      toast.caution('Camera access is off', 'Enable it in Settings › ENS › Camera.');
    } else if (r.reason === 'error') {
      toast.danger('Photo could not be saved', r.message);
    }
  };

  return (
    <View style={{ gap: space[2] }}>
      <View style={styles.labelRow}>
        <Text variant="footnote" tone="textSecondary" weight="500">
          Photos{required ? <Text variant="footnote" tone="danger"> *</Text> : null}
        </Text>
        <Text variant="monoSmall" tone="textTertiary">
          {photos.length}/{max}
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {photos.length < max ? (
          <>
            <Tile icon="camera" label="Camera" onPress={() => void add('camera')} />
            <Tile icon="photo" label="Library" onPress={() => void add('library')} />
          </>
        ) : null}
        {photos.map((p, i) => (
          <View key={p.localUri} style={[styles.thumb, { borderColor: colors.border }]}>
            <Image source={{ uri: p.localUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove photo ${i + 1}`}
              hitSlop={8}
              onPress={() => onChange(photos.filter((x) => x !== p))}
              style={[styles.remove, { backgroundColor: colors.scrim }]}>
              <Icon name="close" size={14} color="#fff" />
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Tile({ icon, label, onPress }: { icon: 'camera' | 'photo'; label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Add photo from ${label.toLowerCase()}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.thumb,
        styles.tile,
        { borderColor: colors.borderStrong, backgroundColor: pressed ? colors.surfacePressed : colors.surfaceSunken },
      ]}>
      <Icon name={icon} size={22} color={colors.accent} />
      <Text variant="caption" tone="accent" weight="500">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  row: { gap: space[2] },
  thumb: { width: 88, height: 88, borderWidth: StyleSheet.hairlineWidth * 2, overflow: 'hidden' },
  tile: { alignItems: 'center', justifyContent: 'center', gap: 4, borderStyle: 'dashed' },
  remove: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
});
