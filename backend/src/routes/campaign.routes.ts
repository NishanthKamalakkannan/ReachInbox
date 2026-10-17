import { Router, Request, Response } from 'express';
import { campaignController } from '../controllers/campaign.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', (req: Request, res: Response) => campaignController.getCampaigns(req, res));
router.get('/senders', (req: Request, res: Response) => campaignController.getSenders(req, res));
router.get('/:id', (req: Request, res: Response) => campaignController.getCampaignById(req, res));

export default router;
