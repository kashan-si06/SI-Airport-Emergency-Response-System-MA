import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { gutter, space } from '@/theme/tokens';

import { Text } from './text';

type PageHeadProps = {
  title: string;
  /** Status words above the title. */
  status?: ReactNode;
  /** At the end of the status line, such as a running clock. */
  meta?: string;
  subtitle?: string | null;
  /** An identifier or timestamp read back over a radio. */
  id?: string | null;
  /** A smaller title, for forms where the fields matter more. */
  compact?: boolean;
  children?: ReactNode;
};

/** How every screen below the tabs opens, so an incident, a report and a form all begin the same way. */
export function PageHead({ title, status, meta, subtitle, id, compact, children }: PageHeadProps) {
  return (
    <View style={styles.head}>
      {status || meta ? (
        <View style={styles.statusLine}>
          {status}
          {meta ? (
            <Text variant="subhead" tone="textSecondary" dense style={styles.meta}>
              {meta}
            </Text>
          ) : null}
        </View>
      ) : null}
      <Text variant={compact ? 'title1' : 'largeTitle'} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? (
        <Text variant="subhead" tone="textSecondary">
          {subtitle}
        </Text>
      ) : null}
      {id ? (
        <Text variant="mono" tone="textTertiary">
          {id}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: gutter, paddingTop: space[3], paddingBottom: space[4], gap: space[2] },
  statusLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space[3] },
  meta: { marginLeft: 'auto', fontVariant: ['tabular-nums'] },
});
