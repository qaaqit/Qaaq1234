import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.QAAQ_ADMIN_DATABASE_URL) {
  throw new Error(
    "QAAQ_ADMIN_DATABASE_URL must be set. Did you forget to provision the QAAQ admin database?",
  );
}

export const pool = new Pool({ connectionString: process.env.QAAQ_ADMIN_DATABASE_URL });
export const db = drizzle({ client: pool, schema });