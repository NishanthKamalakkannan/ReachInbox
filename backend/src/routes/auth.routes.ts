import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// OAuth navigation entry points
router.get('/google', (req, res) => authController.redirectToGoogle(req, res));
router.get('/google/callback', (req, res) => authController.handleGoogleCallback(req, res));

// User profile & session
router.get('/me', requireAuth, (req, res) => authController.getMe(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));

// Dev / Demo login
router.post('/demo-login', (req, res) => authController.demoLogin(req, res));

export default router;
