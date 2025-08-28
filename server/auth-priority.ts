/**
 * Smart Authentication Priority System
 * Checks authentication methods in optimal order for performance
 * Can revert to legacy order via environment variable
 */

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getJWTSecret } from './secret-validation';
import { storage } from './storage';
import { identityResolver } from './identity-resolver';
import { authCache } from './auth-cache';

export class SmartAuthPriority {
  /**
   * Check if smart priority is enabled
   */
  isEnabled(): boolean {
    return process.env.USE_LEGACY_AUTH_ORDER !== 'true';
  }

  /**
   * Smart authentication check with optimized order
   * JWT -> Cache -> Session -> OAuth
   */
  async checkAuthentication(req: any, res: Response): Promise<{ 
    user: any | null; 
    method: 'jwt' | 'google' | 'replit' | 'session' | 'cache' | null;
    fromCache: boolean;
  }> {
    const startTime = Date.now();
    const sessionId = req.sessionID || req.ip || 'unknown';

    // If using legacy order, skip optimizations
    if (!this.isEnabled()) {
      console.log('🔄 AUTH PRIORITY: Using legacy authentication order');
      return this.legacyAuthCheck(req, res);
    }

    console.log('🎯 AUTH PRIORITY: Using optimized authentication order');

    // Step 1: Check cache first (fastest)
    const cached = authCache.get(sessionId);
    if (cached) {
      console.log(`⚡ AUTH PRIORITY: Cache hit (${Date.now() - startTime}ms)`);
      return {
        user: cached.user,
        method: cached.method,
        fromCache: true
      };
    }

    // Step 2: Check JWT token (second fastest - no DB query)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, getJWTSecret()) as any;
        
        if (decoded.userId) {
          // Quick user lookup
          const user = await storage.getUserById(decoded.userId);
          if (user) {
            console.log(`⚡ AUTH PRIORITY: JWT authenticated (${Date.now() - startTime}ms)`);
            // Cache the result
            authCache.set(sessionId, user, 'jwt');
            return {
              user,
              method: 'jwt',
              fromCache: false
            };
          }
        }
      } catch (error) {
        console.log('🔍 AUTH PRIORITY: JWT verification failed, trying next method');
      }
    }

    // Step 3: Check Google OAuth session (passport)
    if (req.session?.passport?.user) {
      const user = req.session.passport.user;
      console.log(`⚡ AUTH PRIORITY: Google OAuth authenticated (${Date.now() - startTime}ms)`);
      // Cache the result
      authCache.set(sessionId, user, 'google');
      return {
        user,
        method: 'google',
        fromCache: false
      };
    }

    // Step 4: Check Replit Auth session
    if (req.user) {
      const replitUserId = (req.user as any).claims?.sub || 
                          (req.user as any).id || 
                          (req.user as any).userId;
      
      if (replitUserId) {
        try {
          const user = await identityResolver.resolveUserByAnyMethod(replitUserId, 'replit');
          if (user) {
            console.log(`⚡ AUTH PRIORITY: Replit authenticated (${Date.now() - startTime}ms)`);
            // Cache the result
            authCache.set(sessionId, user, 'replit');
            return {
              user,
              method: 'replit',
              fromCache: false
            };
          }
        } catch (error) {
          console.log('🔍 AUTH PRIORITY: Replit auth resolution failed');
        }
      }
    }

    console.log(`❌ AUTH PRIORITY: No authentication found (${Date.now() - startTime}ms)`);
    return {
      user: null,
      method: null,
      fromCache: false
    };
  }

  /**
   * Legacy authentication check (original order)
   * Session -> OAuth -> JWT
   */
  private async legacyAuthCheck(req: any, res: Response): Promise<{
    user: any | null;
    method: 'jwt' | 'google' | 'replit' | 'session' | null;
    fromCache: boolean;
  }> {
    const startTime = Date.now();

    // Check session first (original behavior)
    if (req.session?.passport?.user) {
      console.log(`🔄 LEGACY AUTH: Session authenticated (${Date.now() - startTime}ms)`);
      return {
        user: req.session.passport.user,
        method: 'session',
        fromCache: false
      };
    }

    // Check Replit Auth
    if (req.user) {
      const replitUserId = (req.user as any).claims?.sub || (req.user as any).userId;
      if (replitUserId) {
        try {
          const user = await identityResolver.resolveUserByAnyMethod(replitUserId, 'replit');
          if (user) {
            console.log(`🔄 LEGACY AUTH: Replit authenticated (${Date.now() - startTime}ms)`);
            return {
              user,
              method: 'replit',
              fromCache: false
            };
          }
        } catch (error) {
          console.log('🔄 LEGACY AUTH: Replit auth failed');
        }
      }
    }

    // Check JWT last (original behavior)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, getJWTSecret()) as any;
        const user = await storage.getUserById(decoded.userId);
        if (user) {
          console.log(`🔄 LEGACY AUTH: JWT authenticated (${Date.now() - startTime}ms)`);
          return {
            user,
            method: 'jwt',
            fromCache: false
          };
        }
      } catch (error) {
        console.log('🔄 LEGACY AUTH: JWT verification failed');
      }
    }

    console.log(`❌ LEGACY AUTH: No authentication found (${Date.now() - startTime}ms)`);
    return {
      user: null,
      method: null,
      fromCache: false
    };
  }

  /**
   * Get authentication statistics
   */
  getStats(): {
    enabled: boolean;
    mode: 'optimized' | 'legacy';
    cacheEnabled: boolean;
    priorityOrder: string[];
  } {
    const enabled = this.isEnabled();
    return {
      enabled,
      mode: enabled ? 'optimized' : 'legacy',
      cacheEnabled: authCache.isEnabled(),
      priorityOrder: enabled 
        ? ['cache', 'jwt', 'google-oauth', 'replit-auth']
        : ['session', 'replit-auth', 'jwt']
    };
  }
}

// Export singleton instance
export const smartAuthPriority = new SmartAuthPriority();