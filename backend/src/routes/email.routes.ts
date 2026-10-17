import { Router, Request, Response } from 'express';
import { emailController } from '../controllers/email.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.post('/schedule', (req: Request, res: Response) => emailController.schedule(req, res));
router.get('/scheduled', (req: Request, res: Response) => emailController.getScheduled(req, res));
router.get('/sent', (req: Request, res: Response) => emailController.getSent(req, res));
router.get('/search', (req: Request, res: Response) => emailController.search(req, res));
router.get('/:id', (req: Request, res: Response) => emailController.getById(req, res));

export default router;
