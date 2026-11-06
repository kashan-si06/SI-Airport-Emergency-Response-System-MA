import { View } from 'react-native';

import type { ManualTag } from '@/api/schemas';
import { space } from '@/theme/tokens';
import { TextField } from '@/ui/field';

/**
 * `{Tag}` placeholders the operator fills (PRD §5.4). Template wording is
 * fixed; only these incident facts are typed. Mandatory tags block send.
 */
export function ManualTagFields({
  tags,
  values,
  onChange,
  showErrors,
}: {
  tags: ManualTag[];
  values: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  showErrors: boolean;
}) {
  return (
    <View style={{ gap: space[4] }}>
      {tags.map((t) => (
        <TextField
          key={t.key}
          label={t.label}
          required={t.mandatory}
          value={values[t.key] ?? ''}
          onChangeText={(v) => onChange({ ...values, [t.key]: v })}
          maxLength={200}
          placeholder={t.mandatory ? undefined : 'Optional — sent as N/A if blank'}
          error={showErrors && t.mandatory && !(values[t.key] ?? '').trim() ? `${t.label} is required.` : null}
        />
      ))}
    </View>
  );
}

export function missingMandatory(tags: ManualTag[], values: Record<string, string>): string[] {
  return tags.filter((t) => t.mandatory && !(values[t.key] ?? '').trim()).map((t) => t.label);
}

export function initialTagValues(tags: ManualTag[]): Record<string, string> {
  return Object.fromEntries(tags.map((t) => [t.key, t.value ?? '']));
}
