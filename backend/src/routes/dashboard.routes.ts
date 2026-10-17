import { Router, Request, Response } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/stats', (req: Request, res: Response) => dashboardController.getStats(req, res));

export default router;
