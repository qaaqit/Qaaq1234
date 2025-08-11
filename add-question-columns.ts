import { pool } from './server/db';

async function addQuestionColumns() {
  try {
    console.log('🔧 Adding question_count and answer_count columns to users table...');
    
    // Add question_count column if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS question_count INTEGER DEFAULT 0;
      `);
      console.log('✅ Added question_count column');
    } catch (error) {
      console.log('⚠️ Question_count column might already exist:', error);
    }
    
    // Add answer_count column if it doesn't exist  
    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS answer_count INTEGER DEFAULT 0;
      `);
      console.log('✅ Added answer_count column');
    } catch (error) {
      console.log('⚠️ Answer_count column might already exist:', error);
    }
    
    // Verify columns were added
    const columnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND table_schema = 'public'
      AND column_name IN ('question_count', 'answer_count')
      ORDER BY column_name;
    `);
    
    console.log('📊 Question columns now in users table:', columnsResult.rows);
    
    // Now migrate the data from bhangar_users
    console.log('🔄 Migrating question counts from bhangar_users to users...');
    
    const migrateResult = await pool.query(`
      UPDATE users 
      SET 
        question_count = COALESCE(b.question_count, 0),
        answer_count = COALESCE(b.answer_count, 0)
      FROM bhangar_users b 
      WHERE users.id = b.id;
    `);
    
    console.log(`✅ Updated ${migrateResult.rowCount} users with question counts from bhangar_users`);
    
    // Verify the migration worked
    const verifyResult = await pool.query(`
      SELECT id, full_name, question_count, answer_count 
      FROM users 
      WHERE question_count > 0 
      ORDER BY question_count DESC 
      LIMIT 10;
    `);
    
    console.log('🔍 Top 10 users by question count after migration:');
    verifyResult.rows.forEach(user => {
      console.log(`- ${user.full_name} (${user.id}): ${user.question_count}Q, ${user.answer_count}A`);
    });
    
  } catch (error) {
    console.error('❌ Error adding question columns:', error);
  } finally {
    await pool.end();
  }
}

addQuestionColumns();