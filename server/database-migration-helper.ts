import { pool } from './db';

/**
 * Database Migration Helper
 * Ensures critical missing tables and columns exist for synchronization
 */
export class DatabaseMigrationHelper {
  
  /**
   * Ensure all required tables exist for proper synchronization
   */
  static async ensureRequiredTables(): Promise<void> {
    try {
      console.log('🔧 Checking and creating required database tables...');
      
      // Create user_activity_logs table for sync tracking
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_activity_logs (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR NOT NULL,
          activity VARCHAR NOT NULL,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id 
        ON user_activity_logs(user_id);
        
        CREATE INDEX IF NOT EXISTS idx_user_activity_logs_activity 
        ON user_activity_logs(activity);
        
        CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at 
        ON user_activity_logs(created_at);
      `);
      
      // Create question_interactions table for sync tracking
      await pool.query(`
        CREATE TABLE IF NOT EXISTS question_interactions (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR NOT NULL,
          question_id VARCHAR NOT NULL,
          interaction_type VARCHAR NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, question_id, interaction_type)
        );
        
        CREATE INDEX IF NOT EXISTS idx_question_interactions_user_id 
        ON question_interactions(user_id);
        
        CREATE INDEX IF NOT EXISTS idx_question_interactions_question_id 
        ON question_interactions(question_id);
      `);
      
      
      
      
      // Ensure critical columns exist in existing tables
      await this.ensureUserTableColumns();
      await this.ensureChatMessageColumns();
      
      console.log('✅ All required database tables and columns verified');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Database migration failed:', errorMessage);
      throw error;
    }
  }
  
  /**
   * Ensure user table has all required columns for sync
   */
  private static async ensureUserTableColumns(): Promise<void> {
    const columnsToAdd = [
      'location_source VARCHAR DEFAULT \'device\'',
      'location_updated_at TIMESTAMP',
      'subscription_status VARCHAR DEFAULT \'free\'',
      'subscription_plan VARCHAR',
      'subscription_updated_at TIMESTAMP',
      'last_activity_at TIMESTAMP DEFAULT NOW()',
      'sync_status VARCHAR DEFAULT \'active\''
    ];
    
    for (const column of columnsToAdd) {
      try {
        const columnName = column.split(' ')[0];
        await pool.query(`
          ALTER TABLE users 
          ADD COLUMN IF NOT EXISTS ${column}
        `);
        console.log(`✅ User table column ensured: ${columnName}`);
      } catch (error) {
        console.log(`⚠️ Could not add user column: ${column}`);
      }
    }
  }
  
  /**
   * Ensure chat_messages table has sync columns
   */
  private static async ensureChatMessageColumns(): Promise<void> {
    const columnsToAdd = [
      'status VARCHAR DEFAULT \'sent\'',
      'read_at TIMESTAMP',
      'delivered_at TIMESTAMP',
      'sync_status VARCHAR DEFAULT \'synced\''
    ];
    
    for (const column of columnsToAdd) {
      try {
        const columnName = column.split(' ')[0];
        await pool.query(`
          ALTER TABLE chat_messages 
          ADD COLUMN IF NOT EXISTS ${column}
        `);
        console.log(`✅ Chat messages column ensured: ${columnName}`);
      } catch (error) {
        console.log(`⚠️ Could not add chat message column: ${column}`);
      }
    }
  }
  
  /**
   * Create database indexes for performance optimization
   */
  static async optimizeIndexes(): Promise<void> {
    try {
      console.log('🚀 Optimizing database indexes...');
      
      const indexes = [
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_location ON users(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_activity ON users(last_activity_at)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_subscription ON users(subscription_status, subscription_plan)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_messages_status ON chat_messages(status)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_messages_read_at ON chat_messages(read_at)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_created_at ON posts(created_at)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_likes_user_post ON likes(user_id, post_id)'
      ];
      
      for (const indexQuery of indexes) {
        try {
          await pool.query(indexQuery);
          console.log(`✅ Index created: ${indexQuery.split(' ')[7]}`);
        } catch (error) {
          console.log(`⚠️ Index already exists or failed: ${indexQuery.split(' ')[7]}`);
        }
      }
      
      console.log('✅ Database indexes optimized');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Index optimization failed:', errorMessage);
    }
  }
  
  /**
   * Clean up old data to prevent database bloat
   */
  static async cleanupOldData(): Promise<void> {
    try {
      console.log('🧹 Cleaning up old database data...');
      
      // Clean up old activity logs (older than 30 days)
      const activityCleanup = await pool.query(`
        DELETE FROM user_activity_logs 
        WHERE created_at < NOW() - INTERVAL '30 days'
      `);
      
      // Clean up old verification codes (older than 7 days)
      const codesCleanup = await pool.query(`
        DELETE FROM verification_codes 
        WHERE created_at < NOW() - INTERVAL '7 days'
      `);
      
      // Clean up old email verification tokens (older than 24 hours)
      const tokensCleanup = await pool.query(`
        DELETE FROM email_verification_tokens 
        WHERE created_at < NOW() - INTERVAL '24 hours'
      `);
      
      console.log(`✅ Database cleanup completed:`);
      console.log(`   - Activity logs: ${activityCleanup.rowCount} rows deleted`);
      console.log(`   - Verification codes: ${codesCleanup.rowCount} rows deleted`);
      console.log(`   - Email tokens: ${tokensCleanup.rowCount} rows deleted`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Database cleanup failed:', errorMessage);
    }
  }
  
  /**
   * Run daily maintenance tasks
   */
  static async runDailyMaintenance(): Promise<void> {
    try {
      console.log('🔧 Running daily database maintenance...');
      
      // Analyze tables for query optimization
      await pool.query('ANALYZE;');
      console.log('✅ Database analysis completed');
      
      // Clean up old data
      await this.cleanupOldData();
      
      // Optimize indexes
      await this.optimizeIndexes();
      
      console.log('✅ Daily maintenance completed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Daily maintenance failed:', errorMessage);
    }
  }
}

// Auto-run required table creation on import
DatabaseMigrationHelper.ensureRequiredTables().catch(error => {
  console.error('❌ Failed to ensure required tables:', error);
});

// Schedule daily maintenance at 2 AM
const scheduleMaintenanceAt2AM = () => {
  const now = new Date();
  const target = new Date();
  target.setHours(2, 0, 0, 0); // 2 AM
  
  // If it's past 2 AM today, schedule for tomorrow
  if (now > target) {
    target.setDate(target.getDate() + 1);
  }
  
  const msUntilTarget = target.getTime() - now.getTime();
  
  setTimeout(() => {
    DatabaseMigrationHelper.runDailyMaintenance();
    
    // Schedule next run in 24 hours
    setInterval(() => {
      DatabaseMigrationHelper.runDailyMaintenance();
    }, 24 * 60 * 60 * 1000);
  }, msUntilTarget);
  
  console.log(`🕐 Daily maintenance scheduled for 2:00 AM (${Math.round(msUntilTarget / 1000 / 60 / 60)} hours from now)`);
};

// Start maintenance scheduling in production
if (process.env.NODE_ENV === 'production' || process.env.AUTO_MAINTENANCE === 'true') {
  scheduleMaintenanceAt2AM();
}