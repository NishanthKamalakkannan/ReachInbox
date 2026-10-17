import { Email, EmailStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from './logger';

/**
 * Returns a deterministic BullMQ job ID for an email.
 * This guarantees that even if a job insertion is retried, BullMQ's deduplication
 * prevents creating duplicate jobs.
 */
export function getDeterministicJobId(emailId: string): string {
  return `email-${emailId}`;
}

/**
 * Atomically transitions an email from 'scheduled' to 'processing' and increments attempts.
 * Uses Prisma raw query or conditional update to guarantee that only ONE worker can
 * successfully acquire/claim the email.
 *
 * If the email is already in 'processing' or 'sent', the update affects 0 rows and returns null.
 */
export async function claimEmailForProcessing(emailId: string): Promise<Email | null> {
  try {
    // We execute an atomic update conditioned on status = 'scheduled'
    // Prisma's updateMany returns count, allowing atomic conditional locking without race conditions
    const updated = await prisma.email.updateMany({
      where: {
        id: emailId,
        status: EmailStatus.scheduled,
      },
      data: {
        status: EmailStatus.processing,
        attempts: {
          increment: 1,
        },
      },
    });

    if (updated.count === 0) {
      // Either already claimed by another worker or already sent/failed
      return null;
    }

    // Successfully claimed, return the updated record
    return await prisma.email.findUnique({
      where: { id: emailId },
      include: { sender: true },
    });
  } catch (err: any) {
    logger.error('Failed to claim email for processing', { emailId, error: err.message });
    return null;
  }
}

/**
 * Resets an email back to 'scheduled' state with an updated scheduledAt timestamp
 * when a rate limit window boundary is encountered and the job is rescheduled.
 */
export async function rescheduleEmailRecord(emailId: string, nextScheduledAt: Date): Promise<void> {
  await prisma.email.update({
    where: { id: emailId },
    data: {
      status: EmailStatus.scheduled,
      scheduledAt: nextScheduledAt,
    },
  });
}
