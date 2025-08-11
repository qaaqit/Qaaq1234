import { pool } from './server/db';

async function addMissingColumns() {
  try {
    console.log('🔧 Adding missing columns to users table...');
    
    const missingColumns = [
      'has_set_custom_password BOOLEAN DEFAULT FALSE',
      'liberal_login_count INTEGER DEFAULT 0',
      'needs_password_change BOOLEAN DEFAULT TRUE',
      'password_created_at TIMESTAMP',
      'password_renewal_due TIMESTAMP',
      'must_create_password BOOLEAN DEFAULT TRUE',
      'login_count INTEGER DEFAULT 0',
      'last_login TIMESTAMP',
      'is_verified BOOLEAN DEFAULT FALSE'
    ];
    
    for (const column of missingColumns) {
      try {
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${column};`);
        console.log(`✅ Added column: ${column.split(' ')[0]}`);
      } catch (error) {
        console.log(`⚠️ Column ${column.split(' ')[0]} might already exist:`, error.message);
      }
    }
    
    console.log('🎉 Column addition completed!');
    
  } catch (error) {
    console.error('❌ Error during column addition:', error);
  } finally {
    process.exit(0);
  }
}

addMissingColumns();