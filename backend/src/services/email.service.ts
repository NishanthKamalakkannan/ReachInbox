import { EmailStatus } from '@prisma/client';
import { prisma } from '../config/database';

export class EmailService {
  /**
   * Retrieves scheduled emails for an authenticated user with pagination.
   */
  async getScheduledEmails(userId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where: {
          campaign: { userId },
          status: { in: [EmailStatus.scheduled, EmailStatus.processing] },
        },
        include: {
          campaign: { select: { subject: true, hourlyLimit: true } },
          sender: { select: { email: true } },
        },
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.email.count({
        where: {
          campaign: { userId },
          status: { in: [EmailStatus.scheduled, EmailStatus.processing] },
        },
      }),
    ]);

    return {
      emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves sent and failed emails for an authenticated user with pagination.
   */
  async getSentEmails(userId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where: {
          campaign: { userId },
          status: { in: [EmailStatus.sent, EmailStatus.failed] },
        },
        include: {
          campaign: { select: { subject: true } },
          sender: { select: { email: true } },
        },
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.email.count({
        where: {
          campaign: { userId },
          status: { in: [EmailStatus.sent, EmailStatus.failed] },
        },
      }),
    ]);

    return {
      emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves a specific email by ID, ensuring it belongs to the authenticated user.
   */
  async getEmailById(emailId: string, userId: string) {
    const email = await prisma.email.findFirst({
      where: {
        id: emailId,
        campaign: { userId },
      },
      include: {
        campaign: true,
        sender: true,
      },
    });

    return email;
  }
}

export const emailService = new EmailService();
