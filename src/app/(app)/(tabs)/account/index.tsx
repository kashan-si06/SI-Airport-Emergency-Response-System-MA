import { router } from 'expo-router';

import { useMe } from '@/api/queries';
import { useSession } from '@/auth/session';
import { confirm } from '@/lib/confirm';
import { isDegraded, usePermissionHealth } from '@/notifications/permission-health';
import { selectFailed, useOutbox } from '@/offline/outbox';
import { heroes, HeroScreen } from '@/ui/hero-screen';
import { ImageBox } from '@/ui/image-box';
import { Row, Section } from '@/ui/list';
import { CountBadge } from '@/ui/tags';
import { Text } from '@/ui/text';

export default function AccountHome() {
  const meQuery = useMe();
  const sessionMe = useSession((s) => s.me);
  const me = meQuery.data ?? sessionMe;
  const signOut = useSession((s) => s.signOut);
  const health = usePermissionHealth((s) => s.health);
  const outboxCount = useOutbox((s) => s.items.length);
  const failed = useOutbox((s) => selectFailed(s).length);

  const onSignOut = async () => {
    const pending = useOutbox.getState().items.length;
    const ok = await confirm({
      title: 'Sign out of ENS?',
      message:
        pending > 0
          ? `${pending} action${pending > 1 ? 's have' : ' has'} not reached AOCC yet and will be lost. App alerts stop on this phone; SMS and voice continue.`
          : 'App alerts stop on this phone until you sign in again. SMS and voice alerts continue.',
      confirmLabel: 'Sign out',
      destructive: true,
    });
    if (ok) await signOut();
  };

  return (
    <HeroScreen
      hero={heroes.terminal}
      headline={me?.user.name}
      message={me?.user.designation ?? me?.user.department?.name}
      leading={
        me ? (
          // Holds the place for the person's photo; their initials stand in until there is one.
          <ImageBox size={64}>
            <Text variant="title2">
              {me.user.name
                .split(' ')
                .map((p) => p[0])
                .slice(0, 2)
                .join('')}
            </Text>
          </ImageBox>
        ) : null
      }
      refreshing={meQuery.isRefetching}
      onRefresh={() => void meQuery.refetch()}>
      <Section>
        <Row
          title="Alerts & sound"
          subtitle={isDegraded(health) ? 'Action needed' : null}
          trailing={isDegraded(health) ? <CountBadge count={1} /> : undefined}
          onPress={() => router.push('/account/notifications')}
        />
        <Row title="Devices" onPress={() => router.push('/account/devices')} />
        <Row
          title="Sync queue"
          subtitle={outboxCount ? `${outboxCount} waiting to send` : null}
          trailing={failed ? <CountBadge count={failed} /> : undefined}
          onPress={() => router.push('/account/outbox')}
        />
      </Section>

      <Section>
        <Row title="Contact details" onPress={() => router.push('/account/contacts')} />
        <Row title="Change password" onPress={() => router.push('/account/password')} />
      </Section>

      <Section>
        <Row title="Language" value="English" />
      </Section>

      <Section>
        <Row title="Report a problem" onPress={() => router.push('/account/report-problem')} />
        <Row title="Privacy notice" onPress={() => router.push('/account/privacy')} />
        <Row title="About ENS" onPress={() => router.push('/account/about')} />
      </Section>

      <Section>
        <Row title="Sign out" destructive chevron={false} onPress={() => void onSignOut()} />
      </Section>
    </HeroScreen>
  );
}
