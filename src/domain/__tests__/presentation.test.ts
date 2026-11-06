import { byUrgency, channelOrder, headingWithoutDrillPrefix, isLive, severityMeta, titleWithoutPlace, updateTypeLabel } from '@/domain/presentation';

describe('incident presentation', () => {
  it('treats pre-active lifecycle states as live', () => {
    expect(isLive('ACTIVE')).toBe(true);
    expect(isLive('INITIATED')).toBe(true);
    expect(isLive('DISPATCHING')).toBe(true);
    expect(isLive('CLOSED')).toBe(false);
    expect(isLive('CANCELLED')).toBe(false);
    expect(isLive('TERMINATED')).toBe(false);
  });

  it('ranks severity so Critical sorts first', () => {
    const order = (['LOW', 'CRITICAL', 'MEDIUM', 'HIGH'] as const).slice().sort((a, b) => severityMeta[a].rank - severityMeta[b].rank);
    expect(order).toEqual(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
    expect(severityMeta.CRITICAL.label).toBe('Critical');
  });

  it('sorts incidents live before drill, then by severity, then newest first', () => {
    const incident = (id: string, isDrill: boolean, severity: 'CRITICAL' | 'HIGH' | 'LOW', createdAt: string) => ({ id, isDrill, severity, createdAt });
    const sorted = byUrgency([
      incident('new critical drill', true, 'CRITICAL', '2026-11-04T10:09:00Z'),
      incident('live low', false, 'LOW', '2026-11-04T10:08:00Z'),
      incident('older live critical', false, 'CRITICAL', '2026-11-04T10:00:00Z'),
      incident('newer live critical', false, 'CRITICAL', '2026-11-04T10:05:00Z'),
      incident('live high', false, 'HIGH', '2026-11-04T10:07:00Z'),
    ]);
    expect(sorted.map((i) => i.id)).toEqual(['newer live critical', 'older live critical', 'live high', 'live low', 'new critical drill']);
  });

  it('does not repeat the place in a title shown beside its location', () => {
    expect(titleWithoutPlace({ title: 'Fire alarm — Terminal 1', location: 'Terminal 1, Gate 14' })).toBe('Fire alarm');
    expect(titleWithoutPlace({ title: 'Engine fire — AI101', location: 'Taxiway B' })).toBe('Engine fire — AI101');
    expect(titleWithoutPlace({ title: 'Bomb threat', location: null })).toBe('Bomb threat');
  });

  it('strips the repeated drill prefix only', () => {
    expect(headingWithoutDrillPrefix('DRILL – DRILL – DRILL – Medical emergency')).toBe('Medical emergency');
    expect(headingWithoutDrillPrefix('Drill bit found on runway')).toBe('Drill bit found on runway');
  });

  it('lists channels push-first (fastest first)', () => {
    expect(channelOrder[0]).toBe('PUSH');
    expect(new Set(channelOrder).size).toBe(channelOrder.length);
  });

  it('labels every update type', () => {
    expect(updateTypeLabel.TERMINATION).toBeTruthy();
    expect(updateTypeLabel.IGNORE).toBeTruthy();
    expect(updateTypeLabel.AEOC_ACTIVATION).toBeTruthy();
  });
});
