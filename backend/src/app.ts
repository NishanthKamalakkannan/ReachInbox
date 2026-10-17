import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env';
import authRoutes from './routes/auth.routes';
import emailRoutes from './routes/email.routes';
import campaignRoutes from './routes/campaign.routes';
import slackRoutes from './routes/slack.routes';
import dashboardRoutes from './routes/dashboard.routes';
import { setupBullBoard } from './queues/bullBoard';
import { errorHandler } from './middleware/error.middleware';

export function createApp(): Application {
  const app = express();

  // Security headers (relaxed slightly for Bull Board UI assets if necessary)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS Configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          origin === env.FRONTEND_URL ||
          origin.endsWith('.onrender.com') ||
          origin.includes('localhost')
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser(env.SESSION_SECRET));

  // Request logger
  if (env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Root API welcome endpoint
  app.get('/', (req: express.Request, res: express.Response) => {
    res.json({
      service: 'ReachInbox Outbound Email Scheduler API',
      status: 'active',
      health: '/health',
      queues: '/admin/queues',
      frontend: env.FRONTEND_URL,
    });
  });

  // Health check endpoint
  app.get('/health', (req: express.Request, res: express.Response) => {
    res.json({
      status: 'ok',
      service: 'reachinbox-scheduler-api',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    });
  });

  // Bull Board Queue Admin Dashboard
  app.use('/admin/queues', setupBullBoard());

  // API Routes
  app.use('/auth', authRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/emails', emailRoutes);
  app.use('/api/campaigns', campaignRoutes);
  app.use('/api/slack', slackRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}
