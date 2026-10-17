/**
 * Pure functions for deterministic email scheduling and UTC window calculations.
 */

/**
 * Calculates the exact scheduled timestamp for a recipient at a given index.
 */
export function calculateScheduledTime(
  startTimestampMs: number,
  recipientIndex: number,
  delayBetweenEmailsMs: number
): Date {
  const timestamp = startTimestampMs + recipientIndex * delayBetweenEmailsMs;
  return new Date(timestamp);
}

/**
 * Calculates BullMQ delayed job delay in milliseconds.
 * Always returns a non-negative integer. If the scheduled time is in the past,
 * it returns 0 (send immediately).
 */
export function calculateBullMqDelay(scheduledTimeMs: number, currentTimeMs: number = Date.now()): number {
  const diff = scheduledTimeMs - currentTimeMs;
  return Math.max(0, diff);
}

/**
 * Formats a Date into a standard UTC hour window key: 'YYYY-MM-DD-HH'
 * Example: 2026-09-29T10:45:00Z -> '2026-09-29-10'
 */
export function getUtcHourWindowString(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  return `${y}-${m}-${d}-${h}`;
}

/**
 * Calculates the exact Date when the next UTC hour window begins.
 * Example: 10:45:00 UTC -> 11:00:00.000 UTC
 */
export function getNextUtcHourWindowDate(date: Date = new Date()): Date {
  const nextHour = new Date(date);
  nextHour.setUTCHours(nextHour.getUTCHours() + 1, 0, 0, 0);
  return nextHour;
}

/**
 * Calculates milliseconds until the next UTC hour begins plus a small jitter (e.g. 500ms)
 * to avoid thundering herds when the new window opens.
 */
export function getDelayUntilNextHourWindowMs(now: Date = new Date(), jitterMs: number = 500): number {
  const nextWindow = getNextUtcHourWindowDate(now);
  const diff = nextWindow.getTime() - now.getTime();
  return Math.max(1000, diff + jitterMs);
}
