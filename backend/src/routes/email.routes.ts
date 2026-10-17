import { Router } from 'express';
import { emailController } from '../controllers/email.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.post('/schedule', (req, res) => emailController.schedule(req, res));
router.get('/scheduled', (req, res) => emailController.getScheduled(req, res));
router.get('/sent', (req, res) => emailController.getSent(req, res));
router.get('/search', (req, res) => emailController.search(req, res));
router.get('/:id', (req, res) => emailController.getById(req, res));

export default router;
