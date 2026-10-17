import { esClient, ES_EMAIL_INDEX } from '../config/elasticsearch';
import { prisma } from '../config/database';
import { EmailSearchResult, EmailStatusType } from '../types/email.types';
import { logger } from '../utils/logger';

export class SearchService {
  /**
   * Index or update an email document in Elasticsearch.
   */
  async indexEmail(email: {
    id: string;
    recipient: string;
    subject: string;
    status: EmailStatusType;
    scheduledAt: Date;
    sentAt?: Date | null;
    campaignId: string;
    senderId: string;
    userId: string;
    createdAt: Date;
  }): Promise<void> {
    try {
      await esClient.index({
        index: ES_EMAIL_INDEX,
        id: email.id,
        document: {
          id: email.id,
          recipient: email.recipient,
          subject: email.subject,
          status: email.status,
          scheduledAt: email.scheduledAt.toISOString(),
          sentAt: email.sentAt ? email.sentAt.toISOString() : null,
          campaignId: email.campaignId,
          senderId: email.senderId,
          userId: email.userId,
          createdAt: email.createdAt.toISOString(),
        },
      });
      logger.debug('Email indexed into Elasticsearch', { emailId: email.id });
    } catch (err: any) {
      // Elasticsearch failure must NOT crash core email processing
      logger.warn('Failed to index email into Elasticsearch', {
        emailId: email.id,
        error: err.message,
      });
    }
  }

  /**
   * Updates document status and sentAt in Elasticsearch.
   */
  async updateEmailStatus(
    emailId: string,
    status: EmailStatusType,
    sentAt?: Date | null
  ): Promise<void> {
    try {
      await esClient.update({
        index: ES_EMAIL_INDEX,
        id: emailId,
        doc: {
          status,
          sentAt: sentAt ? sentAt.toISOString() : null,
        },
      });
      logger.debug('Elasticsearch document status updated', { emailId, status });
    } catch (err: any) {
      logger.warn('Failed to update email status in Elasticsearch', {
        emailId,
        status,
        error: err.message,
      });
    }
  }

  /**
   * Performs full-text / multi-match search over Elasticsearch indexed emails.
   * Scoped strictly to the authenticated user ID.
   */
  async searchEmails(userId: string, query: string): Promise<EmailSearchResult[]> {
    try {
      const response = await esClient.search({
        index: ES_EMAIL_INDEX,
        body: {
          query: {
            bool: {
              must: [
                { term: { userId } },
                {
                  multi_match: {
                    query,
                    fields: ['recipient^3', 'subject^2', 'status'],
                    fuzziness: 'AUTO',
                  },
                },
              ],
            },
          },
          sort: [{ createdAt: { order: 'desc' } }],
          size: 50,
        },
      });

      const hits = response.hits.hits;
      return hits.map((hit: any) => ({
        id: hit._source.id,
        recipient: hit._source.recipient,
        subject: hit._source.subject,
        status: hit._source.status,
        scheduledAt: hit._source.scheduledAt,
        sentAt: hit._source.sentAt,
        campaignId: hit._source.campaignId,
        senderId: hit._source.senderId,
        createdAt: hit._source.createdAt,
      }));
    } catch (esErr: any) {
      logger.warn('Elasticsearch query failed, falling back to PostgreSQL scoped search', {
        error: esErr.message,
      });

      // PostgreSQL fallback if Elasticsearch is temporarily offline
      const fallbackResults = await prisma.email.findMany({
        where: {
          campaign: { userId },
          OR: [
            { recipient: { contains: query, mode: 'insensitive' } },
            { subject: { contains: query, mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return fallbackResults.map((e: any) => ({
        id: e.id,
        recipient: e.recipient,
        subject: e.subject,
        status: e.status as EmailStatusType,
        scheduledAt: e.scheduledAt.toISOString(),
        sentAt: e.sentAt ? e.sentAt.toISOString() : null,
        campaignId: e.campaignId,
        senderId: e.senderId,
        createdAt: e.createdAt.toISOString(),
      }));
    }
  }
}

export const searchService = new SearchService();
