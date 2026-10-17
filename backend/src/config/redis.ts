import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

export const redisConnectionOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// Dedicated client for application-level atomic operations (Rate Limiting, Deduplication)
export const redisClient = new Redis(redisConnectionOptions);

redisClient.on('connect', () => {
  logger.info(`Redis connected successfully to ${env.REDIS_HOST}:${env.REDIS_PORT}`);
});

redisClient.on('error', (err) => {
  logger.error('Redis connection error', { error: err.message });
});

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const res = await redisClient.ping();
    return res === 'PONG';
  } catch (err: any) {
    logger.error('Redis health check failed', { error: err.message });
    return false;
  }
}
