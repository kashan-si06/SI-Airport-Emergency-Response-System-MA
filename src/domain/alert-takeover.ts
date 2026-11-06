import type { IncidentSummary } from '@/api/schemas';

import { byUrgency } from './presentation';

/** One alert stage for one incident. A new stage (e.g. AEOC activation) alerts again. */
export function alertKey(i: IncidentSummary): string {
  return `${i.id}:${i.my.pendingAckUpdateId ?? ''}`;
}

/**
 * Which pending alert should take over the screen next: the most urgent one
 * this session has not already shown. A live emergency always comes before a drill. Closing an alert without responding
 * does not reopen it; it stays pinned on the home screen.
 */
export function nextAlertToOpen(pending: IncidentSummary[], shown: ReadonlySet<string>): IncidentSummary | null {
  return byUrgency(pending.filter((i) => !shown.has(alertKey(i))))[0] ?? null;
}
