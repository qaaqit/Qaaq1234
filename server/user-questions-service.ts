import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

const userProvidedUrl = 'postgresql://neondb_owner:npg_rTOn7VZkYAb3@ep-autumn-hat-a27gd1cd.eu-central-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({ 
  connectionString: userProvidedUrl,
  ssl: { rejectUnauthorized: false }
});

export interface UserQuestion {
  id: number;
  content: string;
  author_id: string;
  author_name: string;
  author_rank?: string;
  tags: string[];
  views: number;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
  is_from_whatsapp: boolean;
  answer_count: number;
  category_name: string;
}

/**
 * Get questions by user ID
 */
export async function getQuestionsByUserId(userId: string): Promise<{
  questions: UserQuestion[];
  total: number;
}> {
  try {
    const client = await pool.connect();
    
    console.log(`Fetching questions for user ID: ${userId}`);
    
    // Get questions with author information
    const questionsResult = await client.query(`
      SELECT 
        q.id,
        q.content,
        q.author_id,
        u.first_name || ' ' || COALESCE(u.last_name, '') as author_name,
        u.maritime_rank as author_rank,
        q.tags,
        q.views,
        q.is_resolved,
        q.created_at,
        q.updated_at,
        q.is_from_whatsapp,
        CASE 
          WHEN q.category_id IS NOT NULL THEN 'Maritime Equipment'
          WHEN q.is_from_whatsapp THEN 'WhatsApp Q&A'
          ELSE 'General Discussion'
        END as category_name,
        (SELECT COUNT(*) FROM qaaq_answers a WHERE a.question_id = q.id) as answer_count
      FROM questions q
      LEFT JOIN users u ON u.id = q.author_id
      WHERE q.author_id = $1 AND q.is_archived = false AND q.is_hidden = false
      ORDER BY q.created_at DESC
    `, [userId]);
    
    const questions = questionsResult.rows.map(row => ({
      ...row,
      author_name: row.author_name?.trim() || 'Anonymous',
      tags: row.tags || [],
      views: row.views || 0,
      answer_count: parseInt(row.answer_count) || 0
    }));
    
    const total = questions.length;
    
    console.log(`Retrieved ${questions.length} questions for user ${userId}`);
    
    client.release();
    
    return {
      questions,
      total
    };
    
  } catch (error) {
    console.error('Error fetching user questions:', error);
    throw new Error('Failed to fetch user questions');
  }
}

/**
 * Get user profile information
 */
export async function getUserProfile(userId: string): Promise<any> {
  try {
    const client = await pool.connect();
    
    const userResult = await client.query(`
      SELECT 
        id,
        first_name || ' ' || COALESCE(last_name, '') as full_name,
        maritime_rank,
        email,
        phone_number,
        current_city,
        current_country,
        created_at,
        question_count,
        answer_count
      FROM users
      WHERE id = $1
    `, [userId]);
    
    client.release();
    
    if (userResult.rows.length === 0) {
      return null;
    }
    
    return userResult.rows[0];
    
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw new Error('Failed to fetch user profile');
  }
}