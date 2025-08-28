/**
 * Authentication Rate Limiting Middleware
 * Prevents authentication flooding with reversible toggle
 * Can be disabled instantly via environment variable
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  requests: number[];
  blocked: boolean;
}

class AuthRateLimiter {
  private limits: Map<string, RateLimitEntry>;
  private readonly WINDOW_MS = 60000; // 1 minute window
  private readonly MAX_REQUESTS = 10; // 10 requests per minute
  private readonly BLOCK_DURATION_MS = 300000; // 5 minute block after limit exceeded

  constructor() {
    this.limits = new Map();
    // Cleanup old entries every 5 minutes
    setInterval(() => this.cleanup(), 300000);
  }

  /**
   * Check if rate limiting is enabled
   */
  isEnabled(): boolean {
    return process.env.DISABLE_RATE_LIMITING !== 'true';
  }

  /**
   * Express middleware for rate limiting auth endpoints
   */
  middleware = (req: Request, res: Response, next: NextFunction): void => {
    // Skip if rate limiting is disabled
    if (!this.isEnabled()) {
      return next();
    }

    // Use IP address or session ID as identifier
    const identifier = req.ip || req.sessionID || 'unknown';
    const now = Date.now();

    // Get or create rate limit entry
    let entry = this.limits.get(identifier);
    if (!entry) {
      entry = { requests: [], blocked: false };
      this.limits.set(identifier, entry);
    }

    // Check if currently blocked
    if (entry.blocked) {
      console.log(`🚫 RATE LIMIT: Blocked request from ${identifier}`);
      res.status(429).json({
        error: 'Too many authentication attempts. Please try again later.',
        retryAfter: Math.ceil(this.BLOCK_DURATION_MS / 1000)
      });
      return;
    }

    // Filter requests within the time window
    entry.requests = entry.requests.filter(time => now - time < this.WINDOW_MS);

    // Check if limit exceeded
    if (entry.requests.length >= this.MAX_REQUESTS) {
      entry.blocked = true;
      // Unblock after duration
      setTimeout(() => {
        const e = this.limits.get(identifier);
        if (e) {
          e.blocked = false;
          e.requests = [];
        }
      }, this.BLOCK_DURATION_MS);

      console.log(`🚫 RATE LIMIT: Blocking ${identifier} for ${this.BLOCK_DURATION_MS / 1000}s`);
      res.status(429).json({
        error: 'Rate limit exceeded. Too many authentication attempts.',
        retryAfter: Math.ceil(this.BLOCK_DURATION_MS / 1000)
      });
      return;
    }

    // Add current request
    entry.requests.push(now);

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', this.MAX_REQUESTS.toString());
    res.setHeader('X-RateLimit-Remaining', (this.MAX_REQUESTS - entry.requests.length).toString());
    res.setHeader('X-RateLimit-Reset', new Date(now + this.WINDOW_MS).toISOString());

    console.log(`✅ RATE LIMIT: Request allowed for ${identifier} (${entry.requests.length}/${this.MAX_REQUESTS})`);
    next();
  };

  /**
   * Apply rate limiting to specific auth routes
   */
  applyToRoutes(app: any): void {
    if (!this.isEnabled()) {
      console.log('⚠️ RATE LIMIT: Disabled via environment variable');
      return;
    }

    // Apply to authentication endpoints
    const authEndpoints = [
      '/api/auth/user',
      '/api/auth/google',
      '/api/auth/google/callback',
      '/api/auth/verify-token',
      '/api/login',
      '/api/callback',
      '/api/logout'
    ];

    authEndpoints.forEach(endpoint => {
      app.use(endpoint, this.middleware);
    });

    console.log(`✅ RATE LIMIT: Applied to ${authEndpoints.length} auth endpoints`);
  }

  /**
   * Clean up old entries to prevent memory bloat
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, value] of this.limits.entries()) {
      // Remove entries with no recent requests and not blocked
      const hasRecentRequests = value.requests.some(time => now - time < this.WINDOW_MS * 2);
      if (!hasRecentRequests && !value.blocked) {
        this.limits.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`🧹 RATE LIMIT: Cleaned up ${removed} inactive entries`);
    }
  }

  /**
   * Get rate limiter statistics
   */
  getStats(): { 
    enabled: boolean; 
    trackedIPs: number; 
    blockedIPs: number;
    windowMs: number;
    maxRequests: number;
  } {
    let blockedCount = 0;
    for (const entry of this.limits.values()) {
      if (entry.blocked) blockedCount++;
    }

    return {
      enabled: this.isEnabled(),
      trackedIPs: this.limits.size,
      blockedIPs: blockedCount,
      windowMs: this.WINDOW_MS,
      maxRequests: this.MAX_REQUESTS
    };
  }

  /**
   * Manually unblock an IP (for admin use)
   */
  unblock(identifier: string): boolean {
    const entry = this.limits.get(identifier);
    if (entry) {
      entry.blocked = false;
      entry.requests = [];
      console.log(`🔓 RATE LIMIT: Manually unblocked ${identifier}`);
      return true;
    }
    return false;
  }
}

// Export singleton instance
export const authRateLimiter = new AuthRateLimiter();