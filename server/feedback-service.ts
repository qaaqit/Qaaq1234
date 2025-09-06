import { pool } from './db';

// Feedback message templates with variations for natural conversation flow
const FEEDBACK_TEMPLATES = {
  // Question appreciation messages
  appreciation: [
    "Great question! 🌊",
    "Excellent technical question! ⚙️",
    "Brilliant maritime inquiry! 🚢", 
    "That's a really insightful question! 💡",
    "Fantastic technical doubt! 🔧",
    "Smart question from a true professional! ⭐",
    "Impressive technical thinking! 🎯",
    "That was an interesting challenge! 🤔",
    "Good technical awareness! 👍",
    "Sharp maritime question! ⚓"
  ],
  
  // Feedback request messages
  feedbackRequest: [
    "How would you rate the quality of this answer?",
    "Was this answer helpful for your situation?",
    "Did this response solve your technical concern?",
    "Rate the answer quality - Excellent/Good/Needs Improvement?",
    "How satisfied are you with this technical explanation?",
    "Does this answer meet your maritime engineering needs?",
    "Quick feedback: Was this response accurate and useful?",
    "Help us improve - rate this answer's quality?",
    "Your feedback helps QBOT learn better - how was this answer?",
    "Rate this maritime solution: Perfect/Good/Could be better?"
  ],
  
  // Call-to-action messages
  callToAction: [
    "Reply with: ⭐⭐⭐⭐⭐ (1-5 stars) or 'Excellent/Good/Poor'",
    "Send: 👍 (helpful) or 👎 (needs improvement)",
    "Rate: 5/5, 4/5, 3/5, 2/5, or 1/5",
    "Reply: 'Perfect', 'Good', or 'Needs work'",
    "Quick rating: 'Excellent', 'Satisfactory', or 'Poor'",
    "Rate this answer from 1-10 or use 👍/👎",
    "Send your rating: A/B/C (A=Excellent, B=Good, C=Poor)",
    "Feedback: 'Helpful', 'Partial', or 'Not useful'",
    "Reply with stars ⭐⭐⭐⭐⭐ or simple rating",
    "Rate: 'Outstanding', 'Good', or 'Improve'"
  ]
};

export class FeedbackService {
  
  /**
   * Generate a complete feedback message combining appreciation + feedback request + call-to-action
   */
  static generateFeedbackMessage(questionDifficulty?: 'simple' | 'complex' | 'technical' | 'advanced'): string {
    const appreciation = this.getRandomTemplate('appreciation');
    const feedbackRequest = this.getRandomTemplate('feedbackRequest');
    const callToAction = this.getRandomTemplate('callToAction');
    
    // Customize appreciation based on question difficulty
    let customAppreciation = appreciation;
    if (questionDifficulty === 'advanced') {
      customAppreciation = "That was a complex technical challenge! 🎯";
    } else if (questionDifficulty === 'technical') {
      customAppreciation = "Solid maritime engineering question! ⚙️";
    } else if (questionDifficulty === 'simple') {
      customAppreciation = "Good fundamental question! 💡";
    }
    
    return `${customAppreciation}\n\n${feedbackRequest}\n\n${callToAction}`;
  }
  
  /**
   * Generate a compact feedback message for WhatsApp (character limit friendly)
   */
  static generateCompactFeedbackMessage(language = 'en'): string {
    const compact = language === 'tr' ? [
      "Harika soru! 🌊 Cevabın kalitesini değerlendirin: ⭐⭐⭐⭐⭐ (1-5 yıldız)",
      "Mükemmel denizcilik sorusu! ⚙️ Bu cevap ne kadar yararlıydı? Gönderin: 👍 veya 👎",
      "Akıllı teknik soru! 💡 Bu yanıtı değerlendirin: A/B/C (A=Mükemmel, B=İyi, C=Zayıf)",
      "Parlak sorgu! 🚢 Hızlı geri bildirim - 1-5 puan verin veya 'İyi/Mükemmel/Zayıf'",
      "Etkileyici soru! ⭐ Bu cevap faydalı mıydı? Yanıtlayın: 'Evet/Kısmen/Hayır'",
      "İyi teknik düşünce! 🔧 Çözümün kalitesini değerlendirin: 1-10",
      "Keskin denizcilik sorusu! ⚓ Cevap yardımcı mı? Gönderin: 'Mükemmel/İyi/Geliştirilmeli'"
    ] : [
      "Great question! 🌊 Rate the answer quality? Reply: ⭐⭐⭐⭐⭐ (1-5 stars)",
      "Excellent maritime question! ⚙️ How helpful was this answer? Send: 👍 or 👎",
      "Smart technical doubt! 💡 Rate this response: A/B/C (A=Perfect, B=Good, C=Poor)",
      "Brilliant inquiry! 🚢 Quick feedback - rate 1-5 or 'Good/Excellent/Poor'",
      "Impressive question! ⭐ Was this answer useful? Reply: 'Yes/Partial/No'",
      "Good technical thinking! 🔧 Rate the solution quality: 1-10",
      "Sharp maritime question! ⚓ Helpful answer? Send: 'Perfect/Good/Improve'"
    ];
    
    return compact[Math.floor(Math.random() * compact.length)];
  }
  
  /**
   * Store feedback in database for analytics
   */
  static async storeFeedback(userId: string, questionId: string, rating: string, comment?: string): Promise<void> {
    try {
      // Ensure feedback table exists
      await this.ensureFeedbackTable();
      
      await pool.query(`
        INSERT INTO answer_feedback (
          user_id, 
          question_id, 
          rating, 
          comment, 
          feedback_source,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (user_id, question_id) 
        DO UPDATE SET 
          rating = EXCLUDED.rating,
          comment = EXCLUDED.comment,
          updated_at = NOW()
      `, [userId, questionId, rating, comment, 'whatsapp']);
      
      console.log(`📝 Feedback stored: User ${userId}, Question ${questionId}, Rating: ${rating}`);
    } catch (error) {
      console.error('❌ Failed to store feedback:', error);
    }
  }
  
  /**
   * Parse user feedback from various formats
   */
  static parseFeedbackRating(userResponse: string): { rating: number | null, category: string } {
    const response = userResponse.toLowerCase().trim();
    const originalTrimmed = userResponse.trim();
    
    // Letter grades A/B/C/D (standalone letters only, exact match - check first before other text matches)
    if (originalTrimmed === 'A' || originalTrimmed === 'a') return { rating: 5, category: 'grade' };
    if (originalTrimmed === 'B' || originalTrimmed === 'b') return { rating: 4, category: 'grade' };
    if (originalTrimmed === 'C' || originalTrimmed === 'c') return { rating: 2, category: 'grade' };
    if (originalTrimmed === 'D' || originalTrimmed === 'd') return { rating: 1, category: 'grade' };
    
    // Star ratings ⭐⭐⭐⭐⭐
    const starMatch = response.match(/⭐/g);
    if (starMatch) {
      return { rating: starMatch.length, category: 'stars' };
    }
    
    // Numeric ratings 1-5, 1-10 (only when it looks like actual feedback)
    // Avoid matching technical questions with numbers, units, or complex sentences
    if (response.length < 20 && !response.includes('?') && !response.includes('how') && 
        !response.includes('what') && !response.includes('when') && !response.includes('where') &&
        !response.includes('why') && !response.includes('m') && !response.includes('meter') &&
        !response.includes('pressure') && !response.includes('height') && !response.includes('pipe') &&
        !response.includes('degree') && !response.includes('temperature') && !response.includes('rpm') &&
        !response.includes('bar') && !response.includes('psi') && !response.includes('kg') &&
        !response.includes('ton') && !response.includes('liter') && !response.includes('gallon')) {
      
      const numericMatch = response.match(/^(\d+)(?:\/(\d+))?$/);
      if (numericMatch) {
        const rating = parseInt(numericMatch[1]);
        const scale = numericMatch[2] ? parseInt(numericMatch[2]) : (rating <= 5 ? 5 : 10);
        
        // Only treat as rating if it's in sensible range
        if (rating >= 1 && rating <= scale && scale <= 10) {
          const normalizedRating = Math.round((rating / scale) * 5); // Normalize to 5-star scale
          return { rating: normalizedRating, category: 'numeric' };
        }
      }
    }
    
    // Text-based ratings (only for short, simple feedback responses)
    // Avoid matching questions or technical discussions
    if (response.length < 30 && !response.includes('?') && !response.includes('how') && 
        !response.includes('what') && !response.includes('when') && !response.includes('where') &&
        !response.includes('why') && !response.includes('explain') && !response.includes('tell me') &&
        !response.includes('pressure') && !response.includes('pump') && !response.includes('engine') &&
        !response.includes('system') && !response.includes('machine') && !response.includes('equipment')) {
      
      if (response.includes('excellent') || response.includes('perfect') || response.includes('outstanding')) {
        return { rating: 5, category: 'text' };
      }
      if (response.includes('good') || response.includes('helpful') || response.includes('satisfactory')) {
        return { rating: 4, category: 'text' };
      }
      if (response.includes('ok') || response.includes('average') || response.includes('partial')) {
        return { rating: 3, category: 'text' };
      }
      if (response.includes('poor') || response.includes('bad') || response.includes('not useful')) {
        return { rating: 2, category: 'text' };
      }
      if (response.includes('terrible') || response.includes('useless') || response.includes('wrong')) {
        return { rating: 1, category: 'text' };
      }
    }
    
    // Thumbs up/down (only for simple emoji feedback or standalone yes/no)
    if (response.includes('👍')) {
      return { rating: 5, category: 'thumbs' };
    }
    if (response.includes('👎')) {
      return { rating: 2, category: 'thumbs' };
    }
    
    // Standalone yes/no as feedback (not part of technical answers)
    if ((response === 'yes' || response === 'no') && response.length < 5) {
      return { rating: response === 'yes' ? 5 : 2, category: 'thumbs' };
    }
    
    return { rating: null, category: 'unknown' };
  }
  
  /**
   * Get feedback statistics for analytics
   */
  static async getFeedbackStats(userId?: string): Promise<any> {
    try {
      let query = `
        SELECT 
          AVG(CAST(rating AS FLOAT)) as average_rating,
          COUNT(*) as total_feedback,
          COUNT(CASE WHEN CAST(rating AS INT) >= 4 THEN 1 END) as positive_feedback,
          COUNT(CASE WHEN CAST(rating AS INT) <= 2 THEN 1 END) as negative_feedback,
          feedback_source,
          DATE_TRUNC('day', created_at) as feedback_date
        FROM answer_feedback
      `;
      
      const params: any[] = [];
      if (userId) {
        query += ' WHERE user_id = $1';
        params.push(userId);
      }
      
      query += ' GROUP BY feedback_source, DATE_TRUNC(\'day\', created_at) ORDER BY feedback_date DESC LIMIT 30';
      
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('❌ Failed to get feedback stats:', error);
      return [];
    }
  }
  
  private static getRandomTemplate(category: keyof typeof FEEDBACK_TEMPLATES): string {
    const templates = FEEDBACK_TEMPLATES[category];
    return templates[Math.floor(Math.random() * templates.length)];
  }
  
  private static async ensureFeedbackTable(): Promise<void> {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS answer_feedback (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR NOT NULL,
          question_id VARCHAR NOT NULL,
          rating VARCHAR NOT NULL,
          comment TEXT,
          feedback_source VARCHAR DEFAULT 'whatsapp',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, question_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_answer_feedback_user_id ON answer_feedback(user_id);
        CREATE INDEX IF NOT EXISTS idx_answer_feedback_rating ON answer_feedback(rating);
        CREATE INDEX IF NOT EXISTS idx_answer_feedback_created_at ON answer_feedback(created_at);
      `);
    } catch (error) {
      console.error('❌ Failed to create feedback table:', error);
    }
  }
}

export default FeedbackService;