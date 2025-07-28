import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Connect to QAAQ Parent Database with real maritime users
const QAAQ_PARENT_DB_URL = "postgresql://neondb_owner:npg_rTOn7VZkYAb3@ep-autumn-hat-a27gd1cd.eu-central-1.aws.neon.tech/neondb?sslmode=require";

export const pool = new Pool({ connectionString: QAAQ_PARENT_DB_URL });
export const db = drizzle({ client: pool, schema });