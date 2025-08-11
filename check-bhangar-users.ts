import { pool } from './server/db';

async function checkBhangarUsers() {
  try {
    console.log('🔍 Checking for bhangar users table and question count column...');
    
    // First, list all tables to see what's available
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📋 Available tables:');
    console.table(tablesResult.rows);
    
    // Check for any table with 'bhangar' or similar pattern
    const bhangarTables = tablesResult.rows.filter(row => 
      row.table_name.toLowerCase().includes('bhangar') ||
      row.table_name.toLowerCase().includes('user') ||
      row.table_name.toLowerCase().includes('professional')
    );
    
    console.log('\n🎯 Relevant tables found:');
    console.table(bhangarTables);
    
    // Check current users table structure
    const usersColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n👥 Current users table columns:');
    console.table(usersColumns.rows);
    
    // Check if question_count already exists
    const hasQuestionCount = usersColumns.rows.some(col => 
      col.column_name === 'question_count'
    );
    
    console.log(`\n❓ Question count column exists: ${hasQuestionCount}`);
    
    if (hasQuestionCount) {
      // Show current question count data
      const questionCountData = await pool.query(`
        SELECT id, full_name, question_count, answer_count 
        FROM users 
        WHERE question_count > 0 
        ORDER BY question_count DESC 
        LIMIT 10
      `);
      
      console.log('\n🏆 Current top professionals by question count:');
      console.table(questionCountData.rows);
    }
    
  } catch (error) {
    console.error('❌ Error checking bhangar users:', error);
  } finally {
    process.exit(0);
  }
}

checkBhangarUsers();