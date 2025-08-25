import type { Request, Response, NextFunction } from 'express';
import { unifiedIdentity } from './unified-identity';

/**
 * Unified Authentication Middleware
 * Handles JWT, Session, and OAuth authentication without excessive queries
 * Performance optimized with caching and minimal database calls
 */

// Extend Request type for unified user
declare global {
  namespace Express {
    interface Request {
      unifiedUser?: {
        id: string;
        fullName: string;
        email: string;
        authMethod: 'jwt' | 'session' | 'oauth' | 'none';
        isAdmin: boolean;
        isPremium: boolean;
        whatsAppNumber?: string;
        userId?: string;
        rank?: string;
        city?: string;
        country?: string;
      };
    }
  }
}

/**
 * Middleware to check authentication across all methods
 * Does not reject - just populates req.unifiedUser if authenticated
 */
export const unifiedAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let user = null;

    // 1. Check JWT Token first (fastest)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      user = await unifiedIdentity.verifyJWTUser(token);
      if (user) {
        req.unifiedUser = user;
        return next();
      }
    }

    // 2. Check session-based authentication (Replit/Google)
    if (req.session && (req.session as any).passport?.user) {
      const sessionUserId = (req.session as any).passport.user;
      user = await unifiedIdentity.resolveUser(sessionUserId);
      if (user) {
        req.unifiedUser = { ...user, authMethod: 'session' };
        return next();
      }
    }

    // 3. Check for direct user in session (legacy)
    if (req.session && (req.session as any).user) {
      const sessionUser = (req.session as any).user;
      user = await unifiedIdentity.resolveUser(sessionUser.id);
      if (user) {
        req.unifiedUser = { ...user, authMethod: 'session' };
        return next();
      }
    }

    // No authentication found - but don't block, let route handle it
    req.unifiedUser = null;
    next();
  } catch (error) {
    console.error('🚨 Unified Auth Middleware Error:', error);
    req.unifiedUser = null;
    next();
  }
};

/**
 * Require authentication middleware - blocks unauthenticated users
 */
export const requireUnifiedAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.unifiedUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      redirectTo: '/login'
    });
  }
  next();
};

/**
 * Require admin middleware
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.unifiedUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      redirectTo: '/login'
    });
  }

  if (!req.unifiedUser.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
};

/**
 * Optional auth middleware - populates user if available, continues if not
 * Perfect for pages that work with or without authentication
 */
export const optionalAuth = unifiedAuthMiddleware;