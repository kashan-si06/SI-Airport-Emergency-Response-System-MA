import { durationBetween, formatDate, formatElapsed, formatRelative, formatTime, now, syncServerTime } from '@/domain/time';

describe('time formatting (IST, PRD §5.10)', () => {
  it('returns an em dash for empty input', () => {
    expect(formatTime(null)).toBe('—');
    expect(formatTime(undefined)).toBe('—');
    expect(formatDate('')).toBe('—');
  });

  it('formats a UTC instant in India Standard Time (UTC+5:30)', () => {
    // 2026-11-04T08:30:00Z = 14:00 IST
    expect(formatTime('2026-11-04T08:30:00Z')).toBe('14:00');
  });

  it('formats an elapsed clock mm:ss and h:mm:ss', () => {
    const from = '2026-11-04T00:00:00Z';
    expect(formatElapsed(from, Date.parse(from) + 65 * 1000)).toBe('01:05');
    expect(formatElapsed(from, Date.parse(from) + (3600 + 125) * 1000)).toBe('1:02:05');
    // Never negative.
    expect(formatElapsed(from, Date.parse(from) - 10_000)).toBe('00:00');
  });

  it('describes recent times relatively', () => {
    const ref = Date.parse('2026-11-04T12:00:00Z');
    expect(formatRelative('2026-11-04T11:59:40Z', ref)).toBe('just now');
    expect(formatRelative('2026-11-04T11:55:00Z', ref)).toBe('5 min ago');
    expect(formatRelative('2026-11-04T10:00:00Z', ref)).toBe('2 h ago');
  });

  it('formats a human duration between two instants', () => {
    expect(durationBetween('2026-11-04T00:00:00Z', '2026-11-04T00:00:45Z')).toBe('45s');
    expect(durationBetween('2026-11-04T00:00:00Z', '2026-11-04T00:02:05Z')).toBe('2m 5s');
    expect(durationBetween('2026-11-04T00:00:00Z', '2026-11-04T01:30:00Z')).toBe('1h 30m');
  });

  it('corrects the clock by the server offset', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    syncServerTime(future);
    expect(now()).toBeGreaterThan(Date.now() + 30_000);
    syncServerTime(new Date().toISOString()); // reset offset to ~0 for other tests
  });
});
