import type { IncidentSummary, Severity } from '@/api/schemas';

import { alertKey, nextAlertToOpen } from './alert-takeover';

const incident = (id: string, severity: Severity, stage = 'up-1') =>
  ({ id, severity, my: { pendingAckUpdateId: stage } }) as unknown as IncidentSummary;

describe('nextAlertToOpen', () => {
  it('returns nothing when no alert is pending', () => {
    expect(nextAlertToOpen([], new Set())).toBeNull();
  });

  it('opens the most severe pending alert first', () => {
    const next = nextAlertToOpen([incident('low', 'LOW'), incident('crit', 'CRITICAL'), incident('high', 'HIGH')], new Set());
    expect(next?.id).toBe('crit');
  });

  it('does not reopen an alert already shown', () => {
    const shown = incident('a', 'HIGH');
    expect(nextAlertToOpen([shown], new Set([alertKey(shown)]))).toBeNull();
  });

  it('moves on to the next alert once one has been shown', () => {
    const crit = incident('crit', 'CRITICAL');
    expect(nextAlertToOpen([crit, incident('low', 'LOW')], new Set([alertKey(crit)]))?.id).toBe('low');
  });

  it('alerts again when the same incident opens a new stage', () => {
    const shown = new Set([alertKey(incident('a', 'HIGH', 'up-1'))]);
    expect(nextAlertToOpen([incident('a', 'HIGH', 'up-2')], shown)?.id).toBe('a');
  });
});
