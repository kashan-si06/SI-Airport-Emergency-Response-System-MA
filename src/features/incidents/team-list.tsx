import { Linking, Pressable, StyleSheet, View } from 'react-native';

import type { Recipient } from '@/api/schemas';
import { channelMeta, recipientStatusMeta, responderMeta } from '@/domain/presentation';
import { formatTime } from '@/domain/time';
import { useColors } from '@/theme/theme';
import { gutter, space } from '@/theme/tokens';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';

const order = { NO_RESPONSE: 0, FAILED: 1, NOTIFIED: 2, NOT_NOTIFIED: 3, ACKNOWLEDGED: 4 } as const;

/**
 * Recipient acknowledgement list — who has / hasn't responded, how, and
 * tap-to-call (MOB-INC-03 Team, MOB-INC-05). Non-responders sort first.
 */
export function TeamList({ recipients, plain }: { recipients: Recipient[]; /** Inside a Section that already provides the surface. */ plain?: boolean }) {
  const colors = useColors();
  const sorted = [...recipients].sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name));

  return (
    <View style={[styles.wrap, plain ? null : styles.inset]}>
      {sorted.map((r, i) => {
        const st = r.responderStatus ? responderMeta[r.responderStatus] : null;
        const rs = recipientStatusMeta[r.status];
        // Only those AOCC needs to chase carry colour.
        const tone = st ? (st.fg === 'caution' ? colors.caution : colors.textSecondary) : colors[rs.fg];
        return (
          <View
            key={r.id}
            style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator }]}
            accessible
            accessibilityLabel={`${r.name}, ${st ? st.label : rs.label}${r.ackAt ? ` at ${formatTime(r.ackAt)}` : ''}`}>
            <View style={styles.main}>
              <Text variant="body" numberOfLines={1}>
                {r.name}
                {r.external ? <Text variant="caption" tone="textTertiary">{'  EXT'}</Text> : null}
              </Text>
              <Text variant="footnote" tone="textSecondary" numberOfLines={1}>
                {[r.designation, r.department?.code].filter(Boolean).join(' · ') || '—'}
              </Text>
              {r.unableReason ? (
                <Text variant="caption" tone="caution" numberOfLines={2}>
                  {r.unableReason}
                </Text>
              ) : null}
            </View>
            <View style={styles.status}>
              <Text variant="footnote" style={{ color: tone }} dense>
                {st ? st.short : rs.label}
              </Text>
              <Text variant="caption" tone="textTertiary" dense numberOfLines={1}>
                {r.ackChannel
                  ? `${channelMeta[r.ackChannel].label} · ${formatTime(r.ackAt)}`
                  : r.channelsAttempted.slice(0, 4).map((c) => channelMeta[c].label).join(', ')}
              </Text>
            </View>
            {r.phone ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Call ${r.name}`}
                hitSlop={6}
                onPress={() => void Linking.openURL(`tel:${r.phone}`)}
                style={({ pressed }) => [styles.call, { opacity: pressed ? 0.6 : 1 }]}>
                <Icon name="phone" size={16} color={colors.accent} />
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  inset: { overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: gutter, paddingVertical: space[3], minHeight: 60 },
  main: { flex: 1, gap: 1 },
  status: { alignItems: 'flex-end', gap: 2, maxWidth: '38%' },
  call: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
