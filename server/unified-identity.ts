import { pool } from './db';
import { storage } from './storage';
import type { User } from '@shared/schema';
import jwt from 'jsonwebtoken';
import { getJWTSecret } from './secret-validation.js';

export interface UnifiedUser {
  id: string;
  fullName: string;
  email: string;
  authMethod: 'jwt' | 'session' | 'oauth' | 'none';
  isAdmin: boolean;
  isPremium: boolean;
  whatsAppNumber?: string;
  userId?: string; // Legacy user ID
  rank?: string;
  city?: string;
  country?: string;
}

export interface AuthMethod {
  type: 'jwt' | 'session' | 'oauth';
  provider?: string;
  verified: boolean;
}

/**
 * Unified Identity Service - Single source of truth for user authentication
 * Resolves users across JWT, Session, and OAuth without excessive queries
 */
export class UnifiedIdentityService {
  private userCache = new Map<string, { user: UnifiedUser; expires: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes cache

  /**
   * Resolve user from any identifier with caching to prevent excessive queries
   */
  async resolveUser(identifier: string): Promise<UnifiedUser | null> {
    if (!identifier) return null;

    // Check cache first to avoid database queries
    const cached = this.userCache.get(identifier);
    if (cached && cached.expires > Date.now()) {
      return cached.user;
    }

    try {
      let user: any = null;

      // Single optimized query to find user by any identifier
      const result = await pool.query(`
        SELECT 
          id, full_name, email, user_id, is_admin, is_premium, 
          whatsapp_number, rank, city, country, primary_auth_provider,
          google_id, auth_provider
        FROM users 
        WHERE 
          id = $1 OR 
          email = $1 OR 
          whatsapp_number = $1 OR 
          user_id = $1 OR
          google_id = $1
        LIMIT 1
      `, [identifier]);

      if (result.rows.length > 0) {
        user = result.rows[0];
      }

      if (!user) return null;

      // Build unified user object
      const unifiedUser: UnifiedUser = {
        id: user.id,
        fullName: user.full_name || 'Unknown User',
        email: user.email || '',
        authMethod: this.determineAuthMethod(user),
        isAdmin: user.is_admin || false,
        isPremium: user.is_premium || false,
        whatsAppNumber: user.whatsapp_number,
        userId: user.user_id,
        rank: user.rank,
        city: user.city,
        country: user.country
      };

      // Cache the result to prevent repeated queries
      this.userCache.set(identifier, {
        user: unifiedUser,
        expires: Date.now() + this.cacheTimeout
      });

      return unifiedUser;
    } catch (error) {
      console.error('🚨 UnifiedIdentityService: Error resolving user:', error);
      return null;
    }
  }

  /**
   * Determine primary auth method based on user data
   */
  private determineAuthMethod(user: any): 'jwt' | 'session' | 'oauth' {
    if (user.primary_auth_provider === 'google' || user.google_id) {
      return 'oauth';
    }
    if (user.auth_provider === 'replit' || user.primary_auth_provider === 'replit') {
      return 'session';
    }
    return 'jwt'; // Default to JWT for QAAQ users
  }

  /**
   * Verify JWT token and return user (cached)
   */
  async verifyJWTUser(token: string): Promise<UnifiedUser | null> {
    try {
      const decoded = jwt.verify(token, getJWTSecret()) as any;
      
      if (!decoded.userId) {
        return null;
      }

      const user = await this.resolveUser(decoded.userId);
      
      return user;
    } catch (error) {
      console.error('❌ JWT verification error:', error);
      return null;
    }
  }

  /**
   * Clear cache for a specific user (on logout, profile update)
   */
  clearUserCache(identifier: string): void {
    this.userCache.delete(identifier);
  }

  /**
   * Clear all cache (memory cleanup)
   */
  clearAllCache(): void {
    this.userCache.clear();
  }

  /**
   * Update user's last login without excessive database writes
   */
  async updateLastLoginOptimized(userId: string): Promise<void> {
    // Only update if last login was more than 1 hour ago to reduce database writes
    try {
      await pool.query(`
        UPDATE users 
        SET 
          last_login = NOW(),
          login_count = login_count + 1
        WHERE 
          id = $1 
          AND (last_login IS NULL OR last_login < NOW() - INTERVAL '1 hour')
      `, [userId]);
    } catch (error) {
      // Silent fail - don't break auth for login tracking
      console.log('Note: Could not update login tracking');
    }
  }
}

// Export singleton instance
export const unifiedIdentity = new UnifiedIdentityService();