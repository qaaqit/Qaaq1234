import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// User's provided connection string - override any Replit database
const userProvidedUrl = 'postgresql://neondb_owner:npg_rTOn7VZkYAb3@ep-autumn-hat-a27gd1cd.eu-central-1.aws.neon.tech/neondb?sslmode=require';

// Force use of user's Neon database instead of Replit database
const databaseUrl = userProvidedUrl;

console.log('Using Neon PostgreSQL database');
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