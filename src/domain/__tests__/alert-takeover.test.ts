import type { IncidentSummary } from '@/api/schemas';
import { alertKey, nextAlertToOpen } from '@/domain/alert-takeover';

const alert = (id: string, severity: IncidentSummary['severity'], isDrill = false) =>
  ({ id, severity, isDrill, createdAt: '2026-11-04T10:00:00Z', my: { pendingAckUpdateId: 'u1' } }) as unknown as IncidentSummary;

describe('alert takeover', () => {
  it('opens a live alert before a more severe drill', () => {
    expect(nextAlertToOpen([alert('drill', 'CRITICAL', true), alert('live', 'LOW')], new Set())?.id).toBe('live');
  });

  it('does not reopen an alert already shown, until a new stage arrives', () => {
    const shown = new Set([alertKey(alert('a', 'HIGH'))]);
    expect(nextAlertToOpen([alert('a', 'HIGH')], shown)).toBeNull();
    const newStage = { ...alert('a', 'HIGH'), my: { pendingAckUpdateId: 'u2' } } as unknown as IncidentSummary;
    expect(nextAlertToOpen([newStage], shown)?.id).toBe('a');
  });
});
