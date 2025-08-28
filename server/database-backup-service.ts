import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { sql } from "drizzle-orm";

neonConfig.webSocketConstructor = ws;

/**
 * Database Backup Service
 * Manages automatic backups from parent database to local database
 */
class DatabaseBackupService {
  private parentPool: Pool | null = null;
  private localPool: Pool | null = null;
  private parentDb: any = null;
  private localDb: any = null;
  private backupInterval: NodeJS.Timeout | null = null;
  private isBackupRunning = false;
  private lastBackupTime: Date | null = null;
  private backupHistory: Array<{
    timestamp: Date;
    status: 'success' | 'failed';
    tablesBackedUp: number;
    recordsBackedUp: number;
    duration: number;
    error?: string;
  }> = [];

  constructor() {
    this.initializeConnections();
  }

  /**
   * Initialize database connections
   */
  private async initializeConnections(): Promise<void> {
    try {
      // Parent database connection (the one to backup from)
      const parentDbUrl = process.env.PARENT_DATABASE_URL || 
        'postgresql://neondb_owner:npg_rTOn7VZkYAb3@ep-autumn-hat-a27gd1cd.eu-central-1.aws.neon.tech/neondb?sslmode=require';
      
      // Local database connection (the one to backup to)
      const localDbUrl = process.env.DATABASE_URL;

      if (!parentDbUrl) {
        throw new Error('Parent database URL not configured');
      }

      if (!localDbUrl) {
        throw new Error('Local database URL not configured');
      }

      // Initialize parent database connection
      this.parentPool = new Pool({ 
        connectionString: parentDbUrl,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
      });

      this.parentDb = drizzle({ client: this.parentPool, schema });

      // Initialize local database connection
      this.localPool = new Pool({ 
        connectionString: localDbUrl,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
      });

      this.localDb = drizzle({ client: this.localPool, schema });

      console.log('✅ Database backup service initialized');
      console.log('📦 Parent DB:', parentDbUrl.replace(/:[^@]+@/, ':****@'));
      console.log('💾 Local DB:', localDbUrl.replace(/:[^@]+@/, ':****@'));
    } catch (error) {
      console.error('❌ Failed to initialize database backup service:', error);
      throw error;
    }
  }

  /**
   * Start automatic backup schedule
   */
  public startAutoBackup(intervalHours: number = 6): void {
    if (this.backupInterval) {
      console.log('⚠️ Auto-backup already running');
      return;
    }

    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    console.log(`🚀 Starting auto-backup every ${intervalHours} hours`);
    
    // Perform initial backup
    this.performBackup();
    
    // Schedule regular backups
    this.backupInterval = setInterval(() => {
      this.performBackup();
    }, intervalMs);
  }

  /**
   * Stop automatic backup schedule
   */
  public stopAutoBackup(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
      console.log('🛑 Auto-backup stopped');
    }
  }

  /**
   * Perform a full database backup
   */
  public async performBackup(): Promise<void> {
    if (this.isBackupRunning) {
      console.log('⚠️ Backup already in progress');
      return;
    }

    const startTime = Date.now();
    this.isBackupRunning = true;
    let tablesBackedUp = 0;
    let totalRecords = 0;

    console.log('🔄 Starting database backup...');

    try {
      if (!this.parentPool || !this.localPool) {
        throw new Error('Database connections not initialized');
      }

      // Get list of tables to backup
      const tablesToBackup = [
        'users',
        'user_identities',
        'posts',
        'likes',
        'chat_messages',
        'chat_connections',
        'whatsapp_messages',
        'user_answers',
        'answer_likes',
        'verification_codes',
        'rank_groups',
        'rank_group_members',
        'rank_group_messages',
        'rank_chat_messages',
        'email_verification_tokens',
        'ip_analytics',
        'questions',
        'question_interactions',
        'user_activity_logs',
        'system_configs',
        'sessions'
      ];

      // Backup each table
      for (const tableName of tablesToBackup) {
        try {
          console.log(`📋 Backing up table: ${tableName}`);
          const recordCount = await this.backupTable(tableName);
          totalRecords += recordCount;
          tablesBackedUp++;
          console.log(`✅ ${tableName}: ${recordCount} records backed up`);
        } catch (error) {
          console.error(`❌ Failed to backup table ${tableName}:`, error);
        }
      }

      const duration = Date.now() - startTime;
      this.lastBackupTime = new Date();
      
      // Record backup history
      this.backupHistory.push({
        timestamp: this.lastBackupTime,
        status: 'success',
        tablesBackedUp,
        recordsBackedUp: totalRecords,
        duration
      });

      // Keep only last 100 backup records
      if (this.backupHistory.length > 100) {
        this.backupHistory = this.backupHistory.slice(-100);
      }

      console.log(`✅ Backup completed successfully!`);
      console.log(`📊 Tables backed up: ${tablesBackedUp}`);
      console.log(`📊 Total records: ${totalRecords}`);
      console.log(`⏱️ Duration: ${(duration / 1000).toFixed(2)} seconds`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.backupHistory.push({
        timestamp: new Date(),
        status: 'failed',
        tablesBackedUp,
        recordsBackedUp: totalRecords,
        duration: Date.now() - startTime,
        error: errorMessage
      });

      console.error('❌ Backup failed:', errorMessage);
      throw error;
    } finally {
      this.isBackupRunning = false;
    }
  }

  /**
   * Backup a single table
   */
  private async backupTable(tableName: string): Promise<number> {
    if (!this.parentPool || !this.localPool) {
      throw new Error('Database connections not initialized');
    }

    const parentClient = await this.parentPool.connect();
    const localClient = await this.localPool.connect();

    try {
      // Check if table exists in parent database
      const tableExistsResult = await parentClient.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [tableName]);

      if (!tableExistsResult.rows[0].exists) {
        console.log(`⚠️ Table ${tableName} does not exist in parent database`);
        return 0;
      }

      // Get data from parent database
      const result = await parentClient.query(`SELECT * FROM ${tableName}`);
      const records = result.rows;

      if (records.length === 0) {
        console.log(`📭 No records to backup in ${tableName}`);
        return 0;
      }

      // Clear existing data in local table (for full sync)
      await localClient.query(`TRUNCATE TABLE ${tableName} CASCADE`);

      // Prepare batch insert
      if (records.length > 0) {
        const columns = Object.keys(records[0]);
        const values = records.map(record => 
          columns.map(col => record[col])
        );

        // Build insert query
        const placeholders = values.map((_, rowIndex) => 
          `(${columns.map((_, colIndex) => 
            `$${rowIndex * columns.length + colIndex + 1}`
          ).join(', ')})`
        ).join(', ');

        const insertQuery = `
          INSERT INTO ${tableName} (${columns.join(', ')})
          VALUES ${placeholders}
          ON CONFLICT DO NOTHING
        `;

        const flatValues = values.flat();
        await localClient.query(insertQuery, flatValues);
      }

      return records.length;
    } catch (error) {
      console.error(`Error backing up table ${tableName}:`, error);
      throw error;
    } finally {
      parentClient.release();
      localClient.release();
    }
  }

  /**
   * Perform an incremental backup (only new/updated records)
   */
  public async performIncrementalBackup(): Promise<void> {
    if (this.isBackupRunning) {
      console.log('⚠️ Backup already in progress');
      return;
    }

    const startTime = Date.now();
    this.isBackupRunning = true;

    console.log('🔄 Starting incremental backup...');

    try {
      if (!this.lastBackupTime) {
        console.log('📝 No previous backup found, performing full backup');
        await this.performBackup();
        return;
      }

      // Backup only tables with timestamp columns
      const incrementalTables = [
        { name: 'users', timestampColumn: 'updated_at' },
        { name: 'posts', timestampColumn: 'created_at' },
        { name: 'chat_messages', timestampColumn: 'created_at' },
        { name: 'user_answers', timestampColumn: 'created_at' },
        { name: 'questions', timestampColumn: 'updated_at' }
      ];

      let totalRecords = 0;

      for (const table of incrementalTables) {
        const recordCount = await this.backupIncrementalTable(
          table.name, 
          table.timestampColumn,
          this.lastBackupTime
        );
        totalRecords += recordCount;
      }

      const duration = Date.now() - startTime;
      this.lastBackupTime = new Date();

      console.log(`✅ Incremental backup completed!`);
      console.log(`📊 Records updated: ${totalRecords}`);
      console.log(`⏱️ Duration: ${(duration / 1000).toFixed(2)} seconds`);
    } catch (error) {
      console.error('❌ Incremental backup failed:', error);
      throw error;
    } finally {
      this.isBackupRunning = false;
    }
  }

  /**
   * Backup only new/updated records from a table
   */
  private async backupIncrementalTable(
    tableName: string, 
    timestampColumn: string,
    lastBackupTime: Date
  ): Promise<number> {
    if (!this.parentPool || !this.localPool) {
      throw new Error('Database connections not initialized');
    }

    const parentClient = await this.parentPool.connect();
    const localClient = await this.localPool.connect();

    try {
      // Get new/updated records from parent database
      const result = await parentClient.query(
        `SELECT * FROM ${tableName} WHERE ${timestampColumn} > $1`,
        [lastBackupTime]
      );

      const records = result.rows;

      if (records.length === 0) {
        return 0;
      }

      // Upsert records into local database
      for (const record of records) {
        const columns = Object.keys(record);
        const values = Object.values(record);
        const placeholders = values.map((_, i) => `$${i + 1}`);

        const upsertQuery = `
          INSERT INTO ${tableName} (${columns.join(', ')})
          VALUES (${placeholders.join(', ')})
          ON CONFLICT (id) DO UPDATE SET
          ${columns.map((col, i) => `${col} = $${i + 1}`).join(', ')}
        `;

        await localClient.query(upsertQuery, values);
      }

      return records.length;
    } catch (error) {
      console.error(`Error in incremental backup for ${tableName}:`, error);
      throw error;
    } finally {
      parentClient.release();
      localClient.release();
    }
  }

  /**
   * Get backup status and history
   */
  public getStatus(): {
    isRunning: boolean;
    lastBackupTime: Date | null;
    nextBackupTime: Date | null;
    backupHistory: typeof this.backupHistory;
  } {
    let nextBackupTime = null;
    
    if (this.backupInterval && this.lastBackupTime) {
      // Calculate next backup time (6 hours from last backup)
      nextBackupTime = new Date(this.lastBackupTime.getTime() + 6 * 60 * 60 * 1000);
    }

    return {
      isRunning: this.isBackupRunning,
      lastBackupTime: this.lastBackupTime,
      nextBackupTime,
      backupHistory: this.backupHistory.slice(-10) // Return last 10 backups
    };
  }

  /**
   * Test database connections
   */
  public async testConnections(): Promise<{
    parentDb: boolean;
    localDb: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let parentDbOk = false;
    let localDbOk = false;

    // Test parent database
    try {
      if (this.parentPool) {
        const client = await this.parentPool.connect();
        await client.query('SELECT 1');
        client.release();
        parentDbOk = true;
        console.log('✅ Parent database connection successful');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Parent DB: ${errorMessage}`);
      console.error('❌ Parent database connection failed:', errorMessage);
    }

    // Test local database
    try {
      if (this.localPool) {
        const client = await this.localPool.connect();
        await client.query('SELECT 1');
        client.release();
        localDbOk = true;
        console.log('✅ Local database connection successful');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Local DB: ${errorMessage}`);
      console.error('❌ Local database connection failed:', errorMessage);
    }

    return {
      parentDb: parentDbOk,
      localDb: localDbOk,
      errors
    };
  }

  /**
   * Cleanup and close connections
   */
  public async cleanup(): Promise<void> {
    this.stopAutoBackup();
    
    if (this.parentPool) {
      await this.parentPool.end();
      this.parentPool = null;
    }

    if (this.localPool) {
      await this.localPool.end();
      this.localPool = null;
    }

    console.log('🧹 Database backup service cleaned up');
  }
}

// Export singleton instance
export const databaseBackupService = new DatabaseBackupService();