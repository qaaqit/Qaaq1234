import { db } from './db';
import { sql } from 'drizzle-orm';

interface QuestionAnalysis {
  id: number;
  content: string;
  answer?: string;
  category: string;
  extractedTerm: string;
  confidence: number;
}

/**
 * Glossary Auto-Update Service
 * 
 * MANUAL UPDATES ONLY - Auto-updates disabled for security.
 * Use Admin panel button or /api/admin/glossary/update endpoint.
 * 
 * Processes new maritime terminology questions and adds them to the glossary.
 */
export class GlossaryAutoUpdateService {
  private isRunning = false;
  private lastCheckTimestamp: Date | null = null;
  
  constructor() {
    // Auto-scheduler disabled - manual updates only
    console.log('📚 Glossary Manual-Update Service initialized');
    console.log('🚫 Auto-updates DISABLED - Use Admin panel for manual updates');
  }

  /**
   * Initialize the scheduler for 6-hour intervals
   * DISABLED - Manual updates only
   */
  private initializeScheduler() {
    // Auto-scheduler disabled for security
    console.log('🚫 Glossary auto-scheduler DISABLED - Manual updates only');
  }

  /**
   * Schedule the next update based on current time
   * DISABLED - Manual updates only
   */
  private scheduleNextUpdate() {
    console.log('🚫 Auto-scheduling disabled - Use Admin panel for manual glossary updates');
  }

  /**
   * Main method to perform glossary update
   */
  public async performGlossaryUpdate(): Promise<void> {
    if (this.isRunning) {
      console.log('⏳ Glossary update already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();
    
    try {
      console.log('🔍 Starting glossary auto-update at', startTime.toISOString());
      
      // Step 1: Find new "What is..." questions
      const newQuestions = await this.findWhatIsQuestions();
      console.log(`📊 Found ${newQuestions.length} potential "What is..." questions`);
      
      if (newQuestions.length === 0) {
        console.log('✅ No new maritime terms to add to glossary');
        return;
      }

      // Step 2: Analyze and filter questions
      const validTerms = await this.analyzeQuestions(newQuestions);
      console.log(`✅ Validated ${validTerms.length} maritime terms for glossary`);

      // Step 3: Add to glossary if not already present
      const addedTerms = await this.addToGlossary(validTerms);
      console.log(`📚 Successfully added ${addedTerms} new terms to glossary`);

      // Step 4: Update statistics
      await this.updateGlossaryStats();
      
      this.lastCheckTimestamp = startTime;
      console.log('✅ Glossary auto-update completed successfully');
      
    } catch (error) {
      console.error('❌ Error during glossary auto-update:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Find questions that match "What is..." pattern
   */
  private async findWhatIsQuestions(): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          q.id,
          q.content,
          q.created_at,
          q.views,
          q.answer_count,
          a.content as answer,
          a.is_best_answer
        FROM questions q
        LEFT JOIN answers a ON q.id = a.question_id AND a.is_best_answer = true
        WHERE 
          (
            LOWER(q.content) LIKE '%what is%' OR
            LOWER(q.content) LIKE '%what are%' OR
            LOWER(q.content) LIKE '%define%' OR
            LOWER(q.content) LIKE '%meaning of%' OR
            LOWER(q.content) LIKE '%explain%'
          )
          AND q.created_at > COALESCE(
            (SELECT MAX(last_checked) FROM glossary_update_log), 
            NOW() - INTERVAL '24 hours'
          )
          AND q.is_hidden = false
        ORDER BY q.created_at DESC
        LIMIT 100
      `);

      return result.rows;
    } catch (error) {
      console.error('❌ Error fetching "What is..." questions:', error);
      return [];
    }
  }

  /**
   * Analyze questions to extract maritime terms
   */
  private async analyzeQuestions(questions: any[]): Promise<QuestionAnalysis[]> {
    const validTerms: QuestionAnalysis[] = [];

    for (const question of questions) {
      try {
        const analysis = this.extractMaritimeTerm(question.content, question.answer);
        
        if (analysis && analysis.confidence > 0.7) {
          validTerms.push({
            id: question.id,
            content: question.content,
            answer: question.answer,
            category: analysis.category,
            extractedTerm: analysis.term,
            confidence: analysis.confidence
          });
        }
      } catch (error) {
        console.error(`❌ Error analyzing question ${question.id}:`, error);
      }
    }

    return validTerms;
  }

  /**
   * Extract maritime term from question content
   */
  private extractMaritimeTerm(content: string, answer?: string): {
    term: string;
    category: string;
    confidence: number;
  } | null {
    const lowerContent = content.toLowerCase();
    
    // Maritime-specific keywords that increase confidence
    const maritimeKeywords = [
      'ship', 'vessel', 'marine', 'maritime', 'nautical', 'port', 'harbor',
      'anchor', 'engine', 'deck', 'cargo', 'navigation', 'captain', 'crew',
      'safety', 'certificate', 'inspection', 'offshore', 'onboard', 'sail',
      'propeller', 'rudder', 'bridge', 'cabin', 'hull', 'mast', 'rope',
      'buoy', 'lighthouse', 'dock', 'pier', 'shipping', 'freight', 'container'
    ];

    let confidence = 0.5;
    
    // Check for maritime keywords
    for (const keyword of maritimeKeywords) {
      if (lowerContent.includes(keyword)) {
        confidence += 0.1;
      }
    }

    // Extract term patterns
    let extractedTerm = '';
    
    // Pattern 1: "What is [term]?"
    const whatIsMatch = content.match(/what\s+is\s+([^?]+)/i);
    if (whatIsMatch) {
      extractedTerm = whatIsMatch[1].trim();
      confidence += 0.2;
    }

    // Pattern 2: "What are [terms]?"
    const whatAreMatch = content.match(/what\s+are\s+([^?]+)/i);
    if (whatAreMatch) {
      extractedTerm = whatAreMatch[1].trim();
      confidence += 0.2;
    }

    // Pattern 3: "Define [term]"
    const defineMatch = content.match(/define\s+([^?]+)/i);
    if (defineMatch) {
      extractedTerm = defineMatch[1].trim();
      confidence += 0.2;
    }

    // Pattern 4: "Meaning of [term]"
    const meaningMatch = content.match(/meaning\s+of\s+([^?]+)/i);
    if (meaningMatch) {
      extractedTerm = meaningMatch[1].trim();
      confidence += 0.2;
    }

    if (!extractedTerm || extractedTerm.length < 2) {
      return null;
    }

    // Clean up the extracted term
    extractedTerm = extractedTerm
      .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
      .trim()
      .toLowerCase();

    // Determine category based on content
    let category = 'General';
    if (lowerContent.includes('engine') || lowerContent.includes('machinery')) {
      category = 'Engineering';
    } else if (lowerContent.includes('navigation') || lowerContent.includes('chart')) {
      category = 'Navigation';
    } else if (lowerContent.includes('safety') || lowerContent.includes('emergency')) {
      category = 'Safety';
    } else if (lowerContent.includes('cargo') || lowerContent.includes('loading')) {
      category = 'Cargo Operations';
    } else if (lowerContent.includes('certificate') || lowerContent.includes('regulation')) {
      category = 'Regulations';
    }

    return {
      term: extractedTerm,
      category,
      confidence: Math.min(confidence, 1.0)
    };
  }

  /**
   * Add validated terms to glossary
   */
  private async addToGlossary(validTerms: QuestionAnalysis[]): Promise<number> {
    let addedCount = 0;

    for (const term of validTerms) {
      try {
        // Check if term already exists
        const existing = await db.execute(sql`
          SELECT id FROM questions 
          WHERE LOWER(content) LIKE ${`%${term.extractedTerm.toLowerCase()}%`}
          AND id IN (
            SELECT question_id FROM glossary_entries 
            WHERE is_active = true
          )
          LIMIT 1
        `);

        if (existing.rows.length > 0) {
          console.log(`⏭️  Term "${term.extractedTerm}" already in glossary, skipping`);
          continue;
        }

        // Add to glossary entries table
        await db.execute(sql`
          INSERT INTO glossary_entries (
            question_id,
            term,
            category,
            confidence_score,
            auto_generated,
            created_at,
            is_active
          ) VALUES (
            ${term.id},
            ${term.extractedTerm},
            ${term.category},
            ${term.confidence},
            true,
            NOW(),
            true
          )
          ON CONFLICT (question_id) DO NOTHING
        `);

        addedCount++;
        console.log(`✅ Added "${term.extractedTerm}" to glossary (confidence: ${term.confidence.toFixed(2)})`);
        
      } catch (error) {
        console.error(`❌ Error adding term "${term.extractedTerm}" to glossary:`, error);
      }
    }

    return addedCount;
  }

  /**
   * Update glossary statistics
   */
  private async updateGlossaryStats(): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO glossary_update_log (
          last_checked,
          terms_processed,
          terms_added,
          updated_at
        ) VALUES (
          NOW(),
          (SELECT COUNT(*) FROM glossary_entries WHERE auto_generated = true),
          (SELECT COUNT(*) FROM glossary_entries WHERE auto_generated = true AND created_at > NOW() - INTERVAL '6 hours'),
          NOW()
        )
      `);
    } catch (error) {
      console.error('❌ Error updating glossary stats:', error);
    }
  }

  /**
   * Manual trigger for testing/admin use
   */
  public async manualUpdate(): Promise<void> {
    console.log('🔧 Manual glossary update triggered');
    await this.performGlossaryUpdate();
  }

  /**
   * Get update status and statistics
   */
  public getStatus(): {
    isRunning: boolean;
    lastCheck: Date | null;
    nextScheduled: string[];
  } {
    return {
      isRunning: this.isRunning,
      lastCheck: this.lastCheckTimestamp,
      nextScheduled: ['3:00 AM', '9:00 AM', '3:00 PM', '9:00 PM']
    };
  }
}

// Initialize the service
export const glossaryAutoUpdater = new GlossaryAutoUpdateService();

// Export for manual control
export { GlossaryAutoUpdateService };