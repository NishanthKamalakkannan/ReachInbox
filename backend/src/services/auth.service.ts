import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { GoogleProfile } from '../types/auth.types';

export class AuthService {
  private googleClient: OAuth2Client;

  constructor() {
    this.googleClient = new OAuth2Client(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_CALLBACK_URL
    );
  }

  /**
   * Generates Google OAuth 2.0 authorization URL
   */
  getGoogleAuthUrl(): string {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      // If Google credentials are not configured, log clear instructions
      logger.warn('GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing in environment variables.');
    }

    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    return this.googleClient.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
    });
  }

  /**
   * Exchanges Google authorization code for tokens, verifies profile, and finds or creates User
   */
  async handleGoogleCallback(code: string): Promise<{ token: string; user: any }> {
    const { tokens } = await this.googleClient.getToken(code);
    this.googleClient.setCredentials(tokens);

    // Fetch user profile from Google UserInfo API
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to retrieve user profile from Google.');
    }

    const profile = (await userInfoResponse.json()) as GoogleProfile;
    const googleId = profile.sub || profile.id;

    if (!googleId) {
      throw new Error('Google did not return a user identifier (sub/id).');
    }

    // Upsert User in PostgreSQL by checking either googleId or email
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId }, { email: profile.email }],
      },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId,
          name: profile.name,
          email: profile.email,
          avatar: profile.picture || null,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          googleId,
          name: profile.name,
          email: profile.email,
          avatar: profile.picture || null,
        },
      });
    }

    // Ensure user has at least one default sender record
    const existingSender = await prisma.sender.findFirst({
      where: { userId: user.id },
    });

    if (!existingSender) {
      await prisma.sender.create({
        data: {
          userId: user.id,
          email: user.email,
        },
      });
    }

    const token = this.generateJwt(user.id);
    return { token, user };
  }

  /**
   * Generates signed JWT for session cookie
   */
  generateJwt(userId: string): string {
    return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: '7d' });
  }

  /**
   * Provisions or returns a demo user for local test & verification when external OAuth is bypassed
   */
  async getOrCreateDemoUser() {
    const user = await prisma.user.upsert({
      where: { email: 'demo@reachinbox.ai' },
      update: {},
      create: {
        id: '11111111-1111-4111-a111-111111111111',
        googleId: 'google-demo-12345',
        name: 'ReachInbox Demo User',
        email: 'demo@reachinbox.ai',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      },
    });

    // Ensure default sender with proper UUID
    const sender = await prisma.sender.findFirst({
      where: { userId: user.id },
    });

    if (!sender) {
      await prisma.sender.create({
        data: {
          id: '22222222-2222-4222-a222-222222222222',
          userId: user.id,
          email: 'alex.sales@reachinbox.ai',
        },
      });
    }

    const token = this.generateJwt(user.id);
    return { token, user };
  }
}

export const authService = new AuthService();
