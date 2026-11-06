import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useColors } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import { ChoiceGroup } from './choice';
import { Icon, type IconName } from './icon';
import { Text } from './text';

type Item = { value: string; label: string; description?: string; icon?: IconName; keywords?: string };

type Props = {
  label: string;
  items: Item[];
  value: string | null;
  onChange: (v: string) => void;
  placeholder: string;
  limit?: number;
  error?: string | null;
};

/** Inline type-to-filter list. Replaces dropdowns for long reference lists. */
export function SearchPicker({ label, items, value, onChange, placeholder, limit = 8, error }: Props) {
  const colors = useColors();
  const [q, setQ] = useState('');
  const selected = items.find((i) => i.value === value) ?? null;

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? items.filter((i) => `${i.label} ${i.description ?? ''} ${i.keywords ?? ''}`.toLowerCase().includes(needle))
      : items;
    const list = filtered.slice(0, limit);
    // Keep the current selection visible even when filtered out.
    if (selected && !list.some((i) => i.value === selected.value)) list.unshift(selected);
    return list;
  }, [q, items, limit, selected]);

  const more = (q ? items.filter((i) => `${i.label} ${i.description ?? ''} ${i.keywords ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())).length : items.length) - limit;

  return (
    <View style={{ gap: space[2] }}>
      <Text variant="overline" tone="textSecondary">
        {label}
        <Text variant="footnote" tone="danger"> *</Text>
      </Text>
      <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}>
        <Icon name="search" size={16} color={colors.textTertiary} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel={`Search ${label}`}
          style={[typography.body, styles.input, { color: colors.text }]}
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>
      {results.length > 0 ? (
        <ChoiceGroup<string> accessibilityLabel={label} value={value} onChange={onChange} options={results} />
      ) : (
        <Text variant="footnote" tone="textTertiary">
          No match for “{q}”.
        </Text>
      )}
      {more > 0 ? (
        <Text variant="caption" tone="textTertiary">
          {more} more — type to narrow
        </Text>
      ) : null}
      {error ? (
        <Text variant="footnote" tone="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radius.md,
    paddingHorizontal: space[3],
    minHeight: 52,
  },
  input: { flex: 1, paddingVertical: space[2] },
});
