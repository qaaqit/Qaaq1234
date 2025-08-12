import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Use local PostgreSQL database provided by Replit
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log('Using Local PostgreSQL database');
console.log('Connection string:', process.env.DATABASE_URL.replace(/:[^@]+@/, ':****@')); // Log URL with masked password

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL
});

// Test the connection
pool.connect()
  .then(client => {
    console.log('Successfully connected to Local PostgreSQL database');
    client.release();
  })
  .catch(err => {
    console.error('Failed to connect to Local PostgreSQL database:', err.message);
    console.error('Please check your database connection string');
  });

export const db = drizzle({ client: pool, schema });