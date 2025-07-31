import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Use QAAQ_PRODUCTION_DATABASE_URL for real maritime users, fallback to QAAQ_DATABASE_URL for test data
const databaseUrl = process.env.QAAQ_PRODUCTION_DATABASE_URL || process.env.QAAQ_DATABASE_URL || process.env.DATABASE_URL;

// Log which environment variable is being used
if (process.env.QAAQ_PRODUCTION_DATABASE_URL) {
  console.log('Using database: QAAQ Production Database (Real Maritime Professionals)');
} else if (process.env.QAAQ_DATABASE_URL) {
  console.log('Using database: QAAQ Test Database (Sample/Seed Data Only)');
} else {
  console.log('Using database: Local Database');
}

export const pool = new Pool({ 
  connectionString: databaseUrl,
  ssl: databaseUrl?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined
});
export const db = drizzle({ client: pool, schema });