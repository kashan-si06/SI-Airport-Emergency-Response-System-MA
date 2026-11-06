import { z } from 'zod';

import { Severity } from '@/api/schemas';

/**
 * Push data contract. Payloads carry identifiers and display text only;
 * incident detail is always fetched over TLS (PRD MOB-PUSH-10). Sensitive
 * types arrive with server-masked title/body (MOB-PUSH-07).
 */
export const PushData = z.object({
  ens: z.literal('1'),
  type: z.enum(['ALERT', 'REALERT', 'UPDATE', 'TERMINATION', 'IGNORE', 'BROADCAST', 'FIELD_REPORT', 'ESCALATION', 'TEST']),
  notificationId: z.string().optional(),
  updateId: z.string().nullable().optional(),
  displayId: z.string().optional(),
  severity: Severity.optional(),
  ackRequired: z.enum(['0', '1']).optional(),
  isDrill: z.enum(['0', '1']).optional(),
  fieldReportId: z.string().optional(),
  testId: z.string().optional(),
});
export type PushData = z.infer<typeof PushData>;

export function parsePushData(raw: unknown): PushData | null {
  const r = PushData.safeParse(raw);
  return r.success ? r.data : null;
}

/** Android channel ids — created once; only name/description may change later. */
export const CHANNELS = {
  critical: 'ens_critical_v1',
  high: 'ens_high_v1',
  standard: 'ens_standard_v1',
  drill: 'ens_drill_v1',
} as const;

/** iOS/Android interactive categories. Identifiers avoid ':' and '-'. */
export const CATEGORIES = {
  alert: 'ens_alert',
  info: 'ens_info',
} as const;

export const ACTIONS = {
  acknowledge: 'ENS_ACK',
  responding: 'ENS_RESPONDING',
  unable: 'ENS_UNABLE',
} as const;
