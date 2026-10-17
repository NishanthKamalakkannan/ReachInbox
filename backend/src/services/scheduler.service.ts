import { EmailStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { addEmailJobToQueue } from '../queues/email.queue';
import { calculateScheduledTime, calculateBullMqDelay } from '../utils/scheduling';
import { getDeterministicJobId } from '../utils/idempotency';
import { searchService } from './search.service';
import { logger } from '../utils/logger';
import { ScheduleCampaignInput } from '../types/email.types';

export class SchedulerService {
  /**
   * Creates a campaign and schedules individual BullMQ delayed jobs for each recipient.
   */
  async scheduleCampaign(userId: string, input: ScheduleCampaignInput) {
    const { subject, body, recipients, startTime, delayBetweenEmails, hourlyLimit, senderId } = input;

    // 1. Verify sender ownership
    const sender = await prisma.sender.findFirst({
      where: {
        id: senderId,
        userId,
      },
    });

    if (!sender) {
      throw new Error('Sender not found or not owned by the authenticated user.');
    }

    const startTimestampMs = new Date(startTime).getTime();
    if (isNaN(startTimestampMs)) {
      throw new Error('Invalid start time provided.');
    }

    const currentTimeMs = Date.now();

    // 2. Prepare email records with deterministic timestamps
    const preparedEmails = recipients.map((recipient, index) => {
      const scheduledAt = calculateScheduledTime(startTimestampMs, index, delayBetweenEmails);
      return {
        recipient,
        subject,
        body,
        scheduledAt,
        senderId,
      };
    });

    // 3. Atomically persist Campaign and all Email records in PostgreSQL
    const { campaign, emails } = await prisma.$transaction(async (tx) => {
      const createdCampaign = await tx.campaign.create({
        data: {
          userId,
          subject,
          body,
          startTime: new Date(startTime),
          delayBetweenEmails,
          hourlyLimit,
        },
      });

      // Bulk create emails with generated IDs
      const createdEmails = await Promise.all(
        preparedEmails.map((e) =>
          tx.email.create({
            data: {
              campaignId: createdCampaign.id,
              senderId: e.senderId,
              recipient: e.recipient,
              subject: e.subject,
              body: e.body,
              scheduledAt: e.scheduledAt,
              status: EmailStatus.scheduled,
              bullJobId: null, // Will update with deterministic job ID
            },
          })
        )
      );

      return { campaign: createdCampaign, emails: createdEmails };
    });

    logger.info('Campaign and email records created in DB', {
      campaignId: campaign.id,
      count: emails.length,
    });

    // 4. Enqueue BullMQ delayed jobs for each email
    let enqueuedCount = 0;
    const enqueuePromises = emails.map(async (email) => {
      const delayMs = calculateBullMqDelay(email.scheduledAt.getTime(), currentTimeMs);
      const jobId = getDeterministicJobId(email.id);

      try {
        await addEmailJobToQueue(
          {
            emailId: email.id,
            campaignId: campaign.id,
            senderId: email.senderId,
            userId,
          },
          delayMs
        );

        // Update bullJobId on email record
        await prisma.email.update({
          where: { id: email.id },
          data: { bullJobId: jobId },
        });

        // Index in Elasticsearch asynchronously
        searchService.indexEmail({
          id: email.id,
          recipient: email.recipient,
          subject: email.subject,
          status: 'scheduled',
          scheduledAt: email.scheduledAt,
          campaignId: campaign.id,
          senderId: email.senderId,
          userId,
          createdAt: email.createdAt,
        });

        enqueuedCount++;
      } catch (err: any) {
        logger.error('Failed to enqueue BullMQ job for email', {
          emailId: email.id,
          error: err.message,
        });
        // Notice: Database record remains as 'scheduled'
        // A recovery process or re-queue can seamlessly pick it up
      }
    });

    await Promise.all(enqueuePromises);

    return {
      campaignId: campaign.id,
      totalRecipients: recipients.length,
      scheduledCount: enqueuedCount,
      firstScheduledAt: emails[0]?.scheduledAt,
      lastScheduledAt: emails[emails.length - 1]?.scheduledAt,
    };
  }
}

export const schedulerService = new SchedulerService();
