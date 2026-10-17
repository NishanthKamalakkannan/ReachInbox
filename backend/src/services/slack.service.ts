import { WebClient } from '@slack/web-api';
import { prisma } from '../config/database';
import { redisClient } from '../config/redis';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { SlackOAuthTokenResponse, SlackRateLimitNotificationPayload } from '../types/slack.types';

export class SlackService {
  /**
   * Generates the Slack OAuth authorization URL.
   */
  getAuthorizationUrl(userId: string): string {
    const scopes = ['chat:write', 'channels:read', 'incoming-webhook'];
    const redirectUri = encodeURIComponent(env.SLACK_REDIRECT_URI);
    const scopeStr = encodeURIComponent(scopes.join(','));
    const state = encodeURIComponent(JSON.stringify({ userId }));

    return `https://slack.com/oauth/v2/authorize?client_id=${env.SLACK_CLIENT_ID}&scope=${scopeStr}&redirect_uri=${redirectUri}&state=${state}`;
  }

  /**
   * Exchanges authorization code for an OAuth access token and persists the connection.
   */
  async handleOAuthCallback(code: string, state: string): Promise<{ success: boolean; teamName?: string }> {
    let userId: string;
    try {
      const parsed = JSON.parse(state);
      userId = parsed.userId;
    } catch {
      throw new Error('Invalid OAuth state parameter');
    }

    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: env.SLACK_CLIENT_ID || '',
        client_secret: env.SLACK_CLIENT_SECRET || '',
        code,
        redirect_uri: env.SLACK_REDIRECT_URI,
      }),
    });

    const data = (await response.json()) as SlackOAuthTokenResponse;

    if (!data.ok) {
      logger.error('Slack OAuth token exchange failed', { error: data.error });
      throw new Error(data.error || 'Failed to exchange Slack OAuth code');
    }

    const channelId = data.incoming_webhook?.channel_id || null;
    const channelName = data.incoming_webhook?.channel || null;

    // Persist or update SlackConnection in PostgreSQL
    await prisma.slackConnection.upsert({
      where: { userId },
      update: {
        teamId: data.team.id,
        accessToken: data.access_token,
        channelId,
        channelName,
        connected: true,
      },
      create: {
        userId,
        teamId: data.team.id,
        accessToken: data.access_token,
        channelId,
        channelName,
        connected: true,
      },
    });

    logger.info('Slack connection persisted for user', { userId, teamId: data.team.id });
    return { success: true, teamName: data.team.name };
  }

  /**
   * Retrieves current Slack connection status for a user.
   */
  async getConnectionStatus(userId: string) {
    const conn = await prisma.slackConnection.findUnique({
      where: { userId },
    });

    if (!conn || !conn.connected) {
      return { connected: false };
    }

    return {
      connected: true,
      teamId: conn.teamId,
      channelId: conn.channelId,
      channelName: conn.channelName,
      connectedAt: conn.updatedAt,
    };
  }

  /**
   * Disconnects Slack integration for the given user.
   */
  async disconnect(userId: string): Promise<boolean> {
    await prisma.slackConnection.updateMany({
      where: { userId },
      data: { connected: false },
    });

    logger.info('Slack integration disconnected for user', { userId });
    return true;
  }

  /**
   * Sends rate limit alert to user's connected Slack workspace.
   * Includes Redis-based deduplication to prevent alert spam across multiple concurrent workers.
   */
  async sendRateLimitAlert(
    userId: string,
    senderId: string,
    payload: SlackRateLimitNotificationPayload
  ): Promise<void> {
    try {
      // 1. Check Redis deduplication key: slack-rate-limit-notified:{senderId}:{hourWindow}
      const dedupKey = `slack-rate-limit-notified:${senderId}:${payload.currentWindow}`;
      const acquired = await redisClient.set(dedupKey, '1', 'EX', 7200, 'NX');

      if (!acquired) {
        logger.debug('Slack notification already sent for this sender/window, skipping to prevent spam', {
          senderId,
          window: payload.currentWindow,
        });
        return;
      }

      // 2. Fetch active SlackConnection
      const connection = await prisma.slackConnection.findUnique({
        where: { userId },
      });

      if (!connection || !connection.connected || !connection.accessToken) {
        logger.debug('No active Slack connection found for user. Alert not sent.', { userId });
        return;
      }

      const client = new WebClient(connection.accessToken);
      const targetChannel = connection.channelId || '#general';

      const slackMessage = {
        channel: targetChannel,
        text: `⚠️ Email rate limit reached for ${payload.senderEmail}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '⚠️ Email Rate Limit Reached',
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Sender:*\n${payload.senderEmail}`,
              },
              {
                type: 'mrkdwn',
                text: `*Hourly Limit:*\n${payload.hourlyLimit} emails/hr`,
              },
              {
                type: 'mrkdwn',
                text: `*Current Window:*\n${payload.currentWindow} UTC`,
              },
              {
                type: 'mrkdwn',
                text: `*Rescheduled To:*\n${payload.rescheduledWindow} UTC`,
              },
            ],
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: '🤖 *ReachInbox Email Scheduler* has automatically deferred remaining queued jobs to protect sender reputation.',
              },
            ],
          },
        ],
      };

      await client.chat.postMessage(slackMessage);
      logger.info('Slack rate limit notification posted successfully', {
        userId,
        senderId,
        channel: targetChannel,
      });
    } catch (err: any) {
      // Failure isolation: Slack errors must NEVER fail the worker job!
      logger.error('Failed to dispatch Slack rate limit notification', {
        userId,
        senderId,
        error: err.message,
      });
    }
  }
}

export const slackService = new SlackService();
