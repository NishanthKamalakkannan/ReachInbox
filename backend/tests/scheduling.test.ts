import {
  calculateScheduledTime,
  calculateBullMqDelay,
  getUtcHourWindowString,
  getNextUtcHourWindowDate,
  getDelayUntilNextHourWindowMs,
} from '../src/utils/scheduling';

describe('Scheduling Utilities', () => {
  describe('calculateScheduledTime', () => {
    it('should calculate deterministic timestamps for consecutive recipients', () => {
      const startTimeMs = new Date('2026-09-29T11:00:00.000Z').getTime();
      const delayMs = 2000;

      const emailA = calculateScheduledTime(startTimeMs, 0, delayMs);
      const emailB = calculateScheduledTime(startTimeMs, 1, delayMs);
      const emailC = calculateScheduledTime(startTimeMs, 2, delayMs);

      expect(emailA.toISOString()).toBe('2026-09-29T11:00:00.000Z');
      expect(emailB.toISOString()).toBe('2026-09-29T11:00:02.000Z');
      expect(emailC.toISOString()).toBe('2026-09-29T11:00:04.000Z');
    });
  });

  describe('calculateBullMqDelay', () => {
    it('should return correct positive delay when scheduled in the future', () => {
      const now = 1000000;
      const scheduled = 1005000;
      expect(calculateBullMqDelay(scheduled, now)).toBe(5000);
    });

    it('should never return a negative delay if scheduled time is in the past', () => {
      const now = 1005000;
      const scheduled = 1000000;
      expect(calculateBullMqDelay(scheduled, now)).toBe(0);
    });
  });

  describe('UTC Hour Window Utilities', () => {
    it('should format UTC hour window string accurately', () => {
      const date = new Date('2026-09-29T10:45:30.000Z');
      const windowStr = getUtcHourWindowString(date);
      expect(windowStr).toBe('2026-09-29-10');
    });

    it('should compute the next UTC hour window correctly across hours', () => {
      const date = new Date('2026-09-29T10:45:00.000Z');
      const nextHour = getNextUtcHourWindowDate(date);
      expect(nextHour.toISOString()).toBe('2026-09-29T11:00:00.000Z');
    });

    it('should compute the next UTC hour window correctly across midnight', () => {
      const date = new Date('2026-09-29T23:50:00.000Z');
      const nextHour = getNextUtcHourWindowDate(date);
      expect(nextHour.toISOString()).toBe('2026-09-30T00:00:00.000Z');
    });

    it('should calculate delay until next hour window', () => {
      const date = new Date('2026-09-29T10:50:00.000Z'); // 10 minutes until 11:00:00
      const delay = getDelayUntilNextHourWindowMs(date, 0);
      expect(delay).toBe(10 * 60 * 1000);
    });
  });
});
