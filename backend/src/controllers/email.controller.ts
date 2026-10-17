import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types/auth.types';
import { schedulerService } from '../services/scheduler.service';
import { emailService } from '../services/email.service';
import { searchService } from '../services/search.service';

export const scheduleEmailSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(255),
  body: z.string().min(1, 'Email body is required'),
  recipients: z.array(z.string().email('Invalid email')).min(1, 'At least one recipient is required'),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), 'Valid start time ISO string required'),
  delayBetweenEmails: z.coerce.number().min(0).default(2000),
  hourlyLimit: z.coerce.number().min(1).max(5000).default(100),
  senderId: z.string().min(1, 'Sender ID is required'),
});

export class EmailController {
  /**
   * Schedules a campaign with delayed individual BullMQ email jobs
   */
  async schedule(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const validated = scheduleEmailSchema.parse(req.body);
      const result = await schedulerService.scheduleCampaign(userId, validated);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      const isValidation = err?.name === 'ZodError';
      res.status(isValidation ? 400 : 500).json({
        success: false,
        error: {
          code: isValidation ? 'VALIDATION_ERROR' : 'SCHEDULE_ERROR',
          message: isValidation
            ? err.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
            : (err.message || 'Failed to schedule campaign'),
        },
      });
    }
  }

  /**
   * Lists scheduled emails
   */
  async getScheduled(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 50;

    const data = await emailService.getScheduledEmails(userId, page, limit);

    res.json({
      success: true,
      data,
    });
  }

  /**
   * Lists sent and failed emails
   */
  async getSent(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 50;

    const data = await emailService.getSentEmails(userId, page, limit);

    res.json({
      success: true,
      data,
    });
  }

  /**
   * Elasticsearch email search
   */
  async search(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const query = (req.query.q as string) || '';

    if (!query.trim()) {
      res.json({
        success: true,
        data: [],
      });
      return;
    }

    const results = await searchService.searchEmails(userId, query.trim());

    res.json({
      success: true,
      data: results,
    });
  }

  /**
   * Gets details for a specific email
   */
  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const emailId = req.params.id;

    const email = await emailService.getEmailById(emailId, userId);

    if (!email) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Email not found' },
      });
      return;
    }

    res.json({
      success: true,
      data: email,
    });
  }
}

export const emailController = new EmailController();
