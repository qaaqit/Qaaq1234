import { pool } from './server/db';

async function addUserIdColumn() {
  try {
    console.log('🔧 Adding user_id column to users table...');
    
    // Add the user_id column if it doesn't exist
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS user_id TEXT;
    `);
    
    console.log('✅ user_id column added successfully');
    
    // Copy data from id column to user_id column
    console.log('📋 Copying data from id to user_id...');
    await pool.query(`
      UPDATE users 
      SET user_id = id 
      WHERE user_id IS NULL;
    `);
    
    console.log('✅ Data copied successfully');
    
    // Check the results
    const result = await pool.query(`
      SELECT id, user_id, email, full_name 
      FROM users 
      LIMIT 5;
    `);
    
    console.log('📊 Sample data:');
    console.table(result.rows);
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    process.exit(0);
  }
}

addUserIdColumn();