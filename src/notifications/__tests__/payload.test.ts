import { parsePushData } from '@/notifications/payload';

describe('push payload parsing (MOB-PUSH-10)', () => {
  it('accepts a well-formed critical alert payload', () => {
    const data = parsePushData({ ens: '1', type: 'ALERT', notificationId: '114343', displayId: 'ID-114343', severity: 'CRITICAL', ackRequired: '1', isDrill: '0' });
    expect(data).not.toBeNull();
    expect(data?.type).toBe('ALERT');
    expect(data?.severity).toBe('CRITICAL');
  });

  it('rejects a payload that is not an ENS push', () => {
    expect(parsePushData({ type: 'ALERT' })).toBeNull();
    expect(parsePushData({ ens: '1', type: 'SOMETHING_ELSE' })).toBeNull();
    expect(parsePushData(null)).toBeNull();
    expect(parsePushData('not an object')).toBeNull();
  });

  it('rejects an invalid severity or ackRequired encoding', () => {
    expect(parsePushData({ ens: '1', type: 'ALERT', severity: 'SEVERE' })).toBeNull();
    expect(parsePushData({ ens: '1', type: 'ALERT', ackRequired: 'yes' })).toBeNull();
  });

  it('accepts the minimal required fields only', () => {
    expect(parsePushData({ ens: '1', type: 'TERMINATION' })).not.toBeNull();
    expect(parsePushData({ ens: '1', type: 'TEST', testId: 't1' })).not.toBeNull();
  });
});
