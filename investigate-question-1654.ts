import { pool } from './server/db/index.js';

async function investigateQuestion1654() {
  console.log('🔍 Investigating Question #1654 Original Author');
  
  try {
    const client = await pool.connect();
    
    // Get detailed information about question 1654
    const questionResult = await client.query(`
      SELECT 
        q.id,
        q.author_id,
        q.content,
        q.created_at,
        q.updated_at,
        q.is_from_whatsapp,
        q.is_archived,
        q.is_hidden,
        u.first_name,
        u.last_name,
        u.whatsapp_number,
        u.email,
        u.location,
        u.maritime_rank,
        u.created_at as user_created_at
      FROM questions q
      LEFT JOIN users u ON CAST(u.id AS TEXT) = CAST(q.author_id AS TEXT)
      WHERE q.id = 1654
    `);
    
    console.log('📋 Question 1654 Details:', questionResult.rows[0]);
    
    // Check if there are multiple users with ID 44885683
    const userCheckResult = await client.query(`
      SELECT 
        id,
        first_name,
        last_name,
        whatsapp_number,
        email,
        location,
        maritime_rank,
        created_at,
        updated_at
      FROM users 
      WHERE id = $1
    `, [questionResult.rows[0]?.author_id]);
    
    console.log('👤 User Details for Author ID:', userCheckResult.rows);
    
    // Check for any audit logs or history that might show the original author
    const historyResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%history%' OR table_name LIKE '%audit%' OR table_name LIKE '%log%')
    `);
    
    console.log('📚 Available History/Audit Tables:', historyResult.rows);
    
    // Check if the question content contains any clues about the original author
    const content = questionResult.rows[0]?.content;
    console.log('📝 Question Content Analysis:');
    console.log('- Contains [QBOT Q&A]:', content?.includes('[QBOT Q&A'));
    console.log('- Contains User:', content?.includes('User:'));
    console.log('- Contains via QBOT:', content?.includes('via QBOT'));
    console.log('- Is from WhatsApp:', questionResult.rows[0]?.is_from_whatsapp);
    
    // Extract potential original user from content if available
    if (content) {
      const userMatch = content.match(/User:\s*([^(]+)\s*\(/);
      if (userMatch) {
        console.log('🎯 Extracted Original User from Content:', userMatch[1].trim());
      }
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error investigating question:', error);
  }
}

investigateQuestion1654();