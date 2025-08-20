import type { Request, Response, NextFunction } from 'express';
import { identityResolver } from './identity-resolver';
import type { User } from '@shared/schema';

/**
 * SESSION-AUTHENTICATION BRIDGE
 * Fixes the critical disconnect between session storage and authentication state
 * Ensures req.isAuthenticated() accurately reflects actual user session data
 */

// Extend Express Request type for session bridge
declare global {
  namespace Express {
    interface Request {
      authBridge?: {
        user: User;
        method: 'replit' | 'jwt' | 'whatsapp';
        isAuthenticated: boolean;
      };
    }
  }
}

/**
 * Core Session Bridge Middleware
 * This middleware runs before all authentication checks and ensures consistency
 */
// Public routes that don't need auth checks
const PUBLIC_ROUTES = [
  '/api/glossary',
  '/api/questions/attachments',
  '/assets',
  '/favicon.ico',
  '/api/auth',
  '/api/health'
];

// Skip auth bridge for public routes and static assets
const shouldSkipAuth = (path: string): boolean => {
  return PUBLIC_ROUTES.some(route => path.startsWith(route)) || 
         path.includes('.') && !path.includes('/api/') ||
         path === '/';
};

export const sessionBridge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip auth checks for public routes to reduce unnecessary processing
    if (shouldSkipAuth(req.path)) {
      next();
      return;
    }

    let user: User | null = null;
    let method: 'replit' | 'jwt' | 'whatsapp' = 'replit';

    // Check 1: Replit session data - handle multiple session formats
    let sessionUserId = null;
    
    if (req.user) {
      // Try different ways to extract user ID from session
      sessionUserId = (req.user as any).claims?.sub || 
                      (req.user as any).userId || 
                      (req.user as any).id || 
                      (req.user as any).dbUser?.id;
    }
    
    if (sessionUserId) {
      user = await identityResolver.resolveUserByAnyMethod(sessionUserId, 'replit');
      if (user) {
        method = 'replit';
        // Ensure user has unified identity
        await identityResolver.ensureUserHasUnifiedIdentity(user, 'replit', sessionUserId);
      }
    }

    // Check 2: If session exists but no user found, try to find user by any method
    if (req.user && !user && sessionUserId) {
      // Try to find user by the session ID using any method
      user = await identityResolver.resolveUserByAnyMethod(sessionUserId);
      
      if (user) {
        method = 'replit';
      } else {
        // Clear invalid session quietly
        req.logout(() => {});
        req.session?.destroy(() => {});
      }
    }

    // Check 3: JWT token authentication with unified secret
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    if (token && !user) {
      try {
        const jwt = await import('jsonwebtoken');
        // Use consistent JWT secret across all auth methods
        const JWT_SECRET = process.env.JWT_SECRET || 'qaaq-connect-secret-key';
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        
        user = await identityResolver.resolveUserByAnyMethod(decoded.userId, 'jwt');
        if (user) {
          method = 'jwt';
        }
      } catch (error) {
        // Silent JWT validation - no need to log every invalid token
      }
    }

    // Attach bridge data to request
    if (user) {
      req.authBridge = {
        user,
        method,
        isAuthenticated: true
      };
      
      // CRITICAL: Override req.isAuthenticated to return bridge state  
      const originalIsAuth = req.isAuthenticated;
      req.isAuthenticated = () => true;
      req.user = {
        ...req.user,
        bridgeUser: user,
        bridgeMethod: method
      };
    } else {
      req.authBridge = {
        user: null as any,
        method: 'replit',
        isAuthenticated: false
      };
      
      // CRITICAL: Override req.isAuthenticated to return false
      const originalIsAuth = req.isAuthenticated;
      req.isAuthenticated = () => false;
    }

    next();
  } catch (error) {
    console.error('🚨 SESSION BRIDGE ERROR:', error);
    next();
  }
};

/**
 * Enhanced authentication check that uses the bridge
 */
export const bridgedAuth = (req: Request): { user: User | null; isAuthenticated: boolean; method?: string } => {
  if (req.authBridge?.isAuthenticated && req.authBridge.user) {
    return {
      user: req.authBridge.user,
      isAuthenticated: true,
      method: req.authBridge.method
    };
  }
  
  return {
    user: null,
    isAuthenticated: false
  };
};

/**
 * Middleware to require authentication using the bridge
 */
export const requireBridgedAuth = (req: Request, res: Response, next: NextFunction) => {
  const auth = bridgedAuth(req);
  
  if (!auth.isAuthenticated || !auth.user) {
    return res.status(401).json({ 
      message: 'Authentication required',
      bridgeState: req.authBridge?.isAuthenticated || false
    });
  }
  
  // Attach user to request for backward compatibility
  (req as any).currentUser = auth.user;
  (req as any).userId = auth.user.id;
  
  next();
};