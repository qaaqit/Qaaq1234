import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Use Replit DATABASE_URL environment variable (should connect to dry-truth-648232290)
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a Replit database?",
  );
}

const databaseUrl = process.env.DATABASE_URL;

console.log('Using Replit PostgreSQL database');
console.log('Connection string:', databaseUrl.replace(/:[^@]+@/, ':****@')); // Log URL with masked password

export const pool = new Pool({ 
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

// Test the connection
pool.connect()
  .then(client => {
    console.log('Successfully connected to PostgreSQL database');
    client.release();
  })
  .catch(err => {
    console.error('Failed to connect to PostgreSQL database:', err.message);
    console.error('Please check your database connection string');
  });

export const db = drizzle({ client: pool, schema });