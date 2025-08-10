// Simple script to rename the database column using direct database connection
import { Pool } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function renameColumnTasks() {
  try {
    console.log('🔍 Checking current database schema...');
    
    // Check what columns exist
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Available columns in users table:');
    columns.rows.forEach(row => console.log(`  - ${row.column_name} (${row.data_type})`));
    
    // Check for different column variations
    const hasCurrentCity = columns.rows.some(row => row.column_name === 'current_city');
    const hasCity = columns.rows.some(row => row.column_name === 'city');
    const hasPassword = columns.rows.some(row => row.column_name === 'password');
    
    console.log('\n📊 Column status check:');
    console.log(`  - current_city exists: ${hasCurrentCity}`);
    console.log(`  - city exists: ${hasCity}`);
    console.log(`  - password exists: ${hasPassword}`);
    
    if (hasPassword) {
      console.log('\n✅ Password column already exists - no action needed');
      return;
    }
    
    if (hasCurrentCity) {
      console.log('\n🔄 Renaming current_city to password...');
      await pool.query('ALTER TABLE users RENAME COLUMN current_city TO password;');
      console.log('✅ Successfully renamed current_city to password');
    } else if (hasCity) {
      console.log('\n🔄 Renaming city to password...');
      await pool.query('ALTER TABLE users RENAME COLUMN city TO password;');
      console.log('✅ Successfully renamed city to password');
    } else {
      console.log('\n❌ No suitable column found to rename to password');
    }
    
    // Verify the change
    const updatedColumns = await pool.query(`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public' AND column_name = 'password'
    `);
    
    if (updatedColumns.rows.length > 0) {
      console.log('\n🎉 Password column verified in database schema');
    }
    
  } catch (error) {
    console.error('❌ Database operation failed:', error);
  } finally {
    await pool.end();
  }
}

renameColumnTasks();