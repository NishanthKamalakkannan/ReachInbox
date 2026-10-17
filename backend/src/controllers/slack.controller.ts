import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/auth.types';
import { slackService } from '../services/slack.service';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export class SlackController {
  /**
   * Generates Slack OAuth authorization redirect
   */
  async connect(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;

    if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET) {
      res.status(400).json({
        success: false,
        error: {
          code: 'SLACK_NOT_CONFIGURED',
          message: 'Slack OAuth credentials are not configured in backend .env. Please set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET.',
        },
      });
      return;
    }

    const authUrl = slackService.getAuthorizationUrl(userId);
    res.redirect(authUrl);
  }

  /**
   * Handles Slack OAuth callback
   */
  async callback(req: Request, res: Response): Promise<void> {
    const { code, state, error } = req.query;

    if (error) {
      logger.error('Slack OAuth callback error', { error });
      res.redirect(`${env.FRONTEND_URL}/dashboard?slack=error&message=${encodeURIComponent(String(error))}`);
      return;
    }

    if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
      res.redirect(`${env.FRONTEND_URL}/dashboard?slack=error&message=Missing+OAuth+code+or+state`);
      return;
    }

    try {
      const { teamName } = await slackService.handleOAuthCallback(code, state);
      res.redirect(`${env.FRONTEND_URL}/dashboard?slack=success&team=${encodeURIComponent(teamName || 'Slack')}`);
    } catch (err: any) {
      logger.error('Slack OAuth callback handling failed', { error: err.message });
      res.redirect(`${env.FRONTEND_URL}/dashboard?slack=error&message=${encodeURIComponent(err.message)}`);
    }
  }

  /**
   * Retrieves Slack connection status for the logged-in user
   */
  async getStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const status = await slackService.getConnectionStatus(userId);

    res.json({
      success: true,
      data: status,
    });
  }

  /**
   * Disconnects Slack
   */
  async disconnect(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    await slackService.disconnect(userId);

    res.json({
      success: true,
      data: { message: 'Slack disconnected successfully' },
    });
  }
}

export const slackController = new SlackController();
