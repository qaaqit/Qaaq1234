import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

const userProvidedUrl = 'postgresql://neondb_owner:npg_rTOn7VZkYAb3@ep-autumn-hat-a27gd1cd.eu-central-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({ 
  connectionString: userProvidedUrl,
  ssl: { rejectUnauthorized: false }
});

async function investigateQuestion1551() {
  try {
    const client = await pool.connect();
    
    console.log('🔍 Investigating Question 1551...');
    
    // First, check if question 1551 exists at all
    const basicCheck = await client.query('SELECT id, content, is_hidden, is_archived, created_at, author_id FROM questions WHERE id = 1551');
    
    if (basicCheck.rows.length === 0) {
      console.log('❌ Question 1551 does not exist in the database');
      client.release();
      return;
    }
    
    const question = basicCheck.rows[0];
    console.log('✅ Question 1551 found:', {
      id: question.id,
      is_hidden: question.is_hidden,
      is_archived: question.is_archived,
      content_length: question.content?.length || 0,
      author_id: question.author_id,
      created_at: question.created_at
    });
    
    // Now test the exact query used by getQuestionById
    const detailQuery = await client.query(`
      SELECT 
        q.id,
        q.content,
        q.author_id,
        u.first_name || ' ' || COALESCE(u.last_name, '') as author_name,
        u.maritime_rank as author_rank,
        q.tags,
        q.views as view_count,
        q.is_resolved,
        q.created_at,
        q.updated_at,
        q.image_urls,
        q.is_from_whatsapp,
        q.engagement_score,
        q.flag_count,
        CASE 
          WHEN q.category_id IS NOT NULL THEN 'Maritime Equipment'
          WHEN q.is_from_whatsapp THEN 'WhatsApp Q&A'
          ELSE 'General Discussion'
        END as category,
        (SELECT COUNT(*) FROM answers a WHERE CAST(a.question_id AS TEXT) = CAST(q.id AS TEXT)) as answer_count,
        false as is_anonymous,
        CASE WHEN q.is_from_whatsapp THEN 'whatsapp' ELSE 'web' END as source
      FROM questions q
      LEFT JOIN users u ON CAST(u.id AS TEXT) = CAST(q.author_id AS TEXT)
      WHERE q.id = $1 AND q.is_archived = false AND q.is_hidden = false
    `, [1551]);
    
    console.log('🔍 Detail query result:', {
      found: detailQuery.rows.length > 0,
      data: detailQuery.rows[0] || 'No data returned'
    });
    
    // Check if it appears in the questions list query (first 5 most recent)
    const listQuery = await client.query(`
      SELECT q.id, q.created_at, q.is_hidden, q.is_archived
      FROM questions q
      WHERE q.is_archived = false AND q.is_hidden = false
      ORDER BY q.created_at DESC
      LIMIT 5
    `);
    
    console.log('🔍 Recent questions in list:', listQuery.rows.map(r => ({
      id: r.id,
      created_at: r.created_at,
      is_hidden: r.is_hidden,
      is_archived: r.is_archived
    })));
    
    // Check if question 1551 would appear in any list query
    const countCheck = await client.query(`
      SELECT COUNT(*) as total
      FROM questions q
      WHERE q.is_archived = false AND q.is_hidden = false AND q.id = 1551
    `);
    
    console.log('🔍 Question 1551 in filtered list count:', countCheck.rows[0].total);
    
    client.release();
    
  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
  
  process.exit(0);
}

investigateQuestion1551();