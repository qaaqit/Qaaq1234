import { pool } from './server/db';

async function createAIFeedbackTable() {
  try {
    console.log('Creating ai_feedback table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_feedback (
        id SERIAL PRIMARY KEY,
        question_id INTEGER NOT NULL,
        answer_id INTEGER NOT NULL,
        feedback_type VARCHAR(50) NOT NULL CHECK (feedback_type IN ('helpful', 'needs_improvement')),
        admin_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(question_id, answer_id, admin_id)
      )
    `);
    
    console.log('✅ AI feedback table created successfully');
    
    // Check if table exists
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'ai_feedback'
    `);
    
    console.log('Table exists:', result.rows.length > 0);
    
  } catch (error) {
    console.error('❌ Error creating ai_feedback table:', error);
    process.exit(1);
  }
}

createAIFeedbackTable()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });