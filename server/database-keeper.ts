import { Pool } from '@neondatabase/serverless';
import { pool } from './db';

/**
 * Database Keep-Alive Service
 * Prevents database hibernation and maintains connection health
 */
class DatabaseKeeper {
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isActive = false;
  private lastActivity = Date.now();
  private consecutiveFailures = 0;
  private maxFailures = 5;

  constructor() {
    this.bindProcessEvents();
  }

  /**
   * Start the database keeper service
   */
  start(): void {
    if (this.isActive) {
      console.log('🔄 Database keeper already running');
      return;
    }

    this.isActive = true;
    console.log('🚀 Starting database keeper service...');

    // Keep-alive ping every 5 minutes
    this.keepAliveInterval = setInterval(() => {
      this.keepAlivePing();
    }, 5 * 60 * 1000);

    // Health check every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.healthCheck();
    }, 30 * 1000);

    // Initial health check
    this.healthCheck();
  }

  /**
   * Stop the database keeper service
   */
  stop(): void {
    if (!this.isActive) return;

    this.isActive = false;
    console.log('🛑 Stopping database keeper service...');

    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Send keep-alive ping to prevent hibernation
   */
  private async keepAlivePing(): Promise<void> {
    try {
      const startTime = Date.now();
      const client = await pool.connect();
      
      // Simple query to maintain connection
      await client.query('SELECT 1 as keepalive, NOW() as timestamp');
      client.release();

      const duration = Date.now() - startTime;
      this.lastActivity = Date.now();
      this.consecutiveFailures = 0;

      console.log(`💓 Keep-alive ping successful (${duration}ms)`);
    } catch (error) {
      this.consecutiveFailures++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Keep-alive ping failed (${this.consecutiveFailures}/${this.maxFailures}):`, errorMessage);
      
      if (this.consecutiveFailures >= this.maxFailures) {
        console.error('🚨 Multiple keep-alive failures detected, attempting recovery...');
        await this.attemptRecovery();
      }
    }
  }

  /**
   * Perform detailed health check
   */
  private async healthCheck(): Promise<void> {
    try {
      const startTime = Date.now();
      const client = await pool.connect();

      // Test basic connectivity
      const result = await client.query(`
        SELECT 
          current_database() as database,
          current_user as user,
          version() as version,
          NOW() as server_time
      `);

      // Test table access
      await client.query('SELECT COUNT(*) FROM users LIMIT 1');
      
      client.release();

      const duration = Date.now() - startTime;
      this.lastActivity = Date.now();
      this.consecutiveFailures = 0;

      // Log health status every 5 minutes only
      if (Date.now() % (5 * 60 * 1000) < 30000) {
        console.log(`✅ Database health check passed (${duration}ms) - ${result.rows[0].database}`);
      }
    } catch (error) {
      this.consecutiveFailures++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`🩺 Health check failed (${this.consecutiveFailures}/${this.maxFailures}):`, errorMessage);
      
      if (this.consecutiveFailures >= this.maxFailures) {
        await this.attemptRecovery();
      }
    }
  }

  /**
   * Attempt database connection recovery
   */
  private async attemptRecovery(): Promise<void> {
    console.log('🔧 Attempting database recovery...');
    
    try {
      // Force pool to refresh connections
      await pool.end();
      
      // Wait briefly before reconnecting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test new connection
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      this.consecutiveFailures = 0;
      console.log('✅ Database recovery successful');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Database recovery failed:', errorMessage);
      
      // If recovery fails completely, restart the service
      if (this.consecutiveFailures >= this.maxFailures * 2) {
        console.log('🔄 Restarting database keeper service...');
        this.stop();
        setTimeout(() => this.start(), 5000);
      }
    }
  }

  /**
   * Get database keeper status
   */
  getStatus(): {
    active: boolean;
    lastActivity: Date;
    consecutiveFailures: number;
    uptime: number;
  } {
    return {
      active: this.isActive,
      lastActivity: new Date(this.lastActivity),
      consecutiveFailures: this.consecutiveFailures,
      uptime: this.isActive ? Date.now() - this.lastActivity : 0
    };
  }

  /**
   * Bind process events for graceful shutdown
   */
  private bindProcessEvents(): void {
    process.on('SIGTERM', () => {
      console.log('📡 SIGTERM received, stopping database keeper...');
      this.stop();
    });

    process.on('SIGINT', () => {
      console.log('📡 SIGINT received, stopping database keeper...');
      this.stop();
    });

    process.on('exit', () => {
      this.stop();
    });
  }
}

// Export singleton instance
export const databaseKeeper = new DatabaseKeeper();

// Auto-start in production
if (process.env.NODE_ENV === 'production' || process.env.AUTO_START_DB_KEEPER === 'true') {
  databaseKeeper.start();
}