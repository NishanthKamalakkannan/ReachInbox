import { Worker, Job } from 'bullmq';
import { EMAIL_QUEUE_NAME, workerConfig } from './queue.config';
import { EmailJobData } from '../types/email.types';
import { prisma } from '../config/database';
import { EmailStatus } from '@prisma/client';
import { claimEmailForProcessing, rescheduleEmailRecord } from '../utils/idempotency';
import { rateLimiterService } from '../services/rateLimiter.service';
import { smtpService } from '../services/smtp.service';
import { searchService } from '../services/search.service';
import { slackService } from '../services/slack.service';
import { addEmailJobToQueue } from './email.queue';
import { getNextUtcHourWindowDate } from '../utils/scheduling';
import { logger } from '../utils/logger';

export function createEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { emailId, senderId, userId } = job.data;
      logger.info('Email worker processing job', { jobId: job.id, emailId });

      // 1. Fetch current email state from DB
      const existingEmail = await prisma.email.findUnique({
        where: { id: emailId },
        include: { sender: true, campaign: true },
      });

      if (!existingEmail) {
        logger.warn('Email record not found in database. Skipping job.', { emailId });
        return;
      }

      // 2. Strict Idempotency Check: if already sent, do nothing!
      if (existingEmail.status === EmailStatus.sent) {
        logger.info('Email already sent. Idempotency safeguard applied.', { emailId });
        return;
      }

      // 3. Atomically claim email: status 'scheduled' -> 'processing'
      const claimedEmail = await claimEmailForProcessing(emailId);
      if (!claimedEmail) {
        logger.info('Email could not be claimed (already processing or sent by another worker).', { emailId });
        return;
      }

      const senderEmail = existingEmail.sender?.email || 'outbound@reachinbox.ai';
      const hourlyLimit = existingEmail.campaign?.hourlyLimit || 100;

      // 4. Distributed Rate Limit Check via Redis Lua script
      const rateCheck = await rateLimiterService.checkAndConsumeRateLimit(senderId, hourlyLimit);

      if (!rateCheck.allowed) {
        // Hourly rate limit reached! Reschedule for the next UTC hour window
        const nextHourDate = getNextUtcHourWindowDate(new Date());
        const delayMs = rateCheck.delayUntilNextWindowMs || 60000;

        logger.warn('Hourly rate limit reached. Rescheduling email job for next window.', {
          emailId,
          senderEmail,
          nextWindow: nextHourDate.toISOString(),
          delayMs,
        });

        // Reset state back to 'scheduled' with the new target time
        await rescheduleEmailRecord(emailId, nextHourDate);

        // Re-enqueue delayed job in BullMQ
        await addEmailJobToQueue(job.data, delayMs);

        // Send Slack alert with Redis deduplication (only 1 alert per sender per hour window)
        const nextWindowString = nextHourDate.toISOString().substring(11, 16);
        slackService.sendRateLimitAlert(userId, senderId, {
          senderEmail,
          hourlyLimit,
          currentWindow: rateCheck.hourWindow,
          rescheduledWindow: nextWindowString,
        });

        return;
      }

      // 5. Enforce minimum send delay between consecutive emails for this sender
      await rateLimiterService.enforceMinSendDelay(senderId);

      // 6. Send email via Ethereal SMTP
      try {
        const sendResult = await smtpService.sendEmail({
          from: senderEmail,
          to: claimedEmail.recipient,
          subject: claimedEmail.subject,
          body: claimedEmail.body,
        });

        const sentAt = new Date();

        // 7. Transition status to 'sent'
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: EmailStatus.sent,
            sentAt,
            errorMessage: null,
          },
        });

        // 8. Update Elasticsearch document
        await searchService.updateEmailStatus(emailId, 'sent', sentAt);

        logger.info('Email successfully delivered and updated', {
          emailId,
          recipient: claimedEmail.recipient,
          messageId: sendResult.messageId,
          previewUrl: sendResult.previewUrl || 'none',
        });
      } catch (smtpErr: any) {
        logger.error('SMTP sending failed for email', {
          emailId,
          recipient: claimedEmail.recipient,
          error: smtpErr.message,
          attempts: claimedEmail.attempts,
        });

        const maxAttempts = 3;
        const willRetry = claimedEmail.attempts < maxAttempts;

        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: willRetry ? EmailStatus.scheduled : EmailStatus.failed,
            errorMessage: smtpErr.message,
          },
        });

        if (!willRetry) {
          await searchService.updateEmailStatus(emailId, 'failed');
        }

        // Throw error to trigger BullMQ's configured exponential backoff if retrying
        if (willRetry) {
          throw smtpErr;
        }
      }
    },
    workerConfig
  );

  worker.on('ready', () => {
    logger.info(`BullMQ Email Worker started with concurrency: ${workerConfig.concurrency}`);
  });

  worker.on('failed', (job, err) => {
    logger.error('BullMQ Job failed', { jobId: job?.id, error: err.message });
  });

  worker.on('error', (err) => {
    logger.error('BullMQ Worker encountered an error', { error: err.message });
  });

  return worker;
}

// Support running worker as a standalone process
if (require.main === module) {
  createEmailWorker();
}
