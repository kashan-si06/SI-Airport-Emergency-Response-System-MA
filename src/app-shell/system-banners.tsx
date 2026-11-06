import { router } from 'expo-router';

import { useHome } from '@/api/queries';
import { isDegraded, usePermissionHealth } from '@/notifications/permission-health';
import { selectFailed, selectPendingCount, useOutbox } from '@/offline/outbox';
import { useIsOnline } from '@/offline/sync';
import { Banner } from '@/ui/feedback';

/**
 * At most one system banner at a time, most urgent first (M-14). Stacked
 * warnings get ignored; a single clear one gets read.
 */
export function SystemBanners({ showDrill = true }: { showDrill?: boolean }) {
  const online = useIsOnline();
  const health = usePermissionHealth((s) => s.health);
  const pending = useOutbox(selectPendingCount);
  const failedCount = useOutbox((s) => selectFailed(s).length);
  const drill = useHome().data?.drillActive ?? false;

  if (!online) {
    return (
      <Banner
        tone="caution"
        icon="wifiOff"
        title="You’re offline"
        message={pending > 0 ? `${pending} update${pending > 1 ? 's' : ''} will send when you reconnect.` : undefined}
      />
    );
  }
  if (failedCount > 0) {
    return (
      <Banner
        tone="danger"
        icon="warning"
        title={`${failedCount} update${failedCount > 1 ? 's' : ''} not accepted`}
        action={{ label: 'Review', onPress: () => router.push('/account/outbox') }}
      />
    );
  }
  if (isDegraded(health)) {
    return (
      <Banner
        tone="danger"
        icon="bellSlash"
        title="Alerts may not reach you"
        action={{ label: 'Fix', onPress: () => router.push('/account/notifications') }}
      />
    );
  }
  if (showDrill && drill) {
    return <Banner tone="drill" icon="drill" title="Drill in progress" />;
  }
  return null;
}
