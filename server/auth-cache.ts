/**
 * Authentication Caching Layer
 * Provides reversible caching for authentication results
 * Can be disabled instantly via environment variable
 */

interface CachedAuth {
  user: any;
  method: 'jwt' | 'google' | 'replit' | 'session';
  timestamp: number;
  sessionId: string;
}

class AuthCache {
  private cache: Map<string, CachedAuth>;
  private readonly TTL_MS = 30000; // 30 seconds default TTL
  private readonly MAX_ENTRIES = 1000; // Prevent memory bloat

  constructor() {
    this.cache = new Map();
    // Cleanup old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if caching is enabled via environment variable
   */
  isEnabled(): boolean {
    return process.env.DISABLE_AUTH_CACHE !== 'true';
  }

  /**
   * Get cached authentication result
   */
  get(sessionId: string): CachedAuth | null {
    if (!this.isEnabled()) {
      return null;
    }

    const cached = this.cache.get(sessionId);
    if (!cached) {
      return null;
    }

    // Check if cache entry is still valid
    const now = Date.now();
    if (now - cached.timestamp > this.TTL_MS) {
      this.cache.delete(sessionId);
      return null;
    }

    console.log(`📦 AUTH CACHE: Hit for session ${sessionId} (age: ${Math.round((now - cached.timestamp) / 1000)}s)`);
    return cached;
  }

  /**
   * Store authentication result in cache
   */
  set(sessionId: string, user: any, method: CachedAuth['method']): void {
    if (!this.isEnabled()) {
      return;
    }

    // Prevent cache from growing too large
    if (this.cache.size >= this.MAX_ENTRIES) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(sessionId, {
      user,
      method,
      timestamp: Date.now(),
      sessionId
    });

    console.log(`📦 AUTH CACHE: Stored for session ${sessionId} (method: ${method})`);
  }

  /**
   * Clear specific session from cache
   */
  invalidate(sessionId: string): void {
    if (this.cache.has(sessionId)) {
      this.cache.delete(sessionId);
      console.log(`📦 AUTH CACHE: Invalidated session ${sessionId}`);
    }
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`📦 AUTH CACHE: Cleared ${size} entries`);
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    if (!this.isEnabled()) {
      this.clear();
      return;
    }

    const now = Date.now();
    let removed = 0;

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.TTL_MS) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`📦 AUTH CACHE: Cleaned up ${removed} expired entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; enabled: boolean; ttl: number } {
    return {
      size: this.cache.size,
      enabled: this.isEnabled(),
      ttl: this.TTL_MS
    };
  }
}

// Export singleton instance
export const authCache = new AuthCache();