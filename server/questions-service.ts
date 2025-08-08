import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

const userProvidedUrl = 'postgresql://neondb_owner:npg_rTOn7VZkYAb3@ep-autumn-hat-a27gd1cd.eu-central-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({ 
  connectionString: userProvidedUrl,
  ssl: { rejectUnauthorized: false }
});

export interface Question {
  id: number;
  content: string;
  author_id: string;
  author_name?: string;
  author_rank?: string;
  author_whatsapp_profile_picture_url?: string | null;
  author_whatsapp_display_name?: string | null;
  author_profile_picture_url?: string | null;
  tags: string[];
  views: number;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
  image_urls: string[];
  is_from_whatsapp: boolean;
  engagement_score: number;
  flag_count: number;
  category_name?: string;
  answer_count?: number;
}

/**
 * Get questions with pagination and user details
 */
export async function getQuestions(page: number = 1, limit: number = 20, withImages: boolean = false): Promise<{
  questions: Question[];
  total: number;
  hasMore: boolean;
}> {
  try {
    const client = await pool.connect();
    const offset = (page - 1) * limit;
    
    console.log(`Fetching questions page ${page} with limit ${limit}...`);
    
    // Get questions with author information
    const questionsResult = await client.query(`
      SELECT 
        q.id,
        q.content,
        q.author_id,
        u.first_name || ' ' || COALESCE(u.last_name, '') as author_name,
        u.maritime_rank as author_rank,
        u.whatsapp_profile_picture_url as author_whatsapp_profile_picture_url,
        u.whatsapp_display_name as author_whatsapp_display_name,
        u.profile_image_url as author_profile_picture_url,
        q.tags,
        q.views,
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
        END as category_name,
        (SELECT COUNT(*) FROM qaaq_answers a WHERE a.question_id = q.id) as answer_count
      FROM questions q
      LEFT JOIN users u ON CAST(u.id AS TEXT) = CAST(q.author_id AS TEXT)
      WHERE q.is_archived = false AND q.is_hidden = false
      ${withImages ? 'AND q.image_urls IS NOT NULL AND array_length(q.image_urls, 1) > 0' : ''}
      ORDER BY q.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    // Get total count
    const countResult = await client.query(`
      SELECT COUNT(*) as total 
      FROM questions 
      WHERE is_archived = false AND is_hidden = false
      ${withImages ? 'AND image_urls IS NOT NULL AND array_length(image_urls, 1) > 0' : ''}
    `);
    
    const total = parseInt(countResult.rows[0].total);
    const questions = questionsResult.rows.map(row => ({
      ...row,
      author_name: row.author_name?.trim() || 'Anonymous',
      author_whatsapp_profile_picture_url: row.author_whatsapp_profile_picture_url || null,
      author_whatsapp_display_name: row.author_whatsapp_display_name || null,
      author_profile_picture_url: row.author_profile_picture_url || null,
      tags: row.tags || [],
      image_urls: row.image_urls || [],
      views: row.views || 0,
      engagement_score: row.engagement_score || 0,
      flag_count: row.flag_count || 0,
      answer_count: parseInt(row.answer_count) || 0
    }));
    
    const hasMore = (page * limit) < total;
    
    console.log(`Retrieved ${questions.length} questions, total: ${total}, hasMore: ${hasMore}`);
    
    client.release();
    
    return {
      questions,
      total,
      hasMore
    };
    
  } catch (error) {
    console.error('Error fetching questions:', error);
    throw new Error('Failed to fetch questions');
  }
}

/**
 * Get a single question by ID
 */
export async function getQuestionById(questionId: number): Promise<Question | null> {
  try {
    const client = await pool.connect();
    
    const result = await client.query(`
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
        (SELECT COUNT(*) FROM qaaq_answers a WHERE a.question_id = q.id) as answer_count,
        false as is_anonymous,
        CASE WHEN q.is_from_whatsapp THEN 'whatsapp' ELSE 'web' END as source
      FROM questions q
      LEFT JOIN users u ON CAST(u.id AS TEXT) = CAST(q.author_id AS TEXT)
      WHERE q.id = $1 AND q.is_archived = false AND q.is_hidden = false
    `, [questionId]);
    
    client.release();
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error fetching question by ID:', error);
    throw error;
  }
}

/**
 * Get answers for a specific question
 */
export async function getQuestionAnswers(questionId: number): Promise<any[]> {
  try {
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT 
        a.id,
        a.content,
        a.author_id,
        u.first_name || ' ' || COALESCE(u.last_name, '') as author_name,
        u.maritime_rank as author_rank,
        u.whatsapp_profile_picture_url as author_whatsapp_profile_picture_url,
        u.whatsapp_display_name as author_whatsapp_display_name,
        u.profile_image_url as author_profile_picture_url,
        a.created_at,
        a.image_urls,
        CASE 
          WHEN a.author_id LIKE 'wa_%' OR u.whatsapp_display_name IS NOT NULL THEN true
          ELSE false
        END as is_from_whatsapp,
        false as is_best_answer
      FROM qaaq_answers a
      LEFT JOIN users u ON CAST(u.id AS TEXT) = CAST(a.author_id AS TEXT)
      WHERE a.question_id = $1
      ORDER BY 
        a.created_at ASC
    `, [questionId]);
    
    const answers = result.rows.map(row => ({
      ...row,
      author_name: row.author_name?.trim() || 'Anonymous',
      author_whatsapp_profile_picture_url: row.author_whatsapp_profile_picture_url || null,
      author_whatsapp_display_name: row.author_whatsapp_display_name || null,
      author_profile_picture_url: row.author_profile_picture_url || null,
      image_urls: row.image_urls || [],
      is_from_whatsapp: row.is_from_whatsapp || false
    }));
    
    client.release();
    return answers;
  } catch (error) {
    console.error('Error fetching question answers:', error);
    throw error;
  }
}

/**
 * Search questions by text
 */
export async function searchQuestions(query: string, page: number = 1, limit: number = 20): Promise<{
  questions: Question[];
  total: number;
  hasMore: boolean;
}> {
  try {
    const client = await pool.connect();
    const offset = (page - 1) * limit;
    
    console.log(`Searching questions for: "${query}" page ${page}...`);
    
    const questionsResult = await client.query(`
      SELECT 
        q.id,
        q.content,
        q.author_id,
        u.first_name || ' ' || COALESCE(u.last_name, '') as author_name,
        u.maritime_rank as author_rank,
        u.whatsapp_profile_picture_url as author_whatsapp_profile_picture_url,
        u.whatsapp_display_name as author_whatsapp_display_name,
        u.profile_image_url as author_profile_picture_url,
        q.tags,
        q.views,
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
        END as category_name,
        (SELECT COUNT(*) FROM qaaq_answers a WHERE a.question_id = q.id) as answer_count
      FROM questions q
      LEFT JOIN users u ON CAST(u.id AS TEXT) = CAST(q.author_id AS TEXT)
      WHERE q.is_archived = false 
        AND q.is_hidden = false
        AND (
          q.content ILIKE $1 
          OR EXISTS (
            SELECT 1 FROM unnest(q.tags) tag 
            WHERE tag ILIKE $1
          )
          OR u.first_name ILIKE $1
          OR u.last_name ILIKE $1
        )
      ORDER BY q.created_at DESC
      LIMIT $2 OFFSET $3
    `, [`%${query}%`, limit, offset]);
    
    const countResult = await client.query(`
      SELECT COUNT(*) as total 
      FROM questions q
      LEFT JOIN users u ON CAST(u.id AS TEXT) = CAST(q.author_id AS TEXT)
      WHERE q.is_archived = false 
        AND q.is_hidden = false
        AND (
          q.content ILIKE $1 
          OR EXISTS (
            SELECT 1 FROM unnest(q.tags) tag 
            WHERE tag ILIKE $1
          )
          OR u.first_name ILIKE $1
          OR u.last_name ILIKE $1
        )
    `, [`%${query}%`]);
    
    const total = parseInt(countResult.rows[0].total);
    const questions = questionsResult.rows.map(row => ({
      ...row,
      author_name: row.author_name?.trim() || 'Anonymous',
      author_whatsapp_profile_picture_url: row.author_whatsapp_profile_picture_url || null,
      author_whatsapp_display_name: row.author_whatsapp_display_name || null,
      author_profile_picture_url: row.author_profile_picture_url || null,
      tags: row.tags || [],
      image_urls: row.image_urls || [],
      views: row.views || 0,
      engagement_score: row.engagement_score || 0,
      flag_count: row.flag_count || 0,
      answer_count: parseInt(row.answer_count) || 0
    }));
    
    const hasMore = (page * limit) < total;
    
    console.log(`Found ${questions.length} questions matching "${query}", total: ${total}`);
    
    client.release();
    
    return {
      questions,
      total,
      hasMore
    };
    
  } catch (error) {
    console.error('Error searching questions:', error);
    throw new Error('Failed to search questions');
  }
}