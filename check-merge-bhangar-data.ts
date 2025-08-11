import { pool } from './server/db';

async function checkAndMergeBhangarData() {
  try {
    console.log('🔍 Checking bhangar_users table structure and data...');
    
    // Check bhangar_users table columns
    const bhangarColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'bhangar_users' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Bhangar users table columns:');
    console.table(bhangarColumns.rows);
    
    // Check if bhangar_users has question_count column
    const hasQuestionCount = bhangarColumns.rows.some(col => 
      col.column_name === 'question_count'
    );
    
    if (hasQuestionCount) {
      // Get sample data from bhangar_users
      const bhangarData = await pool.query(`
        SELECT id, full_name, question_count, answer_count 
        FROM bhangar_users 
        WHERE question_count > 0 
        ORDER BY question_count DESC 
        LIMIT 10
      `);
      
      console.log('\n🗃️ Bhangar users with question counts:');
      console.table(bhangarData.rows);
      
      // Check for users that exist in bhangar but have higher question counts
      const mergeCandidates = await pool.query(`
        SELECT 
          b.id, 
          b.full_name, 
          b.question_count as bhangar_count,
          u.question_count as users_count,
          b.answer_count as bhangar_answers,
          u.answer_count as users_answers
        FROM bhangar_users b
        LEFT JOIN users u ON b.id = u.id
        WHERE b.question_count > COALESCE(u.question_count, 0)
        ORDER BY b.question_count DESC
        LIMIT 20
      `);
      
      console.log('\n🔀 Users needing question count updates from bhangar:');
      console.table(mergeCandidates.rows);
      
      if (mergeCandidates.rows.length > 0) {
        console.log('\n⚡ Updating question counts from bhangar data...');
        
        for (const candidate of mergeCandidates.rows) {
          await pool.query(`
            UPDATE users 
            SET question_count = $1, answer_count = $2 
            WHERE id = $3
          `, [candidate.bhangar_count, candidate.bhangar_answers, candidate.id]);
          
          console.log(`✅ Updated ${candidate.id}: ${candidate.bhangar_count} questions`);
        }
      }
    } else {
      console.log('\n❌ No question_count column found in bhangar_users table');
    }
    
    // Final check - get updated top professionals
    const finalTop = await pool.query(`
      SELECT 
        id, full_name, question_count, answer_count, 
        maritime_rank, current_ship_name, port, country
      FROM users 
      WHERE question_count > 0 
      ORDER BY question_count DESC 
      LIMIT 9
    `);
    
    console.log('\n🏆 FINAL Top 9 Q Professionals:');
    console.table(finalTop.rows);
    
  } catch (error) {
    console.error('❌ Error checking bhangar data:', error);
  } finally {
    process.exit(0);
  }
}

checkAndMergeBhangarData();