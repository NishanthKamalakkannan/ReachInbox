import { Router } from 'express';
import { campaignController } from '../controllers/campaign.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => campaignController.getCampaigns(req, res));
router.get('/senders', (req, res) => campaignController.getSenders(req, res));
router.get('/:id', (req, res) => campaignController.getCampaignById(req, res));

export default router;
