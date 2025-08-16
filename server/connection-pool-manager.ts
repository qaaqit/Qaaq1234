import { Pool } from '@neondatabase/serverless';
import { pool } from './db';

/**
 * Advanced Connection Pool Manager
 * Optimizes database connections and prevents resource exhaustion
 */
class ConnectionPoolManager {
  private poolStats = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    waitingRequests: 0,
    connectionErrors: 0,
    queryCount: 0,
    lastReset: Date.now()
  };

  private monitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  /**
   * Start monitoring pool health
   */
  startMonitoring(): void {
    if (this.monitoring) return;

    this.monitoring = true;
    console.log('📊 Starting connection pool monitoring...');

    this.monitoringInterval = setInterval(() => {
      this.logPoolStats();
    }, 2 * 60 * 1000); // Every 2 minutes

    // Log initial stats
    this.logPoolStats();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.monitoring) return;

    this.monitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('📊 Connection pool monitoring stopped');
  }

  /**
   * Execute query with connection tracking
   */
  async executeQuery(
    query: string, 
    params: any[] = []
  ): Promise<any> {
    const startTime = Date.now();
    let client;

    try {
      this.poolStats.waitingRequests++;
      client = await pool.connect();
      this.poolStats.waitingRequests--;
      this.poolStats.activeConnections++;
      this.poolStats.queryCount++;

      const result = await client.query(query, params);
      const duration = Date.now() - startTime;

      // Log slow queries
      if (duration > 1000) {
        console.warn(`🐌 Slow query detected (${duration}ms): ${query.substring(0, 100)}...`);
      }

      return result;
    } catch (error) {
      this.poolStats.connectionErrors++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Query execution failed:', errorMessage);
      throw error;
    } finally {
      if (client) {
        client.release();
        this.poolStats.activeConnections--;
      }
    }
  }

  /**
   * Execute transaction with automatic retry
   */
  async executeTransaction<T>(
    callback: (client: any) => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        
        this.poolStats.queryCount += 2; // BEGIN + COMMIT
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        this.poolStats.connectionErrors++;
        lastError = error;
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Transaction attempt ${attempt} failed:`, errorMessage);
        
        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } finally {
        client.release();
      }
    }

    throw lastError;
  }

  /**
   * Optimize pool connections
   */
  async optimizePool(): Promise<void> {
    try {
      console.log('🔧 Optimizing connection pool...');

      // Get current pool status
      const client = await pool.connect();
      
      // Check for long-running queries
      const longQueries = await client.query(`
        SELECT 
          pid,
          now() - pg_stat_activity.query_start AS duration,
          query
        FROM pg_stat_activity
        WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
          AND state = 'active'
          AND query NOT LIKE '%pg_stat_activity%'
      `);

      if (longQueries.rows.length > 0) {
        console.warn(`⚠️  Found ${longQueries.rows.length} long-running queries`);
        longQueries.rows.forEach((query, index) => {
          console.warn(`   ${index + 1}. Duration: ${query.duration}, PID: ${query.pid}`);
        });
      }

      // Check for blocking queries
      const blockedQueries = await client.query(`
        SELECT 
          blocked_locks.pid AS blocked_pid,
          blocked_activity.usename AS blocked_user,
          blocking_locks.pid AS blocking_pid,
          blocking_activity.usename AS blocking_user,
          blocked_activity.query AS blocked_statement
        FROM pg_catalog.pg_locks blocked_locks
        JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
        JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
        JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
        WHERE NOT blocked_locks.granted AND blocking_locks.granted
      `);

      if (blockedQueries.rows.length > 0) {
        console.warn(`🚫 Found ${blockedQueries.rows.length} blocked queries`);
      }

      client.release();
      console.log('✅ Pool optimization complete');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Pool optimization failed:', errorMessage);
    }
  }

  /**
   * Reset pool statistics
   */
  resetStats(): void {
    this.poolStats = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingRequests: 0,
      connectionErrors: 0,
      queryCount: 0,
      lastReset: Date.now()
    };
    console.log('📊 Pool statistics reset');
  }

  /**
   * Get current pool statistics
   */
  getStats(): typeof this.poolStats {
    return { ...this.poolStats };
  }

  /**
   * Log pool statistics
   */
  private logPoolStats(): void {
    const uptime = Math.floor((Date.now() - this.poolStats.lastReset) / 1000);
    const qps = this.poolStats.queryCount / uptime || 0;

    console.log('📊 Connection Pool Stats:');
    console.log(`   Active: ${this.poolStats.activeConnections} | Waiting: ${this.poolStats.waitingRequests}`);
    console.log(`   Queries: ${this.poolStats.queryCount} | QPS: ${qps.toFixed(2)}`);
    console.log(`   Errors: ${this.poolStats.connectionErrors} | Uptime: ${uptime}s`);

    // Auto-optimize if error rate is high
    const errorRate = this.poolStats.connectionErrors / this.poolStats.queryCount || 0;
    if (errorRate > 0.05 && this.poolStats.queryCount > 100) {
      console.warn('⚠️  High error rate detected, optimizing pool...');
      this.optimizePool();
    }
  }
}

// Export singleton instance
export const connectionPoolManager = new ConnectionPoolManager();

// Auto-start monitoring in production
if (process.env.NODE_ENV === 'production' || process.env.AUTO_START_POOL_MONITOR === 'true') {
  connectionPoolManager.startMonitoring();
}