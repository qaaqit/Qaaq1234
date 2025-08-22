import { pool } from './db';

interface NameQualityReport {
  totalUsers: number;
  problemUsers: number;
  emailNames: number;
  phoneNames: number;
  temporaryNames: number;
  shortNames: number;
  improvementOpportunities: number;
}

/**
 * Service for analyzing and improving user name quality
 * Extracts better names from WhatsApp display names and message context
 */
export class NameEnhancementService {
  
  /**
   * Analyze current name quality in database
   */
  async analyzeNameQuality(): Promise<NameQualityReport> {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN full_name LIKE '%@%' THEN 1 END) as email_names,
          COUNT(CASE WHEN full_name ~ '^[+]?[0-9]+' THEN 1 END) as phone_names,
          COUNT(CASE WHEN full_name LIKE '%whatsapp.temp' THEN 1 END) as temporary_names,
          COUNT(CASE WHEN LENGTH(full_name) < 3 THEN 1 END) as short_names,
          COUNT(CASE 
            WHEN full_name LIKE '%@%' 
            OR full_name ~ '^[+]?[0-9]+' 
            OR full_name LIKE '%whatsapp.temp' 
            OR LENGTH(full_name) < 3 
            OR whatsapp_display_name IS NOT NULL AND whatsapp_display_name != full_name
            THEN 1 
          END) as problem_users
        FROM users 
        WHERE whatsapp_number IS NOT NULL OR id ~ '^[+]?[0-9]+'
      `);

      const row = result.rows[0];
      return {
        totalUsers: parseInt(row.total_users),
        problemUsers: parseInt(row.problem_users),
        emailNames: parseInt(row.email_names),
        phoneNames: parseInt(row.phone_names),
        temporaryNames: parseInt(row.temporary_names),
        shortNames: parseInt(row.short_names),
        improvementOpportunities: parseInt(row.problem_users)
      };
    } catch (error) {
      console.error('Error analyzing name quality:', error);
      return {
        totalUsers: 0,
        problemUsers: 0,
        emailNames: 0,
        phoneNames: 0,
        temporaryNames: 0,
        shortNames: 0,
        improvementOpportunities: 0
      };
    }
  }

  /**
   * Extract maritime professional information from message content
   */
  extractProfessionalContext(message: string): { rank?: string; shipName?: string; company?: string } {
    const context: { rank?: string; shipName?: string; company?: string } = {};
    
    // Maritime rank extraction
    const rankPatterns = [
      /(?:i['\s]?m|i\s+am)\s+(?:a\s+)?(?:chief\s+engineer|ch\.?\s*eng|c\/e)/gi,
      /(?:i['\s]?m|i\s+am)\s+(?:a\s+)?(?:second\s+engineer|2nd\s+eng|2\/e)/gi,
      /(?:i['\s]?m|i\s+am)\s+(?:a\s+)?(?:third\s+engineer|3rd\s+eng|3\/e)/gi,
      /(?:i['\s]?m|i\s+am)\s+(?:a\s+)?(?:captain|master|capt)/gi,
      /(?:i['\s]?m|i\s+am)\s+(?:a\s+)?(?:chief\s+officer|ch\.?\s*off|c\/o)/gi,
      /(?:i['\s]?m|i\s+am)\s+(?:a\s+)?(?:second\s+officer|2nd\s+off|2\/o)/gi,
      /(?:i['\s]?m|i\s+am)\s+(?:a\s+)?(?:third\s+officer|3rd\s+off|3\/o)/gi,
    ];

    for (const pattern of rankPatterns) {
      const match = message.match(pattern);
      if (match) {
        context.rank = this.standardizeRank(match[0]);
        break;
      }
    }

    // Ship name extraction
    const shipPatterns = [
      /(?:on\s+board|aboard|on\s+ship|vessel)\s+(?:mv|ms|mt|ss)?\s*([a-z0-9\s\-]+)/gi,
      /(?:working\s+on|sailing\s+on|current\s+ship)\s+(?:mv|ms|mt|ss)?\s*([a-z0-9\s\-]+)/gi,
    ];

    for (const pattern of shipPatterns) {
      const match = message.match(pattern);
      if (match && match[1] && match[1].trim().length > 2) {
        context.shipName = match[1].trim().replace(/\s+/g, ' ');
        break;
      }
    }

    // Company extraction
    const companyPatterns = [
      /(?:work\s+for|employed\s+by|company\s+is)\s+([a-z\s&\-\.]+(?:shipping|marine|maritime|lines|group))/gi,
    ];

    for (const pattern of companyPatterns) {
      const match = message.match(pattern);
      if (match && match[1] && match[1].trim().length > 3) {
        context.company = match[1].trim();
        break;
      }
    }

    return context;
  }

  /**
   * Standardize maritime rank names
   */
  private standardizeRank(rankText: string): string {
    const lower = rankText.toLowerCase();
    
    if (lower.includes('chief') && lower.includes('engineer')) return 'Chief Engineer';
    if (lower.includes('second') && lower.includes('engineer')) return 'Second Engineer';
    if (lower.includes('third') && lower.includes('engineer')) return 'Third Engineer';
    if (lower.includes('captain') || lower.includes('master')) return 'Captain';
    if (lower.includes('chief') && lower.includes('officer')) return 'Chief Officer';
    if (lower.includes('second') && lower.includes('officer')) return 'Second Officer';
    if (lower.includes('third') && lower.includes('officer')) return 'Third Officer';
    
    return rankText;
  }

  /**
   * Improve WhatsApp display names by cleaning and standardizing
   */
  async improveDisplayNames(): Promise<{ improved: number; failed: number }> {
    let improved = 0;
    let failed = 0;

    try {
      // Get users with WhatsApp display names that could improve their full names
      const result = await pool.query(`
        SELECT id, full_name, whatsapp_display_name, whatsapp_number
        FROM users 
        WHERE whatsapp_display_name IS NOT NULL 
        AND whatsapp_display_name != full_name
        AND (
          full_name LIKE '%@%' 
          OR full_name ~ '^[+]?[0-9]+' 
          OR full_name LIKE '%whatsapp.temp'
          OR LENGTH(full_name) < 3
          OR whatsapp_display_name !~ '^[+]?[0-9]+$'
        )
        LIMIT 100
      `);

      for (const user of result.rows) {
        try {
          const improvedName = this.standardizeDisplayName(user.whatsapp_display_name);
          
          if (improvedName && improvedName !== user.full_name && improvedName.length >= 3) {
            await pool.query(`
              UPDATE users 
              SET full_name = $1, updated_at = NOW()
              WHERE id = $2
            `, [improvedName, user.id]);
            
            console.log(`✅ Improved name: ${user.whatsapp_number} → ${improvedName}`);
            improved++;
          }
        } catch (error) {
          console.error(`❌ Failed to improve name for ${user.whatsapp_number}:`, error);
          failed++;
        }
      }
    } catch (error) {
      console.error('Error improving display names:', error);
    }

    return { improved, failed };
  }

  /**
   * Clean and standardize WhatsApp display names
   */
  private standardizeDisplayName(displayName: string): string | null {
    if (!displayName || displayName.length < 2) return null;
    
    // Skip if it's clearly a phone number
    if (/^\+?[0-9\s\-\(\)]+$/.test(displayName)) return null;
    
    // Skip if it's an email
    if (displayName.includes('@')) return null;
    
    // Remove common WhatsApp emojis and symbols
    let cleaned = displayName
      .replace(/[⚓🚢⛵🌊👨‍💼🔧⚙️🛠️💼🏭🚁]/g, '')
      .replace(/[^\w\s\-\.]/g, ' ') // Remove special chars except basic punctuation
      .replace(/\s+/g, ' ')
      .trim();
    
    // Skip if result is too short
    if (cleaned.length < 3) return null;
    
    // Proper case conversion
    cleaned = cleaned.split(' ')
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    // Skip common non-name patterns
    if (/^(user|admin|test|temp|maritime|ship|vessel|captain|engineer)$/i.test(cleaned)) {
      return null;
    }
    
    return cleaned;
  }

  /**
   * Update user profile with extracted professional context
   */
  async updateUserWithContext(userId: string, context: { rank?: string; shipName?: string; company?: string }): Promise<void> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (context.rank) {
        updates.push(`maritime_rank = $${paramIndex++}`);
        values.push(context.rank);
      }

      if (context.shipName) {
        updates.push(`current_ship_name = $${paramIndex++}`, `ship_name = $${paramIndex++}`);
        values.push(context.shipName, context.shipName);
      }

      if (context.company) {
        updates.push(`last_company = $${paramIndex++}`);
        values.push(context.company);
      }

      if (updates.length > 0) {
        values.push(userId);
        await pool.query(`
          UPDATE users 
          SET ${updates.join(', ')}, updated_at = NOW()
          WHERE id = $${paramIndex}
        `, values);

        console.log(`✅ Updated user context: ${userId}`, context);
      }
    } catch (error) {
      console.error('Error updating user context:', error);
    }
  }
}