import { Client } from '@elastic/elasticsearch';
import { env } from './env';
import { logger } from '../utils/logger';

export const ES_EMAIL_INDEX = 'emails';

export const esClient = new Client({
  node: env.ELASTICSEARCH_URL,
  maxRetries: 3,
  requestTimeout: 10000,
});

export async function initializeElasticsearch(): Promise<void> {
  try {
    const health = await esClient.cluster.health();
    logger.info('Elasticsearch connected successfully', { status: health.status });

    const indexExists = await esClient.indices.exists({ index: ES_EMAIL_INDEX });
    if (!indexExists) {
      await esClient.indices.create({
        index: ES_EMAIL_INDEX,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              recipient: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              subject: { type: 'text' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              campaignId: { type: 'keyword' },
              senderId: { type: 'keyword' },
              userId: { type: 'keyword' },
              createdAt: { type: 'date' },
            },
          },
        },
      });
      logger.info(`Elasticsearch index '${ES_EMAIL_INDEX}' created successfully`);
    } else {
      logger.info(`Elasticsearch index '${ES_EMAIL_INDEX}' already exists`);
    }
  } catch (err: any) {
    logger.warn('Elasticsearch initialization failed or unavailable. Falling back gracefully.', {
      error: err.message,
    });
  }
}
