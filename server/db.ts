import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Use the parent QAAQ database URL for access to questions, SEMM, and other shared data
const databaseUrl = process.env.QAAQ_PARENT_DB_URL || process.env.DATABASE_URL || process.env.QAAQ_DATABASE_URL || process.env.QAAQ_PRODUCTION_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Database URL not found. Please set DATABASE_URL environment variable.');
}

console.log('🔗 Connecting to database:', databaseUrl.replace(/:[^@]+@/, ':****@'));

// Enhanced connection pool for subscription reliability
export const pool = new Pool({ 
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  max: 20,              // Maximum connections for subscription load
  min: 5,               // Keep minimum connections ready
  idleTimeoutMillis: 30000,    // 30 seconds idle timeout
  connectionTimeoutMillis: 10000, // 10 seconds connection timeout
  statement_timeout: 60000,    // 60 seconds for complex subscription queries
  query_timeout: 30000,        // 30 seconds for regular queries
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
});

// Enhanced connection testing with retry logic
async function testConnection(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1 as connection_test');
      client.release();
      console.log('✅ Connected to database successfully');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Connection attempt ${i + 1} failed:`, errorMessage);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  console.error('💀 Failed to establish database connection after all retries');
  return false;
}

// Initialize connection
testConnection();

// Start database services
async function initializeDatabaseServices() {
  try {
    // Import and start database keeper
    const { databaseKeeper } = await import('./database-keeper');
    databaseKeeper.start();

    // Import and start connection pool manager
    const { connectionPoolManager } = await import('./connection-pool-manager');
    connectionPoolManager.startMonitoring();

    console.log('✅ Database services initialized successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to initialize database services:', errorMessage);
  }
}

// Import and initialize database migration helper
async function initializeMigrationHelper() {
  try {
    const { DatabaseMigrationHelper } = await import('./database-migration-helper');
    await DatabaseMigrationHelper.ensureRequiredTables();
    console.log('✅ Database migration helper initialized');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Migration helper initialization failed:', errorMessage);
  }
}

// Start services after a brief delay to ensure database connection is established
setTimeout(() => {
  initializeDatabaseServices();
  initializeMigrationHelper();
}, 2000);

export const db = drizzle({ client: pool, schema });