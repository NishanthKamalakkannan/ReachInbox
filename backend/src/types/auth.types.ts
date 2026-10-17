import { Request } from 'express';

export interface AuthUser {
  id: string;
  googleId: string;
  name: string;
  email: string;
  avatar?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export interface GoogleProfile {
  sub?: string;
  id?: string;
  email: string;
  name: string;
  picture?: string;
}
