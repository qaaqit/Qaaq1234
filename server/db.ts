import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Enhanced database configuration - use QAAQ database URLs (correct endpoint)
// Prioritize QAAQ_DATABASE_URL as it has the correct endpoint (ep-autumn-hat)
const databaseUrl = process.env.QAAQ_DATABASE_URL || process.env.QAAQ_PRODUCTION_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('QAAQ Database URL not found. Please check QAAQ_DATABASE_URL or QAAQ_PRODUCTION_DATABASE_URL in your environment variables.');
}

console.log('Using Enhanced PostgreSQL Database with Connection Pooling');
console.log('Connection string:', databaseUrl.replace(/:[^@]+@/, ':****@'));

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
      console.log('✅ Enhanced PostgreSQL connection established successfully');
      return true;
    } catch (error) {
      console.error(`❌ Connection attempt ${i + 1} failed:`, error.message);
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

export const db = drizzle({ client: pool, schema });