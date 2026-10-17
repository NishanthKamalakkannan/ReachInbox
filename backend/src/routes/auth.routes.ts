import { Router, Request, Response } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// OAuth navigation entry points
router.get('/google', (req: Request, res: Response) => authController.redirectToGoogle(req, res));
router.get('/google/callback', (req: Request, res: Response) => authController.handleGoogleCallback(req, res));

// User profile & session
router.get('/me', requireAuth, (req: Request, res: Response) => authController.getMe(req, res));
router.post('/logout', (req: Request, res: Response) => authController.logout(req, res));

// Dev / Demo login
router.post('/demo-login', (req: Request, res: Response) => authController.demoLogin(req, res));

export default router;
