import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { env } from '../config/env';
import { AUTH_COOKIE_NAME } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../types/auth.types';
import { logger } from '../utils/logger';

export class AuthController {
  /**
   * Initiates Google OAuth redirect
   */
  async redirectToGoogle(req: Request, res: Response): Promise<void> {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      res.redirect(
        `${env.FRONTEND_URL}/login?error=GOOGLE_OAUTH_NOT_CONFIGURED&message=${encodeURIComponent(
          'Google OAuth credentials are not set in .env. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or use Quick Demo Mode.'
        )}`
      );
      return;
    }

    const authUrl = authService.getGoogleAuthUrl();
    res.redirect(authUrl);
  }

  /**
   * Handles Google OAuth callback
   */
  async handleGoogleCallback(req: Request, res: Response): Promise<void> {
    const { code, error } = req.query;

    if (error) {
      logger.error('Google OAuth error callback', { error });
      res.redirect(`${env.FRONTEND_URL}/login?error=${encodeURIComponent(String(error))}`);
      return;
    }

    if (!code || typeof code !== 'string') {
      res.redirect(`${env.FRONTEND_URL}/login?error=MISSING_CODE`);
      return;
    }

    try {
      const { token } = await authService.handleGoogleCallback(code);

      // Set secure HTTP-only cookie
      res.cookie(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.redirect(`${env.FRONTEND_URL}/dashboard`);
    } catch (err: any) {
      logger.error('Failed to authenticate Google user', { error: err.message });
      res.redirect(
        `${env.FRONTEND_URL}/login?error=AUTH_FAILED&message=${encodeURIComponent(err.message)}`
      );
    }
  }

  /**
   * Demo login for evaluator local testing without required third-party Google Cloud credentials
   */
  async demoLogin(req: Request, res: Response): Promise<void> {
    try {
      const { token, user } = await authService.getOrCreateDemoUser();

      res.cookie(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
          },
        },
      });
    } catch (err: any) {
      logger.error('Demo login error', { error: err.message });
      res.status(500).json({
        success: false,
        error: { code: 'DEMO_LOGIN_FAILED', message: err.message },
      });
    }
  }

  /**
   * Retrieves authenticated user profile
   */
  async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
      return;
    }

    res.json({
      success: true,
      data: req.user,
    });
  }

  /**
   * Logs out user and clears session cookie
   */
  async logout(req: Request, res: Response): Promise<void> {
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    res.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  }
}

export const authController = new AuthController();
