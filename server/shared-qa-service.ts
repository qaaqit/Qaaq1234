import { pool } from './db';

// Interfaces for shared Q&A system
export interface SharedQuestion {
  id: string;
  questionId: string;
  userId: string;
  userName: string;
  questionText: string;
  questionCategory?: string;
  askedDate: Date;
  source: 'whatsapp' | 'web' | 'api';
  answerCount: number;
  isResolved: boolean;
  urgency: 'low' | 'normal' | 'high';
  tags: string[];
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SharedAnswer {
  id: string;
  answerId: string;
  questionId: string;
  userId: string;
  userName: string;
  answerText: string;
  answeredDate: Date;
  source: 'whatsapp' | 'web' | 'api';
  isAccepted: boolean;
  upvotes: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Store a question in the shared QAAQ database
 * This allows all sister apps to access the same question data
 */
export async function storeQuestion(questionData: {
  questionId: string;
  userId: string;
  userName: string;
  questionText: string;
  questionCategory?: string;
  askedDate: Date;
  source: 'whatsapp' | 'web' | 'api';
  urgency?: 'low' | 'normal' | 'high';
  tags?: string[];
  location?: string;
}): Promise<SharedQuestion> {
  const query = `
    INSERT INTO qaaq_questions (
      question_id, user_id, user_name, question_text, question_category,
      created_at, source, urgency, tags, location
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (question_id) 
    DO UPDATE SET 
      question_text = EXCLUDED.question_text,
      question_category = EXCLUDED.question_category,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;

  const values = [
    questionData.questionId,
    questionData.userId,
    questionData.userName,
    questionData.questionText,
    questionData.questionCategory || null,
    questionData.askedDate,
    questionData.source,
    questionData.urgency || 'normal',
    questionData.tags || [],
    questionData.location || null
  ];

  try {
    const result = await pool.query(query, values);
    return mapRowToQuestion(result.rows[0]);
  } catch (error) {
    console.error('Error storing question:', error);
    throw new Error('Failed to store question in shared database');
  }
}

/**
 * Get all questions for a specific user
 */
export async function getUserQuestionsFromSharedDB(userId: string): Promise<SharedQuestion[]> {
  const query = `
    SELECT * FROM qaaq_questions 
    WHERE user_id = $1 
    ORDER BY created_at DESC
  `;

  try {
    const result = await pool.query(query, [userId]);
    return result.rows.map(mapRowToQuestion);
  } catch (error) {
    console.error('Error fetching user questions:', error);
    return [];
  }
}

/**
 * Get questions by user name (for fuzzy matching)
 */
export async function getQuestionsByUserName(userName: string): Promise<SharedQuestion[]> {
  const query = `
    SELECT * FROM qaaq_questions 
    WHERE LOWER(user_name) LIKE LOWER($1)
    ORDER BY created_at DESC
  `;

  try {
    const result = await pool.query(query, [`%${userName}%`]);
    return result.rows.map(mapRowToQuestion);
  } catch (error) {
    console.error('Error fetching questions by user name:', error);
    return [];
  }
}

/**
 * Get all questions from shared database
 */
export async function getAllQuestionsFromSharedDB(): Promise<SharedQuestion[]> {
  const query = `
    SELECT * FROM questions 
    ORDER BY created_at DESC
  `;

  try {
    console.log('Executing query to fetch all questions from questions table...');
    const result = await pool.query(query);
    console.log(`Found ${result.rows.length} questions in questions table (authentic QAAQ data)`);
    
    if (result.rows.length > 0) {
      console.log('Sample raw question data:', {
        id: result.rows[0].id,
        question_text: result.rows[0].question_text?.substring(0, 100) + '...',
        user_name: result.rows[0].user_name,
        created_at: result.rows[0].created_at,
        all_columns: Object.keys(result.rows[0])
      });
      
      const mappedSample = mapRowToQuestion(result.rows[0]);
      console.log('Sample mapped question:', {
        id: mappedSample.id,
        questionText: mappedSample.questionText?.substring(0, 100) + '...',
        userName: mappedSample.userName
      });
    }
    
    return result.rows.map(mapRowToQuestion);
  } catch (error) {
    console.error('Error fetching all questions:', error);
    return [];
  }
}

/**
 * Search questions by keyword with exact matches first, then fuzzy matches
 */
export async function searchQuestionsInSharedDB(keyword: string): Promise<SharedQuestion[]> {
  const lowerKeyword = keyword.toLowerCase().trim();
  
  // Enhanced search query with scoring for relevance
  const query = `
    WITH scored_questions AS (
      SELECT *,
        CASE
          -- Exact matches in content (highest priority)
          WHEN LOWER(content) = LOWER($1) THEN 1000
          WHEN LOWER(content) LIKE LOWER($2) THEN 900  -- Starts with keyword
          WHEN LOWER(content) LIKE LOWER($3) THEN 800  -- Ends with keyword
          
          -- Exact word matches (high priority)
          WHEN LOWER(content) ~ ('\\m' || LOWER($1) || '\\M') THEN 700  -- Whole word match
          
          -- Category exact matches
          WHEN LOWER(category_name) = LOWER($1) THEN 650
          WHEN LOWER(category_name) LIKE LOWER($4) THEN 600
          
          -- Author exact matches
          WHEN LOWER(author_name) = LOWER($1) THEN 550
          WHEN LOWER(author_name) LIKE LOWER($4) THEN 500
          
          -- Partial content matches (medium priority)
          WHEN LOWER(content) LIKE LOWER($4) THEN 400
          
          -- Fuzzy matches (lower priority)
          WHEN LOWER(content) ILIKE '%' || LOWER($1) || '%' THEN 200
          WHEN LOWER(category_name) ILIKE '%' || LOWER($1) || '%' THEN 150
          WHEN LOWER(author_name) ILIKE '%' || LOWER($1) || '%' THEN 100
          
          ELSE 0
        END as relevance_score
      FROM questions 
      WHERE 
        LOWER(content) ILIKE '%' || LOWER($1) || '%' OR
        LOWER(category_name) ILIKE '%' || LOWER($1) || '%' OR
        LOWER(author_name) ILIKE '%' || LOWER($1) || '%'
    )
    SELECT * FROM scored_questions 
    WHERE relevance_score > 0
    ORDER BY 
      relevance_score DESC,
      created_at DESC
    LIMIT 100
  `;

  try {
    console.log(`Enhanced search for keyword: "${keyword}"`);
    
    const searchParams = [
      lowerKeyword,                    // $1 - exact match
      `${lowerKeyword}%`,             // $2 - starts with
      `%${lowerKeyword}`,             // $3 - ends with  
      `%${lowerKeyword}%`             // $4 - contains
    ];
    
    const result = await pool.query(query, searchParams);
    console.log(`Enhanced search found ${result.rows.length} questions with relevance scoring`);
    
    // Log top results for debugging
    if (result.rows.length > 0) {
      console.log(`Top search results:`, result.rows.slice(0, 3).map(row => ({
        content: row.content?.substring(0, 80) + '...',
        relevance_score: row.relevance_score
      })));
    }
    
    return result.rows.map(mapRowToQuestion);
  } catch (error) {
    console.error('Error in enhanced search:', error);
    
    // Fallback to simple search if complex query fails
    console.log('Falling back to simple search...');
    const fallbackQuery = `
      SELECT * FROM questions 
      WHERE 
        LOWER(content) ILIKE '%' || LOWER($1) || '%' OR
        LOWER(category_name) ILIKE '%' || LOWER($1) || '%' OR
        LOWER(author_name) ILIKE '%' || LOWER($1) || '%'
      ORDER BY created_at DESC
      LIMIT 50
    `;
    
    try {
      const fallbackResult = await pool.query(fallbackQuery, [lowerKeyword]);
      console.log(`Fallback search found ${fallbackResult.rows.length} questions`);
      return fallbackResult.rows.map(mapRowToQuestion);
    } catch (fallbackError) {
      console.error('Error in fallback search:', fallbackError);
      return [];
    }
  }
}

/**
 * Store an answer in the shared QAAQ database
 */
export async function storeAnswer(answerData: {
  answerId: string;
  questionId: string;
  userId: string;
  userName: string;
  answerText: string;
  answeredDate: Date;
  source: 'whatsapp' | 'web' | 'api';
  isAccepted?: boolean;
}): Promise<SharedAnswer> {
  const query = `
    INSERT INTO qaaq_answers (
      answer_id, question_id, user_id, user_name, answer_text,
      answered_date, source, is_accepted
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (answer_id) 
    DO UPDATE SET 
      answer_text = EXCLUDED.answer_text,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;

  const values = [
    answerData.answerId,
    answerData.questionId,
    answerData.userId,
    answerData.userName,
    answerData.answerText,
    answerData.answeredDate,
    answerData.source,
    answerData.isAccepted || false
  ];

  try {
    const result = await pool.query(query, values);
    
    // Update answer count in questions table
    await updateQuestionAnswerCount(answerData.questionId);
    
    return mapRowToAnswer(result.rows[0]);
  } catch (error) {
    console.error('Error storing answer:', error);
    throw new Error('Failed to store answer in shared database');
  }
}

/**
 * Get answers for a specific question
 */
export async function getAnswersForQuestion(questionId: string): Promise<SharedAnswer[]> {
  const query = `
    SELECT * FROM answers 
    WHERE CAST(question_id AS TEXT) = CAST($1 AS TEXT)
    ORDER BY created_at ASC
  `;

  try {
    const result = await pool.query(query, [questionId]);
    return result.rows.map(mapRowToAnswer);
  } catch (error) {
    console.error('Error fetching answers:', error);
    return [];
  }
}

/**
 * Update answer count for a question
 */
async function updateQuestionAnswerCount(questionId: string): Promise<void> {
  const query = `
    UPDATE qaaq_questions 
    SET 
      answer_count = (SELECT COUNT(*) FROM qaaq_answers WHERE question_id = $1),
      updated_at = CURRENT_TIMESTAMP
    WHERE question_id = $1
  `;

  try {
    await pool.query(query, [questionId]);
  } catch (error) {
    console.error('Error updating answer count:', error);
  }
}

/**
 * Sync question from WhatsApp bot or other sources
 * This function can be called by sister apps to add questions to shared storage
 */
export async function syncQuestionFromExternalSource(questionData: {
  questionId: string;
  userId: string;
  userName: string;
  questionText: string;
  source: 'whatsapp' | 'web' | 'api';
  askedDate?: Date;
  category?: string;
  tags?: string[];
  location?: string;
}): Promise<boolean> {
  try {
    await storeQuestion({
      questionId: questionData.questionId,
      userId: questionData.userId,
      userName: questionData.userName,
      questionText: questionData.questionText,
      questionCategory: questionData.category,
      askedDate: questionData.askedDate || new Date(),
      source: questionData.source,
      tags: questionData.tags,
      location: questionData.location
    });

    console.log(`Question synced to shared DB: ${questionData.questionId} from ${questionData.source}`);
    return true;
  } catch (error) {
    console.error('Error syncing question from external source:', error);
    return false;
  }
}

// Helper functions to map database rows to interfaces
function mapRowToQuestion(row: any): SharedQuestion {
  return {
    id: row.id,
    questionId: row.id || row.question_id,
    userId: row.author_id || row.user_id || '',
    userName: row.author_name || row.user_name || 'Maritime Professional',
    questionText: row.content || row.question_text || '',
    questionCategory: row.category_name || row.question_category || 'General Discussion',
    askedDate: new Date(row.created_at),
    source: row.source || 'web',
    answerCount: row.answer_count || 0,
    isResolved: row.is_resolved || false,
    urgency: row.urgency || 'normal',
    tags: row.tags || [],
    location: row.location,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at || row.created_at)
  };
}

function mapRowToAnswer(row: any): SharedAnswer {
  return {
    id: row.id,
    answerId: row.answer_id,
    questionId: row.question_id,
    userId: row.user_id,
    userName: row.user_name,
    answerText: row.answer_text,
    answeredDate: new Date(row.answered_date),
    source: row.source,
    isAccepted: row.is_accepted || false,
    upvotes: row.upvotes || 0,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}