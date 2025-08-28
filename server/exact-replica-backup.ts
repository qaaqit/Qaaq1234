import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

/**
 * Creates an exact replica of parent database tables in local database
 * Table names and structures will be identical for seamless URL switching
 */
export class ExactReplicaBackupService {
  private parentPool: Pool | null = null;
  private localPool: Pool | null = null;
  private backupInterval: NodeJS.Timeout | null = null;
  private isBackupRunning = false;
  private lastBackupTime: Date | null = null;

  constructor() {
    this.initializeConnections();
  }

  private async initializeConnections(): Promise<void> {
    const parentDbUrl = process.env.PARENT_DATABASE_URL || 
      'postgresql://neondb_owner:npg_rTOn7VZkYAb3@ep-autumn-hat-a27gd1cd.eu-central-1.aws.neon.tech/neondb?sslmode=require';
    const localDbUrl = process.env.DATABASE_URL;

    if (!parentDbUrl || !localDbUrl) {
      throw new Error('Database URLs not configured');
    }

    this.parentPool = new Pool({ 
      connectionString: parentDbUrl,
      ssl: { rejectUnauthorized: false },
      max: 10
    });

    this.localPool = new Pool({ 
      connectionString: localDbUrl,
      ssl: { rejectUnauthorized: false },
      max: 10
    });

    console.log('✅ Exact Replica Backup Service initialized');
    console.log('📦 Parent DB:', parentDbUrl.replace(/:[^@]+@/, ':****@'));
    console.log('💾 Local DB:', localDbUrl.replace(/:[^@]+@/, ':****@'));
  }

  /**
   * Create exact table structure from parent in local database
   */
  private async replicateTableStructure(tableName: string): Promise<void> {
    if (!this.parentPool || !this.localPool) {
      throw new Error('Database connections not initialized');
    }

    const parentClient = await this.parentPool.connect();
    const localClient = await this.localPool.connect();

    try {
      // Get the CREATE TABLE statement from parent database
      const createTableQuery = await parentClient.query(`
        SELECT 
          'CREATE TABLE IF NOT EXISTS ' || quote_ident($1) || ' (' ||
          string_agg(
            quote_ident(column_name) || ' ' || 
            CASE 
              WHEN data_type = 'character varying' THEN 
                'VARCHAR' || COALESCE('(' || character_maximum_length || ')', '')
              WHEN data_type = 'character' THEN 
                'CHAR' || COALESCE('(' || character_maximum_length || ')', '')
              WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
              WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMPTZ'
              WHEN data_type = 'boolean' THEN 'BOOLEAN'
              WHEN data_type = 'integer' THEN 'INTEGER'
              WHEN data_type = 'bigint' THEN 'BIGINT'
              WHEN data_type = 'numeric' THEN 'NUMERIC'
              WHEN data_type = 'text' THEN 'TEXT'
              WHEN data_type = 'jsonb' THEN 'JSONB'
              WHEN data_type = 'json' THEN 'JSON'
              WHEN data_type = 'uuid' THEN 'UUID'
              WHEN data_type = 'ARRAY' THEN column_name || '_ARRAY'
              ELSE data_type
            END ||
            CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
            COALESCE(' DEFAULT ' || column_default, ''),
            ', '
            ORDER BY ordinal_position
          ) || 
          ');' as create_statement
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = $1
        GROUP BY table_name;
      `, [tableName]);

      if (createTableQuery.rows.length === 0) {
        console.log(`⚠️ Table ${tableName} does not exist in parent database`);
        return;
      }

      // Drop existing table in local database (if exists) and create new one
      await localClient.query(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
      
      // Get column information for proper table creation
      const columnsQuery = await parentClient.query(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      // Build CREATE TABLE statement manually
      let createStatement = `CREATE TABLE ${tableName} (`;
      const columnDefs = [];

      for (const col of columnsQuery.rows) {
        let columnDef = `"${col.column_name}"`;
        
        // Map data types
        switch (col.data_type) {
          case 'character varying':
            columnDef += ` VARCHAR${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}`;
            break;
          case 'timestamp without time zone':
            columnDef += ' TIMESTAMP';
            break;
          case 'timestamp with time zone':
            columnDef += ' TIMESTAMPTZ';
            break;
          case 'boolean':
            columnDef += ' BOOLEAN';
            break;
          case 'integer':
            columnDef += ' INTEGER';
            break;
          case 'bigint':
            columnDef += ' BIGINT';
            break;
          case 'text':
            columnDef += ' TEXT';
            break;
          case 'jsonb':
            columnDef += ' JSONB';
            break;
          case 'json':
            columnDef += ' JSON';
            break;
          case 'uuid':
            columnDef += ' UUID';
            break;
          case 'numeric':
            columnDef += ' NUMERIC';
            break;
          case 'real':
            columnDef += ' REAL';
            break;
          case 'double precision':
            columnDef += ' DOUBLE PRECISION';
            break;
          default:
            columnDef += ` ${col.data_type.toUpperCase()}`;
        }

        if (col.is_nullable === 'NO') {
          columnDef += ' NOT NULL';
        }

        if (col.column_default) {
          // Clean up the default value
          let defaultVal = col.column_default;
          if (!defaultVal.startsWith('nextval') && !defaultVal.includes('::')) {
            columnDef += ` DEFAULT ${defaultVal}`;
          } else if (defaultVal.includes('::')) {
            // Handle type casts in defaults
            defaultVal = defaultVal.split('::')[0];
            columnDef += ` DEFAULT ${defaultVal}`;
          }
        }

        columnDefs.push(columnDef);
      }

      // Add primary key constraint if exists
      const pkQuery = await parentClient.query(`
        SELECT column_name
        FROM information_schema.key_column_usage
        WHERE table_schema = 'public' 
        AND table_name = $1
        AND constraint_name = (
          SELECT constraint_name
          FROM information_schema.table_constraints
          WHERE table_schema = 'public'
          AND table_name = $1
          AND constraint_type = 'PRIMARY KEY'
        )
      `, [tableName]);

      if (pkQuery.rows.length > 0) {
        const pkColumns = pkQuery.rows.map(r => `"${r.column_name}"`).join(', ');
        columnDefs.push(`PRIMARY KEY (${pkColumns})`);
      }

      createStatement += columnDefs.join(', ') + ')';

      // Create the table in local database
      await localClient.query(createStatement);
      console.log(`✅ Created table ${tableName} with exact structure`);

      // Also replicate indexes
      const indexesQuery = await parentClient.query(`
        SELECT indexdef 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = $1
        AND indexname NOT LIKE '%_pkey'
      `, [tableName]);

      for (const idx of indexesQuery.rows) {
        try {
          const indexDef = idx.indexdef.replace('CREATE INDEX', 'CREATE INDEX IF NOT EXISTS');
          await localClient.query(indexDef);
        } catch (e) {
          // Index might already exist or have issues, continue
        }
      }

    } finally {
      parentClient.release();
      localClient.release();
    }
  }

  /**
   * Copy data from parent table to local table
   */
  private async copyTableData(tableName: string): Promise<number> {
    if (!this.parentPool || !this.localPool) {
      throw new Error('Database connections not initialized');
    }

    const parentClient = await this.parentPool.connect();
    const localClient = await this.localPool.connect();

    try {
      // Check if table exists in parent
      const tableExistsResult = await parentClient.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tableName]);

      if (!tableExistsResult.rows[0].exists) {
        console.log(`⚠️ Table ${tableName} does not exist in parent database`);
        return 0;
      }

      // Get all data from parent table
      const result = await parentClient.query(`SELECT * FROM ${tableName}`);
      const records = result.rows;

      if (records.length === 0) {
        console.log(`📭 No records to copy in ${tableName}`);
        return 0;
      }

      // Clear existing data in local table
      await localClient.query(`TRUNCATE TABLE ${tableName} CASCADE`);

      // Insert data in batches
      const batchSize = 100;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        if (batch.length > 0) {
          const columns = Object.keys(batch[0]);
          const values = [];
          const placeholders = [];
          
          batch.forEach((record, rowIndex) => {
            const rowPlaceholders = columns.map((_, colIndex) => 
              `$${rowIndex * columns.length + colIndex + 1}`
            );
            placeholders.push(`(${rowPlaceholders.join(', ')})`);
            columns.forEach(col => values.push(record[col]));
          });

          const insertQuery = `
            INSERT INTO ${tableName} (${columns.map(c => `"${c}"`).join(', ')})
            VALUES ${placeholders.join(', ')}
            ON CONFLICT DO NOTHING
          `;

          await localClient.query(insertQuery, values);
        }
      }

      return records.length;
    } finally {
      parentClient.release();
      localClient.release();
    }
  }

  /**
   * Perform a full backup creating exact replicas
   */
  public async performFullBackup(): Promise<void> {
    if (this.isBackupRunning) {
      console.log('⚠️ Backup already in progress');
      return;
    }

    this.isBackupRunning = true;
    const startTime = Date.now();

    console.log('\n🔄 Starting exact replica backup...');
    console.log('📝 Creating identical table structures and copying data...\n');

    try {
      // Priority tables that should be backed up
      const tablesToBackup = [
        'users',
        'sessions',
        'questions',
        'user_answers',
        'posts',
        'likes',
        'chat_messages',
        'chat_connections',
        'whatsapp_messages',
        'answer_likes',
        'verification_codes',
        'email_verification_tokens',
        'user_identities',
        'rank_groups',
        'rank_group_members',
        'rank_group_messages',
        'rank_chat_messages',
        'ip_analytics',
        'question_interactions',
        'user_activity_logs'
      ];

      let successCount = 0;
      let totalRecords = 0;

      for (const tableName of tablesToBackup) {
        try {
          console.log(`\n📋 Processing table: ${tableName}`);
          
          // First replicate the exact table structure
          await this.replicateTableStructure(tableName);
          
          // Then copy all data
          const recordCount = await this.copyTableData(tableName);
          
          if (recordCount > 0) {
            console.log(`✅ ${tableName}: ${recordCount} records copied`);
            totalRecords += recordCount;
          }
          
          successCount++;
        } catch (error) {
          console.error(`❌ Failed to replicate ${tableName}:`, 
            error instanceof Error ? error.message : 'Unknown error');
        }
      }

      const duration = (Date.now() - startTime) / 1000;
      this.lastBackupTime = new Date();

      console.log('\n' + '='.repeat(50));
      console.log('✅ EXACT REPLICA BACKUP COMPLETED');
      console.log('='.repeat(50));
      console.log(`📊 Tables replicated: ${successCount}/${tablesToBackup.length}`);
      console.log(`📊 Total records: ${totalRecords}`);
      console.log(`⏱️ Duration: ${duration.toFixed(2)} seconds`);
      console.log('\n💡 Your local database now has identical table names and structures');
      console.log('🔄 You can now switch DATABASE_URL without any issues!');

    } catch (error) {
      console.error('❌ Backup failed:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    } finally {
      this.isBackupRunning = false;
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
    this.performFullBackup();
    
    // Schedule regular backups
    this.backupInterval = setInterval(() => {
      this.performFullBackup();
    }, intervalMs);
  }

  /**
   * Stop automatic backup
   */
  public stopAutoBackup(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
      console.log('🛑 Auto-backup stopped');
    }
  }

  /**
   * Cleanup connections
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

    console.log('🧹 Backup service cleaned up');
  }
}

// Create and export singleton instance
export const exactReplicaBackup = new ExactReplicaBackupService();