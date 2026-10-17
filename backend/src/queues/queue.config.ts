import { QueueOptions, WorkerOptions } from 'bullmq';
import { redisConnectionOptions } from '../config/redis';
import { env } from '../config/env';

export const EMAIL_QUEUE_NAME = 'emailQueue';

export const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 5000,
  },
  removeOnComplete: {
    age: 3600 * 24, // keep for 24 hours
    count: 5000,
  },
  removeOnFail: {
    age: 3600 * 48, // keep for 48 hours for auditing
  },
};

export const queueConfig: QueueOptions = {
  connection: redisConnectionOptions,
  defaultJobOptions,
};

export const workerConfig: WorkerOptions = {
  connection: redisConnectionOptions,
  concurrency: env.WORKER_CONCURRENCY,
  lockDuration: 30000,
};
