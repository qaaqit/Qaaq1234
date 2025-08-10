import { Pool } from '@neondatabase/serverless';
import ws from "ws";

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionConfig: { ssl: { rejectUnauthorized: false } }
});

async function renameColumn() {
  try {
    console.log('🔍 Checking current columns...');
    
    // First, let's see what columns exist
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('Available columns in users table:');
    columns.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });
    
    // Look for current_city column
    const hasCurrentCity = columns.rows.some(row => row.column_name === 'current_city');
    const hasCity = columns.rows.some(row => row.column_name === 'city');
    const hasPassword = columns.rows.some(row => row.column_name === 'password');
    
    console.log(`\n📋 Column status:`);
    console.log(`- current_city exists: ${hasCurrentCity}`);
    console.log(`- city exists: ${hasCity}`);
    console.log(`- password exists: ${hasPassword}`);
    
    if (hasCurrentCity && !hasPassword) {
      console.log('\n🔄 Renaming current_city to password...');
      await pool.query('ALTER TABLE users RENAME COLUMN current_city TO password;');
      console.log('✅ Successfully renamed current_city to password');
    } else if (hasCity && !hasPassword) {
      console.log('\n🔄 Renaming city to password...');
      await pool.query('ALTER TABLE users RENAME COLUMN city TO password;');
      console.log('✅ Successfully renamed city to password');
    } else if (hasPassword) {
      console.log('\n✅ Password column already exists');
    } else {
      console.log('\n❌ No suitable column found to rename');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

renameColumn();