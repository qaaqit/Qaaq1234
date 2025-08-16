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
    console.log('🌉 SESSION BRIDGE: Checking authentication state');
    
    let user: User | null = null;
    let method: 'replit' | 'jwt' | 'whatsapp' = 'replit';

    // Check 1: Replit session data
    if (req.user && (req.user as any).claims?.sub) {
      const userId = (req.user as any).claims.sub;
      console.log('🌉 SESSION BRIDGE: Found Replit session data:', userId);
      
      user = await identityResolver.resolveUserByAnyMethod(userId, 'replit');
      if (user) {
        method = 'replit';
        console.log('✅ SESSION BRIDGE: Resolved Replit user:', user.fullName);
        
        // Ensure user has unified identity
        await identityResolver.ensureUserHasUnifiedIdentity(user, 'replit', userId);
      }
    }

    // Check 2: If Replit session exists but no user found, force re-authentication
    if (req.user && !user) {
      console.log('⚠️ SESSION BRIDGE: Session exists but user not found - clearing session');
      req.logout(() => {});
      req.session?.destroy(() => {});
    }

    // Check 3: JWT token authentication
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    if (token && !user) {
      try {
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'qaaq_jwt_secret_key_2024_secure') as { userId: string };
        
        user = await identityResolver.resolveUserByAnyMethod(decoded.userId, 'jwt');
        if (user) {
          method = 'jwt';
          console.log('✅ SESSION BRIDGE: Resolved JWT user:', user.fullName);
        }
      } catch (error) {
        console.log('❌ SESSION BRIDGE: Invalid JWT token');
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
      
      console.log(`✅ SESSION BRIDGE: Authentication bridged - ${user.fullName} (${method})`);
    } else {
      req.authBridge = {
        user: null as any,
        method: 'replit',
        isAuthenticated: false
      };
      
      // CRITICAL: Override req.isAuthenticated to return false
      req.isAuthenticated = () => false;
      
      console.log('❌ SESSION BRIDGE: No authentication found');
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