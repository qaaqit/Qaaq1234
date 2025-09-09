/**
 * Dedicated Authentication Connection Pool
 * Separates auth queries from regular database operations
 * Can be disabled via environment variable to use shared pool
 */

import { pool as sharedPool } from './db';
import pg from 'pg';
const { Pool } = pg;

class AuthConnectionPool {
  private authPool: Pool | null = null;
  private readonly AUTH_POOL_CONFIG = {
    max: 5, // Smaller pool for auth queries
    idleTimeoutMillis: 10000, // 10 seconds idle timeout
    connectionTimeoutMillis: 3000, // 3 seconds connection timeout
    query_timeout: 5000, // 5 seconds query timeout
    statement_timeout: 5000, // 5 seconds statement timeout
  };

  /**
   * Check if dedicated auth pool is enabled
   */
  isEnabled(): boolean {
    return process.env.USE_SHARED_POOL !== 'true';
  }

  /**
   * Initialize the dedicated auth pool
   */
  initialize(): Pool | null {
    if (!this.isEnabled()) {
      console.log('⚠️ AUTH POOL: Using shared connection pool (dedicated pool disabled)');
      return null;
    }

    if (this.authPool) {
      return this.authPool;
    }

    try {
      const connectionString = process.env.DATABASE_URL || process.env.QAAQ_DATABASE_URL;
      
      if (!connectionString) {
        console.error('❌ AUTH POOL: No database connection string found');
        return null;
      }

      this.authPool = new Pool({
        connectionString,
        ...this.AUTH_POOL_CONFIG,
        application_name: 'qaaq_auth_pool'
      });

      // Set up event listeners
      this.authPool.on('connect', () => {
        console.log('✅ AUTH POOL: New connection established');
      });

      this.authPool.on('error', (err) => {
        console.error('❌ AUTH POOL: Connection error:', err.message);
      });

      this.authPool.on('remove', () => {
        console.log('🔄 AUTH POOL: Connection removed from pool');
      });

      console.log(`✅ AUTH POOL: Initialized with max ${this.AUTH_POOL_CONFIG.max} connections`);
      return this.authPool;
    } catch (error: any) {
      console.error('❌ AUTH POOL: Failed to initialize:', error.message);
      return null;
    }
  }

  /**
   * Get the appropriate pool for auth queries
   */
  getPool(): Pool | null {
    if (!this.isEnabled()) {
      // Return null to indicate shared pool should be used
      return null;
    }

    if (!this.authPool) {
      return this.initialize();
    }

    return this.authPool;
  }

  /**
   * Execute an authentication query with automatic pool selection
   */
  async query(text: string, params?: any[], useSharedPool?: Pool): Promise<any> {
    const startTime = Date.now();
    let pool = this.getPool();

    // If dedicated pool is disabled or unavailable, use shared pool
    if (!pool && useSharedPool) {
      pool = useSharedPool;
      console.log('🔄 AUTH POOL: Falling back to shared pool');
    }

    if (!pool) {
      throw new Error('No database pool available for authentication query');
    }

    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - startTime;
      
      if (duration > 1000) {
        console.warn(`⚠️ AUTH POOL: Slow query (${duration}ms)`);
      } else {
        console.log(`✅ AUTH POOL: Query completed (${duration}ms)`);
      }

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ AUTH POOL: Query failed after ${duration}ms:`, error.message);
      throw error;
    }
  }

  /**
   * Get pool statistics
   */
  async getStats(): Promise<{
    enabled: boolean;
    totalConnections: number;
    idleConnections: number;
    waitingClients: number;
    poolType: 'dedicated' | 'shared';
  }> {
    const pool = this.getPool();
    
    if (!pool) {
      return {
        enabled: false,
        totalConnections: 0,
        idleConnections: 0,
        waitingClients: 0,
        poolType: 'shared'
      };
    }

    return {
      enabled: true,
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingClients: pool.waitingCount,
      poolType: 'dedicated'
    };
  }

  /**
   * Gracefully shutdown the auth pool
   */
  async shutdown(): Promise<void> {
    if (this.authPool) {
      console.log('🔄 AUTH POOL: Shutting down...');
      await this.authPool.end();
      this.authPool = null;
      console.log('✅ AUTH POOL: Shutdown complete');
    }
  }

  /**
   * Health check for auth pool
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      const pool = this.getPool();
      if (!pool) {
        return {
          healthy: true, // Shared pool mode is "healthy"
          latency: 0,
          error: 'Using shared pool'
        };
      }

      await pool.query('SELECT 1');
      const latency = Date.now() - startTime;
      
      return {
        healthy: latency < 3000, // Accept up to 3s for Neon EU
        latency
      };
    } catch (error: any) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        error: error.message
      };
    }
  }
}

// Export singleton instance
export const authPool = new AuthConnectionPool();