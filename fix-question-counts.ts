import { pool } from './server/db';

async function fixQuestionCounts() {
  try {
    console.log('🔧 Starting question count migration from bhangar_users to users table...');
    
    // First check if bhangar_users table exists
    const checkBhangarTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bhangar_users'
      );
    `);
    
    if (!checkBhangarTable.rows[0].exists) {
      console.log('❌ bhangar_users table does not exist');
      return;
    }
    
    // Check what columns exist in bhangar_users
    const bhangarColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'bhangar_users' 
      AND table_schema = 'public'
      AND column_name LIKE '%question%'
      ORDER BY column_name;
    `);
    
    console.log('📊 Question-related columns in bhangar_users:', bhangarColumns.rows);
    
    // Check what columns exist in users table
    const usersColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND table_schema = 'public'
      AND column_name LIKE '%question%'
      ORDER BY column_name;
    `);
    
    console.log('📊 Question-related columns in users:', usersColumns.rows);
    
    // Get sample data from bhangar_users to see question counts
    const sampleBhangar = await pool.query(`
      SELECT id, first_name, last_name, question_count, answer_count 
      FROM bhangar_users 
      WHERE question_count > 0 
      ORDER BY question_count DESC 
      LIMIT 10;
    `);
    
    console.log('📊 Top 10 users by question count from bhangar_users:', sampleBhangar.rows);
    
    // Get sample data from users table
    const sampleUsers = await pool.query(`
      SELECT id, full_name, question_count, answer_count 
      FROM users 
      ORDER BY COALESCE(question_count, 0) DESC 
      LIMIT 10;
    `);
    
    console.log('📊 Top 10 users by question count from users:', sampleUsers.rows);
    
    // Now migrate the question counts
    const migrateResult = await pool.query(`
      UPDATE users 
      SET 
        question_count = COALESCE(b.question_count, 0),
        answer_count = COALESCE(b.answer_count, 0)
      FROM bhangar_users b 
      WHERE users.id = b.id 
      AND (
        users.question_count IS NULL OR 
        users.question_count = 0 OR
        users.question_count != b.question_count
      );
    `);
    
    console.log(`✅ Updated ${migrateResult.rowCount} users with question counts from bhangar_users`);
    
    // Verify the migration
    const verifyResult = await pool.query(`
      SELECT id, full_name, question_count, answer_count 
      FROM users 
      WHERE question_count > 0 
      ORDER BY question_count DESC 
      LIMIT 10;
    `);
    
    console.log('🔍 Verification - Top 10 users by question count after migration:', verifyResult.rows);
    
  } catch (error) {
    console.error('❌ Error fixing question counts:', error);
  } finally {
    await pool.end();
  }
}

fixQuestionCounts();