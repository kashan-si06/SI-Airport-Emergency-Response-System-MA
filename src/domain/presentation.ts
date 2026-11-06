import type {
  Channel,
  DeptStatus,
  IncidentStatus,
  RecipientStatus,
  ResponderStatus,
  Severity,
  TaskStatus,
  UpdateType,
} from '@/api/schemas';
import type { Palette } from '@/theme/tokens';
import type { IconName } from '@/ui/icon';

type Tone = { fg: keyof Palette; bg: keyof Palette };

export const severityMeta: Record<Severity, { label: string; icon: IconName; tone: Tone; rank: number }> = {
  CRITICAL: { label: 'Critical', icon: 'critical', tone: { fg: 'critical', bg: 'criticalMuted' }, rank: 0 },
  HIGH: { label: 'High', icon: 'high', tone: { fg: 'high', bg: 'highMuted' }, rank: 1 },
  MEDIUM: { label: 'Medium', icon: 'medium', tone: { fg: 'medium', bg: 'mediumMuted' }, rank: 2 },
  LOW: { label: 'Low', icon: 'low', tone: { fg: 'low', bg: 'lowMuted' }, rank: 3 },
};

export const incidentStatusMeta: Record<IncidentStatus, { label: string; tone: Tone }> = {
  PENDING_VALIDATION: { label: 'Pending validation', tone: { fg: 'caution', bg: 'cautionMuted' } },
  INITIATED: { label: 'Initiated', tone: { fg: 'info', bg: 'infoMuted' } },
  DISPATCHING: { label: 'Dispatching', tone: { fg: 'info', bg: 'infoMuted' } },
  ACTIVE: { label: 'Active', tone: { fg: 'danger', bg: 'dangerMuted' } },
  TERMINATED: { label: 'Terminated', tone: { fg: 'success', bg: 'successMuted' } },
  CLOSED: { label: 'Closed', tone: { fg: 'textSecondary', bg: 'surfaceSunken' } },
  CANCELLED: { label: 'Cancelled', tone: { fg: 'textSecondary', bg: 'surfaceSunken' } },
  REJECTED: { label: 'Rejected', tone: { fg: 'textSecondary', bg: 'surfaceSunken' } },
};

export const updateTypeLabel: Record<UpdateType, string> = {
  INITIAL: 'Initiated',
  UPDATE: 'Update',
  AEOC_ACTIVATION: 'AEOC activation',
  TERMINATION: 'Termination',
  IGNORE: 'Ignore — retracted',
  CUSTOM: 'Custom stage',
  BROADCAST: 'Broadcast',
};

export const responderMeta: Record<ResponderStatus, { label: string; short: string; icon: IconName; fg: keyof Palette }> = {
  ACKNOWLEDGED: { label: 'Acknowledged', short: 'Ack', icon: 'acknowledge', fg: 'success' },
  RESPONDING: { label: 'Responding', short: 'En route', icon: 'responding', fg: 'info' },
  ON_SCENE: { label: 'On scene', short: 'On scene', icon: 'onScene', fg: 'success' },
  UNABLE: { label: 'Unable to respond', short: 'Unable', icon: 'unable', fg: 'caution' },
};

export const recipientStatusMeta: Record<RecipientStatus, { label: string; fg: keyof Palette }> = {
  NOT_NOTIFIED: { label: 'For information', fg: 'textSecondary' },
  NOTIFIED: { label: 'Awaiting ack', fg: 'caution' },
  ACKNOWLEDGED: { label: 'Acknowledged', fg: 'success' },
  NO_RESPONSE: { label: 'No response', fg: 'danger' },
  FAILED: { label: 'Delivery failed', fg: 'danger' },
};

export const deptStatusMeta: Record<DeptStatus, { label: string; fg: keyof Palette }> = {
  PENDING: { label: 'Pending', fg: 'textTertiary' },
  IN_PROGRESS: { label: 'In progress', fg: 'info' },
  DEPLOYED: { label: 'Deployed', fg: 'caution' },
  COMPLETED: { label: 'Completed', fg: 'success' },
};

export const taskStatusMeta: Record<TaskStatus, { label: string; icon: IconName; fg: keyof Palette }> = {
  PENDING: { label: 'Pending', icon: 'circle', fg: 'textTertiary' },
  COMPLETED: { label: 'Completed', icon: 'checkCircle', fg: 'success' },
  SKIPPED: { label: 'Skipped', icon: 'skip', fg: 'caution' },
  CANCELLED: { label: 'Cancelled', icon: 'close', fg: 'textTertiary' },
};

export const channelMeta: Record<Channel, { label: string; icon: IconName }> = {
  PUSH: { label: 'App', icon: 'push' },
  SMS: { label: 'SMS', icon: 'sms' },
  IVRS: { label: 'Voice', icon: 'ivrs' },
  WHATSAPP: { label: 'WhatsApp', icon: 'whatsapp' },
  EMAIL: { label: 'Email', icon: 'email' },
};

export const channelOrder: Channel[] = ['PUSH', 'SMS', 'IVRS', 'WHATSAPP', 'EMAIL'];

/**
 * Most urgent first: a live event always outranks a drill, then severity, then
 * the most recently raised. Lists sorted by time alone can bury a live critical
 * alert under a drill.
 */
export function byUrgency<T extends { isDrill: boolean; severity: Severity; createdAt: string }>(incidents: readonly T[]): T[] {
  return [...incidents].sort(
    (a, b) =>
      Number(a.isDrill) - Number(b.isDrill) ||
      severityMeta[a.severity].rank - severityMeta[b.severity].rank ||
      Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

/**
 * The title without the place, for screens that show the location on its own line:
 * "Passenger medical emergency — Gate 9" at "Gate 9" reads the place twice.
 */
export function titleWithoutPlace(i: { title: string; location: string | null }): string {
  const place = i.location?.split(',')[0]?.trim();
  const suffix = place ? ` — ${place}` : null;
  return suffix && i.title.endsWith(suffix) ? i.title.slice(0, -suffix.length) : i.title;
}

/** The drill banner already says so, in larger type, on the screens that use this. */
export function headingWithoutDrillPrefix(heading: string): string {
  return heading.replace(/^(DRILL\s*[–-]\s*)+/i, '');
}

export function isLive(status: IncidentStatus): boolean {
  return status === 'ACTIVE' || status === 'INITIATED' || status === 'DISPATCHING';
}
