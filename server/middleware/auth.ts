/**
 * LessonFlow Authentication Middleware
 * 
 * Supports:
 * 1. Bearer API Token (for future Chrome Extension and external clients)
 * 2. Custom header `x-api-token`
 * 3. User switcher header `x-user-id` (for testing multi-user isolation in the UI)
 * 4. Fallback to active demo teacher profile
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../db.js';
import { User } from '../../src/types/index.js';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: User;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const apiTokenHeader = req.headers['x-api-token'];
  const userIdHeader = req.headers['x-user-id'] as string;

  let user: User | undefined;

  // 1. Check API token (Bearer token or x-api-token)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    user = db.getUserByToken(token);
  } else if (apiTokenHeader && typeof apiTokenHeader === 'string') {
    user = db.getUserByToken(apiTokenHeader.trim());
  }

  // 2. Check direct x-user-id header for multi-user testing in the web UI
  if (!user && userIdHeader) {
    user = db.getUser(userIdHeader);
  }

  // 3. Fallback to default teacher if no user identified
  if (!user) {
    const users = db.listUsers();
    user = users[0];
  }

  if (!user) {
    res.status(401).json({ error: 'Unauthorized: No active user found.' });
    return;
  }

  req.user = user;
  next();
}
