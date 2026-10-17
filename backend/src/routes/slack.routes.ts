import { Router } from 'express';
import { slackController } from '../controllers/slack.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// OAuth callback is called directly by Slack's redirect
router.get('/callback', (req, res) => slackController.callback(req, res));

// Authenticated Slack actions
router.get('/connect', requireAuth, (req, res) => slackController.connect(req, res));
router.get('/status', requireAuth, (req, res) => slackController.getStatus(req, res));
router.post('/disconnect', requireAuth, (req, res) => slackController.disconnect(req, res));

export default router;
