import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = 'postgresql://neondb_owner:npg_rTOn7VZkYAb3@ep-autumn-hat-a27gd1cd.eu-central-1.aws.neon.tech/neondb?sslmode=require';

async function inspectDatabase() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    console.log('Connecting to database...');
    
    // Get all tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('\n=== Tables in database ===');
    for (const row of tablesResult.rows) {
      console.log(`- ${row.table_name}`);
    }
    
    // Get columns for users table if it exists
    const userTableExists = tablesResult.rows.some(row => row.table_name === 'users');
    if (userTableExists) {
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'users' AND table_schema = 'public'
        ORDER BY ordinal_position;
      `);
      
      console.log('\n=== Columns in users table ===');
      for (const col of columnsResult.rows) {
        console.log(`- ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
      }
    } else {
      console.log('\nNo users table found. We need to create the schema.');
    }
    
    // Check for other relevant tables
    const otherTables = ['posts', 'likes', 'chat_connections', 'chat_messages', 'verification_codes'];
    for (const tableName of otherTables) {
      const tableExists = tablesResult.rows.some(row => row.table_name === tableName);
      if (tableExists) {
        console.log(`\n=== Columns in ${tableName} table ===`);
        const columnsResult = await pool.query(`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_name = $1 AND table_schema = 'public'
          ORDER BY ordinal_position;
        `, [tableName]);
        
        for (const col of columnsResult.rows) {
          console.log(`- ${col.column_name}: ${col.data_type}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error inspecting database:', error);
  } finally {
    await pool.end();
  }
}

inspectDatabase();