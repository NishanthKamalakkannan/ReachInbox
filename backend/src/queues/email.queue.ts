import { Queue } from 'bullmq';
import { EMAIL_QUEUE_NAME, queueConfig } from './queue.config';
import { EmailJobData } from '../types/email.types';
import { getDeterministicJobId } from '../utils/idempotency';
import { logger } from '../utils/logger';

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, queueConfig);

/**
 * Enqueues an individual email job with a deterministic job ID and BullMQ delay.
 */
export async function addEmailJobToQueue(
  jobData: EmailJobData,
  delayMs: number
): Promise<string> {
  const jobId = getDeterministicJobId(jobData.emailId);

  await emailQueue.add('sendEmail', jobData, {
    jobId,
    delay: Math.max(0, delayMs),
  });

  logger.debug('Added email job to BullMQ queue', {
    jobId,
    emailId: jobData.emailId,
    delayMs,
  });

  return jobId;
}
