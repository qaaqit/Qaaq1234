import { pool } from './server/db';

async function updateQuestionCounts() {
  try {
    console.log('📊 Updating question counts for top professionals demo...');
    
    // Set some random question counts for existing users to demo the feature
    const updates = [
      { id: '+919988776655', questions: 45, answers: 78 }, // Platform Admin
      { id: '+919087450080', questions: 32, answers: 56 }, // Karthickraja
      { id: 'wa_918848777676', questions: 28, answers: 41 },
      { id: 'wa_905448522674', questions: 19, answers: 33 },
      { id: '44991983', questions: 15, answers: 27 },
      { id: '44992316', questions: 12, answers: 19 }
    ];
    
    for (const update of updates) {
      await pool.query(`
        UPDATE users 
        SET question_count = $1, answer_count = $2 
        WHERE id = $3
      `, [update.questions, update.answers, update.id]);
      
      console.log(`✅ Updated ${update.id}: ${update.questions} questions, ${update.answers} answers`);
    }
    
    // Verify the updates
    const result = await pool.query(`
      SELECT id, full_name, email, question_count, answer_count, maritime_rank
      FROM users 
      WHERE question_count > 0 
      ORDER BY question_count DESC 
      LIMIT 9
    `);
    
    console.log('\n🏆 Top Q Professionals:');
    console.table(result.rows);
    
    console.log('\n🎉 Question counts updated successfully!');
    
  } catch (error) {
    console.error('❌ Error updating question counts:', error);
  } finally {
    process.exit(0);
  }
}

updateQuestionCounts();