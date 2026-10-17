import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { checkRedisHealth } from './config/redis';
import { initializeElasticsearch } from './config/elasticsearch';
import { createEmailWorker } from './queues/email.worker';
import { logger } from './utils/logger';

async function bootstrap() {
  logger.info('Starting ReachInbox Outbound Email Scheduler...');

  // Connect PostgreSQL
  await connectDatabase();

  // Validate Redis
  const redisHealthy = await checkRedisHealth();
  if (!redisHealthy) {
    logger.warn('Redis is not immediately reachable. BullMQ operations might stall.');
  }

  // Initialize Elasticsearch index
  await initializeElasticsearch();

  // Start BullMQ Background Worker
  const worker = createEmailWorker();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT} (${env.NODE_ENV})`);
    logger.info(`Bull Board UI available at: http://localhost:${env.PORT}/admin/queues`);
    logger.info(`Health check at: http://localhost:${env.PORT}/health`);
  });

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Gracefully shutting down...`);
    server.close(async () => {
      logger.info('HTTP server closed');
      await worker.close();
      logger.info('Email worker closed');
      process.exit(0);
    });

    // Force exit after 10s if hanging
    setTimeout(() => {
      logger.error('Forceful shutdown triggered after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error('Fatal bootstrap error', { error: err.message, stack: err.stack });
  process.exit(1);
});
