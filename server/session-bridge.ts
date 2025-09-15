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
export const sessionBridge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // DISABLED: All session bridge logging to prevent constant polling
    // console.log('🌉 SESSION BRIDGE: Checking authentication state');
    
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
      
      console.log('🌉 SESSION BRIDGE: Checking session data:', {
        hasClaims: !!(req.user as any).claims,
        hasUserId: !!(req.user as any).userId,
        hasId: !!(req.user as any).id,
        hasDbUser: !!(req.user as any).dbUser,
        extractedId: sessionUserId
      });
    }
    
    if (sessionUserId) {
      console.log('🌉 SESSION BRIDGE: Found session user ID:', sessionUserId);
      
      user = await identityResolver.resolveUserByAnyMethod(sessionUserId, 'replit');
      if (user) {
        method = 'replit';
        console.log('✅ SESSION BRIDGE: Resolved session user:', user.fullName);
        
        // Ensure user has unified identity
        await identityResolver.ensureUserHasUnifiedIdentity(user, 'replit', sessionUserId);
      } else {
        console.log('❌ SESSION BRIDGE: Session user ID found but user not in database:', sessionUserId);
      }
    }

    // Check 2: If session exists but no user found, try to find user by any method
    if (req.user && !user && sessionUserId) {
      console.log('🔍 SESSION BRIDGE: Session exists but user not found, trying comprehensive lookup');
      
      // Try to find user by the session ID using any method
      user = await identityResolver.resolveUserByAnyMethod(sessionUserId);
      
      if (user) {
        method = 'replit';
        console.log('✅ SESSION BRIDGE: Found user via comprehensive lookup:', user.fullName);
      } else {
        console.log('⚠️ SESSION BRIDGE: Session exists but user not found anywhere - clearing session');
        req.logout(() => {});
        req.session?.destroy(() => {});
      }
    }

    // Check 3: JWT token authentication
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    if (token && !user) {
      try {
        const jwt = await import('jsonwebtoken');
        const { getJWTSecret } = await import('./secret-validation');
        const decoded = jwt.verify(token, getJWTSecret()) as { userId: string };
        
        user = await identityResolver.resolveUserByAnyMethod(decoded.userId, 'jwt');
        if (user) {
          method = 'jwt';
          console.log('✅ SESSION BRIDGE: Resolved JWT user:', user.fullName);
        }
      } catch (error) {
        // Silent fail for JWT tokens - unified auth middleware handles this better
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
      req.isAuthenticated = () => true;
      req.user = {
        ...req.user,
        bridgeUser: user,
        bridgeMethod: method
      };
      
      // console.log(`✅ SESSION BRIDGE: Authentication bridged - ${user.fullName} (${method})`);
    } else {
      req.authBridge = {
        user: null as any,
        method: 'replit',
        isAuthenticated: false
      };
      
      // CRITICAL: Override req.isAuthenticated to return false
      req.isAuthenticated = () => false;
      
      // console.log('❌ SESSION BRIDGE: No authentication found');
    }

    next();
  } catch (error) {
    // console.error('🚨 SESSION BRIDGE ERROR:', error);
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