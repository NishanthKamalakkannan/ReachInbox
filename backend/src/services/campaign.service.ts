import { prisma } from '../config/database';

export class CampaignService {
  async getCampaigns(userId: string) {
    return prisma.campaign.findMany({
      where: { userId },
      include: {
        _count: {
          select: { emails: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCampaignById(campaignId: string, userId: string) {
    return prisma.campaign.findFirst({
      where: {
        id: campaignId,
        userId,
      },
      include: {
        emails: {
          orderBy: { scheduledAt: 'asc' },
          take: 100,
        },
        _count: {
          select: { emails: true },
        },
      },
    });
  }

  async getUserSenders(userId: string) {
    let senders = await prisma.sender.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    // If user has no sender yet, auto-create a default sender so they can schedule immediately
    if (senders.length === 0) {
      const defaultSender = await prisma.sender.create({
        data: {
          userId,
          email: 'outbound@reachinbox.ai',
        },
      });
      senders = [defaultSender];
    }

    return senders;
  }
}

export const campaignService = new CampaignService();
