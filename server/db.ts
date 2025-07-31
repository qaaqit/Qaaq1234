import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Use QAAQ_DATABASE_URL for authentic maritime user data, fallback to DATABASE_URL for CPSS groups
const databaseUrl = process.env.QAAQ_DATABASE_URL || process.env.DATABASE_URL;
console.log(`Using database: ${databaseUrl?.includes('ep-autumn-hat') ? 'QAAQ Database (ep-autumn-hat-a27gd1cd)' : 'Local Database'}`);

export const pool = new Pool({ 
  connectionString: databaseUrl,
  ssl: databaseUrl?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined
});
export const db = drizzle({ client: pool, schema });