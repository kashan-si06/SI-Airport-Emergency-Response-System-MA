import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDateTime } from '@/domain/time';
import { gutter, space } from '@/theme/tokens';
import { IconButton } from '@/ui/button';
import { Text } from '@/ui/text';

/** Full-screen evidence viewer; always dark for photo fidelity. */
export default function AttachmentViewer() {
  const { url, caption, by, at } = useLocalSearchParams<{ url: string; caption?: string; by?: string; at?: string }>();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <Image source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit="contain" accessibilityLabel={caption || 'Attachment'} />
      <View style={[styles.top, { paddingTop: insets.top + space[2] }]}>
        <View style={{ flex: 1 }} />
        <IconButton icon="close" label="Close" onPress={() => router.back()} />
      </View>
      {caption || by || at ? (
        <View style={[styles.bottom, { paddingBottom: insets.bottom + space[4] }]}>
          {caption ? <Text variant="body" style={{ color: '#fff' }}>{caption}</Text> : null}
          <Text variant="footnote" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {[by, at ? formatDateTime(at) : null].filter(Boolean).join('  ·  ')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  top: { flexDirection: 'row', paddingHorizontal: space[3] },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: gutter, paddingVertical: space[4], gap: space[1], backgroundColor: 'rgba(0,0,0,0.6)' },
});
