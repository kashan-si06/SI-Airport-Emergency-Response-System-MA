import { Platform, Switch } from 'react-native';

import { newIdempotencyKey } from '@/api/client';
import { qk } from '@/api/queries';
import { queryClient } from '@/api/query-client';
import type { Home, Me } from '@/api/schemas';
import { haptic } from '@/lib/haptics';
import { useOutbox } from '@/offline/outbox';
import { useColors } from '@/theme/theme';
import { Row } from '@/ui/list';

/**
 * On/off-duty switch (PRD MOB-AVL-01). Off-duty users still receive
 * Critical and All-Station alerts, and any template not limited to people on duty.
 */
export function DutyRow({ onDuty }: { onDuty: boolean }) {
  const colors = useColors();

  const toggle = (value: boolean) => {
    haptic.light();
    queryClient.setQueryData<Home>(qk.home, (h) => (h ? { ...h, onDuty: value } : h));
    queryClient.setQueryData<Me>(qk.me, (m) => (m ? { ...m, onDuty: value } : m));
    useOutbox.getState().enqueue({ kind: 'duty', key: newIdempotencyKey(), payload: { onDuty: value } });
  };

  return (
    <Row
      title="On duty"
      subtitle={onDuty ? null : 'Off duty. Critical and all-station alerts still reach you.'}
      chevron={false}
      trailing={
        <Switch
          value={onDuty}
          onValueChange={toggle}
          accessibilityLabel="On duty"
          trackColor={{ false: colors.borderStrong, true: colors.accent }}
          thumbColor={Platform.OS === 'android' ? colors.surfaceRaised : undefined}
          ios_backgroundColor={colors.borderStrong}
        />
      }
    />
  );
}
