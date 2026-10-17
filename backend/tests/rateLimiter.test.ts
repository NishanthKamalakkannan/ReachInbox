import { getUtcHourWindowString, getNextUtcHourWindowDate } from '../src/utils/scheduling';

describe('Rate Limiter Logic & Windows', () => {
  it('correctly isolates UTC windows across consecutive hours', () => {
    const timeA = new Date('2026-09-29T10:15:00.000Z');
    const timeB = new Date('2026-09-29T10:59:59.000Z');
    const timeC = new Date('2026-09-29T11:00:00.000Z');

    expect(getUtcHourWindowString(timeA)).toBe('2026-09-29-10');
    expect(getUtcHourWindowString(timeB)).toBe('2026-09-29-10');
    expect(getUtcHourWindowString(timeC)).toBe('2026-09-29-11');
  });

  it('calculates the exact rescheduling target for rate limited jobs', () => {
    const hitLimitAt = new Date('2026-09-29T10:45:00.000Z');
    const nextWindow = getNextUtcHourWindowDate(hitLimitAt);

    expect(nextWindow.toISOString()).toBe('2026-09-29T11:00:00.000Z');
    expect(nextWindow.getTime() - hitLimitAt.getTime()).toBe(15 * 60 * 1000); // 15 mins delay
  });
});
