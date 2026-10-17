import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from project root or backend directory
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  
  // Database
  DATABASE_URL: z.string().default('postgresql://reachinbox_user:reachinbox_pass@localhost:5432/reachinbox_db?schema=public'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // Elasticsearch
  ELASTICSEARCH_URL: z.string().default('http://localhost:9200'),

  // Worker & Queuing
  WORKER_CONCURRENCY: z.coerce.number().default(5),
  MIN_SEND_DELAY_MS: z.coerce.number().default(2000),
  MAX_EMAILS_PER_HOUR: z.coerce.number().default(100),

  // Security & Auth
  SESSION_SECRET: z.string().default('reachinbox_default_session_secret_32_characters_min_length'),
  JWT_SECRET: z.string().default('reachinbox_default_jwt_secret_32_characters_min_length'),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:5000/auth/google/callback'),

  // Slack OAuth
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),
  SLACK_REDIRECT_URI: z.string().default('http://localhost:5000/api/slack/callback'),

  // Ethereal Email SMTP
  ETHEREAL_HOST: z.string().default('smtp.ethereal.email'),
  ETHEREAL_PORT: z.coerce.number().default(587),
  ETHEREAL_USER: z.string().optional(),
  ETHEREAL_PASSWORD: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment configuration:', parsedEnv.error.format());
  throw new Error('Invalid environment variables');
}

export const env = parsedEnv.data;
