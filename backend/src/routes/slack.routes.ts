import { Router, Request, Response } from 'express';
import { slackController } from '../controllers/slack.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// OAuth callback is called directly by Slack's redirect
router.get('/callback', (req: Request, res: Response) => slackController.callback(req, res));

// Authenticated Slack actions
router.get('/connect', requireAuth, (req: Request, res: Response) => slackController.connect(req, res));
router.get('/status', requireAuth, (req: Request, res: Response) => slackController.getStatus(req, res));
router.post('/disconnect', requireAuth, (req: Request, res: Response) => slackController.disconnect(req, res));

export default router;
