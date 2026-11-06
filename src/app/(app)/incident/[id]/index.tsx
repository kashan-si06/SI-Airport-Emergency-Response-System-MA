import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { useIncident, useIncidentChecklists, useRecipients } from '@/api/queries';
import type { IncidentDetail } from '@/api/schemas';
import { can, useCan, useSession } from '@/auth/session';
import { ChecklistView } from '@/features/checklists/checklist-view';
import { submitResponderStatus } from '@/features/incidents/acknowledge';
import { AttachmentsGrid } from '@/features/incidents/attachments-grid';
import { DepartmentProgressList } from '@/features/incidents/department-progress';
import { TeamList } from '@/features/incidents/team-list';
import { Timeline } from '@/features/incidents/timeline';
import { isLive, responderMeta, titleWithoutPlace } from '@/domain/presentation';
import { formatDateTime, formatElapsed } from '@/domain/time';
import { useSensitiveScreen } from '@/lib/screen-guard';
import { useNow } from '@/lib/use-now';
import { selectPendingAck, useOutbox } from '@/offline/outbox';
import { useColors } from '@/theme/theme';
import { gutter, space } from '@/theme/tokens';
import { useActionMenu, type MenuAction } from '@/ui/action-menu';
import { Button, IconButton } from '@/ui/button';
import { EmptyState, ErrorState, SkeletonRows } from '@/ui/feedback';
import { Icon } from '@/ui/icon';
import { KeyValue, Row, Section } from '@/ui/list';
import { PageHead } from '@/ui/page-head';
import { ScrollScreen } from '@/ui/screen';
import { UnderlineTabs } from '@/ui/segmented';
import { DrillTag, SeverityTag, StatusTag, Tag } from '@/ui/tags';
import { Text } from '@/ui/text';

type TabKey = 'summary' | 'timeline' | 'checklist' | 'team' | 'files';

export default function IncidentDetailScreen() {
  const { id, tab: initialTab } = useLocalSearchParams<{ id: string; tab?: TabKey }>();
  const me = useSession((s) => s.me);
  const incident = useIncident(id);
  const canChecklist = useCan('checklist.execute');
  const checklists = useIncidentChecklists(id, canChecklist);
  const team = useRecipients(id, 'mine');
  const [tab, setTab] = useState<TabKey>(initialTab ?? 'summary');
  const menu = useActionMenu('Incident actions');

  useSensitiveScreen(!!incident.data?.sensitive, `incident-${id}`);

  const d = incident.data;
  const actions = d ? buildActions(d, me) : [];

  return (
    <>
      <Stack.Screen
        options={{
          title: d?.displayId ?? '',
          headerRight: () =>
            actions.length > 0 ? <IconButton icon="ellipsis" label="Incident actions" onPress={() => menu.show(actions)} /> : null,
        }}
      />
      {menu.element}
      {!d ? (
        incident.isPending ? (
          <View style={{ paddingTop: space[6] }}>
            <SkeletonRows rows={5} />
          </View>
        ) : (
          <ErrorState error={incident.error} onRetry={() => void incident.refetch()} />
        )
      ) : (
        <ScrollScreen refreshing={incident.isRefetching} onRefresh={() => void incident.refetch()}>
          <Header incident={d} />
          <MyStatus incident={d} />
          <UnderlineTabs<TabKey>
            accessibilityLabel="Incident sections"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'summary', label: 'Summary' },
              { value: 'timeline', label: 'Timeline' },
              ...(canChecklist ? [{ value: 'checklist' as const, label: 'Checklist', count: checklists.data?.reduce((s, c) => s + c.tasks.filter((t) => t.status === 'PENDING').length, 0) }] : []),
              { value: 'team', label: 'Team' },
              ...(d.attachments.length > 0 ? [{ value: 'files' as const, label: 'Files' }] : []),
            ]}
          />
          <View style={styles.tabBody}>
            {tab === 'summary' ? <Summary incident={d} /> : null}
            {tab === 'timeline' ? <Timeline entries={d.timeline} /> : null}
            {tab === 'checklist' ? (
              checklists.data ? (
                checklists.data.length > 0 ? (
                  checklists.data.map((c) => (
                    <ChecklistView key={c.id} checklist={c} notificationId={d.id} editable={isLive(d.status) && can(me, 'checklist.execute')} />
                  ))
                ) : (
                  <EmptyState icon="checklist" title="No checklist for your department" message="AOCC has not assigned an SOP checklist to your department for this incident." />
                )
              ) : checklists.isPending ? (
                <SkeletonRows rows={4} />
              ) : (
                <ErrorState error={checklists.error} onRetry={() => void checklists.refetch()} />
              )
            ) : null}
            {tab === 'team' ? (
              team.data ? (
                team.data.length > 0 ? (
                  <TeamList recipients={team.data} />
                ) : (
                  <EmptyState icon="people" title="No colleagues alerted" message="No one else from your department was notified for this incident." />
                )
              ) : team.isPending ? (
                <SkeletonRows rows={4} />
              ) : (
                <ErrorState error={team.error} onRetry={() => void team.refetch()} />
              )
            ) : null}
            {tab === 'files' ? <AttachmentsGrid items={d.attachments} /> : null}
          </View>
        </ScrollScreen>
      )}
    </>
  );
}

function buildActions(d: IncidentDetail, me: ReturnType<typeof useSession.getState>['me']): MenuAction[] {
  const live = isLive(d.status);
  const a: MenuAction[] = [];
  if (can(me, 'command.view') || can(me, 'command.view.dept')) {
    a.push({ label: 'Command view', icon: 'command', onPress: () => router.push({ pathname: '/incident/[id]/command', params: { id: d.id } }) });
  }
  if (live && can(me, 'incident.update')) {
    a.push({ label: 'Send update', icon: 'send', onPress: () => router.push({ pathname: '/incident/[id]/update', params: { id: d.id, type: 'UPDATE' } }) });
    if (!d.aeocActive && d.availableStages.some((s) => s.updateType === 'AEOC_ACTIVATION')) {
      a.push({ label: 'Activate AEOC', icon: 'aeoc', onPress: () => router.push({ pathname: '/incident/[id]/update', params: { id: d.id, type: 'AEOC_ACTIVATION' } }) });
    }
    a.push({ label: 'Terminate — all clear', icon: 'checkCircle', onPress: () => router.push({ pathname: '/incident/[id]/update', params: { id: d.id, type: 'TERMINATION' } }) });
  }
  if (live && can(me, 'incident.broadcast')) {
    a.push({ label: 'Broadcast to SPOCs', icon: 'megaphone', onPress: () => router.push({ pathname: '/incident/[id]/broadcast', params: { id: d.id } }) });
  }
  if ((live || d.status === 'TERMINATED') && can(me, 'incident.ignore')) {
    a.push({ label: 'Ignore — retract alert', icon: 'unable', destructive: true, onPress: () => router.push({ pathname: '/incident/[id]/ignore', params: { id: d.id } }) });
  }
  return a;
}

function Header({ incident: d }: { incident: IncidentDetail }) {
  const nowMs = useNow();
  const live = isLive(d.status);
  return (
    <PageHead
      title={titleWithoutPlace(d)}
      subtitle={d.location}
      meta={live ? formatElapsed(d.createdAt, nowMs) : formatDateTime(d.createdAt)}
      status={
        <>
          {d.isDrill ? <DrillTag /> : <SeverityTag severity={d.severity} solid={live} />}
          {!live ? <StatusTag status={d.status} /> : null}
          {d.aeocActive ? <Tag label="AEOC active" fg="caution" /> : null}
        </>
      }
    />
  );
}

/** The user's own response — the first thing a responder needs (MOB-INC-04). */
function MyStatus({ incident: d }: { incident: IncidentDetail }) {
  const colors = useColors();
  const queued = useOutbox(selectPendingAck(d.id));
  const live = isLive(d.status);
  if (d.my.recipientStatus === 'NOT_NOTIFIED' && !d.my.responderStatus) return <View />;

  if (d.my.pendingAckUpdateId && live) {
    return (
      <View style={styles.myBox}>
        <Text variant="title2">Your acknowledgement is required</Text>
        <Button
          label="Acknowledge"
          icon="acknowledge"
          size="lg"
          fullWidth
          hapticStyle="heavy"
          onPress={() =>
            submitResponderStatus({ notificationId: d.id, displayId: d.displayId, updateId: d.my.pendingAckUpdateId, status: 'ACKNOWLEDGED' })
          }
        />
      </View>
    );
  }

  if (!d.my.responderStatus) return <View />;
  const m = responderMeta[d.my.responderStatus];
  return (
    <View style={styles.myRow}>
      <Row
        leading={queued ? <Icon name="sync" size={20} color={colors.caution} /> : undefined}
        title={`You: ${m.label}`}
        subtitle={queued ? 'Not yet received by AOCC — sends automatically' : d.my.unableReason ?? 'Tap to update your status'}
        onPress={live ? () => router.push({ pathname: '/incident/[id]/status', params: { id: d.id } }) : undefined}
      />
    </View>
  );
}

function Summary({ incident: d }: { incident: IncidentDetail }) {
  const colors = useColors();
  // The title is already on screen, and the location sits under it.
  const facts = d.facts.filter((f) => f.label !== 'Location');
  return (
    <View>
      <View style={styles.message}>
        {!d.title.includes(d.heading) ? <Text variant="title2">{d.heading}</Text> : null}
        <Text variant="body">{d.body}</Text>
      </View>

      {d.flight ? (
        <Section title="Flight">
          <KeyValue label="Flight" value={d.flight.number} mono />
          <KeyValue label="Operator" value={d.flight.operator} />
          <KeyValue label="Aircraft type" value={d.flight.aircraftType} mono />
          <KeyValue label="Sector" value={d.flight.sector} mono />
          <KeyValue label="Scheduled" value={d.flight.scheduledAt ? formatDateTime(d.flight.scheduledAt) : null} />
          <KeyValue label="Persons on board" value={d.flight.personsOnBoard?.toString()} />
        </Section>
      ) : null}

      {facts.length > 0 ? (
        <Section title="Reported details">
          {facts.map((f) => (
            <KeyValue key={f.label} label={f.label} value={f.value} />
          ))}
        </Section>
      ) : null}

      {d.incidentCommander ? (
        <Section title="Incident commander">
          <Row
            title={d.incidentCommander.name}
            subtitle={d.incidentCommander.designation}
            trailing={d.incidentCommander.phone ? <Icon name="phone" size={18} color={colors.text} /> : undefined}
            chevron={false}
            onPress={d.incidentCommander.phone ? () => void Linking.openURL(`tel:${d.incidentCommander!.phone}`) : undefined}
          />
        </Section>
      ) : null}

      {d.departments.length > 0 ? (
        <Section title="Departments">
          <DepartmentProgressList items={d.departments} plain />
        </Section>
      ) : null}

      {d.sourceFieldReportId ? (
        <Section>
          <Row
            title="Raised from a field report"
            onPress={() => router.push({ pathname: '/field-report/[id]', params: { id: d.sourceFieldReportId! } })}
          />
        </Section>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  myBox: { marginTop: space[3], paddingHorizontal: gutter, paddingVertical: space[4], gap: space[3] },
  myRow: { marginTop: space[3], overflow: 'hidden' },
  tabBody: { paddingTop: space[4] },
  message: { paddingHorizontal: gutter, paddingVertical: space[4], gap: space[2] },
});
