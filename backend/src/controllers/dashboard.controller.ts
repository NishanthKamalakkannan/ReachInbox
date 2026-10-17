import { Response } from 'express';
import { AuthenticatedRequest } from '../types/auth.types';
import { prisma } from '../config/database';
import { EmailStatus } from '@prisma/client';
import { redisClient } from '../config/redis';
import { getUtcHourWindowString } from '../utils/scheduling';
import { env } from '../config/env';

export class DashboardController {
  async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;

    const [scheduled, processing, sent, failed, campaignsCount, senders] = await Promise.all([
      prisma.email.count({
        where: { campaign: { userId }, status: EmailStatus.scheduled },
      }),
      prisma.email.count({
        where: { campaign: { userId }, status: EmailStatus.processing },
      }),
      prisma.email.count({
        where: { campaign: { userId }, status: EmailStatus.sent },
      }),
      prisma.email.count({
        where: { campaign: { userId }, status: EmailStatus.failed },
      }),
      prisma.campaign.count({
        where: { userId },
      }),
      prisma.sender.findMany({
        where: { userId },
        select: { id: true, email: true },
      }),
    ]);

    // Check Redis usage for user's primary sender in the current UTC hour window
    let currentHourSent = 0;
    const hourWindow = getUtcHourWindowString(new Date());

    if (senders.length > 0) {
      const primarySenderId = senders[0].id;
      const countStr = await redisClient.get(`email-rate-limit:${primarySenderId}:${hourWindow}`);
      currentHourSent = countStr ? parseInt(countStr, 10) : 0;
    }

    res.json({
      success: true,
      data: {
        totalScheduled: scheduled,
        totalProcessing: processing,
        totalSent: sent,
        totalFailed: failed,
        totalCampaigns: campaignsCount,
        sendersCount: senders.length,
        rateLimit: {
          currentHourSent,
          hourlyLimit: env.MAX_EMAILS_PER_HOUR,
          currentWindowUtc: `${hourWindow}:00 UTC`,
        },
      },
    });
  }
}

export const dashboardController = new DashboardController();
