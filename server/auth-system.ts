import { pool } from './db';
import jwt from 'jsonwebtoken';
import { passwordManager } from './password-manager';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

export interface DuplicateUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  whatsAppNumber?: string;
  loginCount: number;
  lastLogin: Date;
  questionCount: number;
  answerCount: number;
  source: 'qaaq_main' | 'local_app' | 'whatsapp_bot';
  completeness: number; // 0-100 score based on profile fields
}

export interface MergeDecision {
  primaryAccountId: string;
  duplicateAccountIds: string[];
  mergeStrategy: 'keep_primary' | 'merge_data' | 'manual_review';
}

export interface AuthenticationResult {
  success: boolean;
  user?: any;
  token?: string;
  requiresMerge?: boolean;
  duplicateAccounts?: DuplicateUser[];
  mergeSessionId?: string;
  requiresPasswordSetup?: boolean;
  message?: string;
}

export class RobustAuthSystem {
  
  /**
   * Main authentication method with duplicate detection
   */
  async authenticateUser(identifier: string, password: string): Promise<AuthenticationResult> {
    console.log(`🔐 Starting robust authentication for: ${identifier}`);
    
    // Step 1: Find all potential matching accounts
    const potentialMatches = await this.findAllMatchingAccounts(identifier);
    console.log(`🔍 Found ${potentialMatches.length} potential matches`);
    
    if (potentialMatches.length === 0) {
      return { success: false };
    }
    
    if (potentialMatches.length === 1) {
      // Single account found, proceed with password management logic
      const user = potentialMatches[0];
      const passwordResult = await this.handlePasswordValidation(user, password);
      
      if (!passwordResult.success) {
        return { 
          success: false,
          message: passwordResult.message
        };
      }
      
      const token = this.generateToken(user.id);
      await this.updateLastLogin(user.id);
      
      return {
        success: true,
        user: this.sanitizeUserForResponse(user),
        token,
        requiresPasswordSetup: passwordResult.requiresPasswordSetup,
        message: passwordResult.message
      };
    }
    
    // Multiple accounts found - require merge decision
    console.log(`⚠️ Multiple accounts detected for ${identifier}`);
    const mergeSessionId = this.generateMergeSessionId();
    
    return {
      success: false,
      requiresMerge: true,
      duplicateAccounts: potentialMatches,
      mergeSessionId
    };
  }
  
  /**
   * Find all accounts that could match the identifier
   */
  private async findAllMatchingAccounts(identifier: string): Promise<DuplicateUser[]> {
    const cleanId = identifier.trim();
    const phoneVariations = this.generatePhoneVariations(cleanId);
    const emailNormalized = cleanId.toLowerCase();
    
    // Search across multiple fields with variations
    const searchQueries = [
      `SELECT * FROM users WHERE id = $1`,
      `SELECT * FROM users WHERE email ILIKE $1`,
      `SELECT * FROM users WHERE whatsapp_number = ANY($1::text[])`,
      `SELECT * FROM users WHERE id = ANY($1::text[])`,
      `SELECT * FROM users WHERE full_name ILIKE '%' || $1 || '%' AND (email ILIKE '%' || $1 || '%' OR whatsapp_number = $1)`
    ];
    
    const allResults = [];
    
    // Execute all search queries
    for (const query of searchQueries) {
      try {
        let result;
        if (query.includes('ANY')) {
          result = await pool.query(query, [phoneVariations]);
        } else {
          result = await pool.query(query, [cleanId]);
        }
        allResults.push(...result.rows);
      } catch (error) {
        console.error(`Query failed: ${error}`);
      }
    }
    
    // Remove duplicates and score accounts
    const uniqueAccounts = this.deduplicateAndScore(allResults);
    return uniqueAccounts;
  }
  
  /**
   * Generate phone number variations for comprehensive matching
   */
  private generatePhoneVariations(phone: string): string[] {
    const variations = new Set<string>();
    
    // Original
    variations.add(phone);
    
    // Remove/add country code
    if (phone.startsWith('+91')) {
      variations.add(phone.substring(3)); // Remove +91
      variations.add('91' + phone.substring(3)); // Replace + with nothing
    } else if (phone.startsWith('91') && phone.length === 12) {
      variations.add('+' + phone); // Add +
      variations.add('+91' + phone.substring(2)); // Add +91
    } else if (phone.length === 10) {
      variations.add('+91' + phone); // Add +91
      variations.add('91' + phone); // Add 91
    }
    
    // Remove any non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length >= 10) {
      variations.add(digitsOnly);
      variations.add('+91' + digitsOnly.slice(-10));
    }
    
    return Array.from(variations);
  }
  
  /**
   * Remove duplicates and calculate completeness scores
   */
  private deduplicateAndScore(accounts: any[]): DuplicateUser[] {
    const uniqueMap = new Map<string, DuplicateUser>();
    
    for (const account of accounts) {
      if (!uniqueMap.has(account.id)) {
        const completeness = this.calculateCompletenessScore(account);
        const source = this.determineAccountSource(account);
        
        uniqueMap.set(account.id, {
          id: account.id,
          fullName: account.full_name || account.fullName || '',
          email: account.email || '',
          phone: account.id,
          whatsAppNumber: account.whatsapp_number,
          loginCount: account.login_count || 0,
          lastLogin: account.last_login || new Date(),
          questionCount: account.question_count || 0,
          answerCount: account.answer_count || 0,
          source,
          completeness
        });
      }
    }
    
    return Array.from(uniqueMap.values())
      .sort((a, b) => b.completeness - a.completeness); // Sort by completeness score
  }
  
  /**
   * Calculate account completeness score (0-100)
   */
  private calculateCompletenessScore(account: any): number {
    let score = 0;
    const fields = [
      'full_name', 'email', 'maritime_rank', 'current_ship_name', 
      'current_city', 'question_count', 'answer_count', 'whatsapp_number',
      'current_latitude', 'current_longitude', 'last_login'
    ];
    
    for (const field of fields) {
      if (account[field] !== null && account[field] !== undefined && account[field] !== '') {
        score += 1;
      }
    }
    
    // Bonus points for activity
    if ((account.question_count || 0) > 0) score += 2;
    if ((account.answer_count || 0) > 0) score += 2;
    if ((account.login_count || 0) > 1) score += 1;
    
    return Math.min(100, Math.round((score / fields.length) * 100));
  }
  
  /**
   * Determine account source system
   */
  private determineAccountSource(account: any): 'qaaq_main' | 'local_app' | 'whatsapp_bot' {
    if (account.question_count > 0 || account.answer_count > 0) {
      return 'qaaq_main';
    }
    if (account.whatsapp_number && account.whatsapp_profile_picture_url) {
      return 'whatsapp_bot';
    }
    return 'local_app';
  }
  
  /**
   * Merge duplicate accounts based on user decision
   */
  async mergeAccounts(mergeDecision: MergeDecision): Promise<AuthenticationResult> {
    const { primaryAccountId, duplicateAccountIds, mergeStrategy } = mergeDecision;
    
    console.log(`🔀 Starting account merge: primary=${primaryAccountId}, duplicates=${duplicateAccountIds.join(',')}`);
    
    try {
      await pool.query('BEGIN');
      
      // Get primary account
      const primaryResult = await pool.query('SELECT * FROM users WHERE id = $1', [primaryAccountId]);
      if (primaryResult.rows.length === 0) {
        throw new Error('Primary account not found');
      }
      
      const primaryAccount = primaryResult.rows[0];
      
      for (const duplicateId of duplicateAccountIds) {
        // Get duplicate account data
        const duplicateResult = await pool.query('SELECT * FROM users WHERE id = $1', [duplicateId]);
        if (duplicateResult.rows.length === 0) continue;
        
        const duplicateAccount = duplicateResult.rows[0];
        
        if (mergeStrategy === 'merge_data') {
          // Merge data from duplicate into primary
          await this.mergeAccountData(primaryAccountId, duplicateAccount);
        }
        
        // Update chat connections and messages
        await pool.query(`
          UPDATE chat_connections 
          SET sender_id = $1 
          WHERE sender_id = $2
        `, [primaryAccountId, duplicateId]);
        
        await pool.query(`
          UPDATE chat_connections 
          SET receiver_id = $1 
          WHERE receiver_id = $2
        `, [primaryAccountId, duplicateId]);
        
        await pool.query(`
          UPDATE chat_messages 
          SET sender_id = $1 
          WHERE sender_id = $2
        `, [primaryAccountId, duplicateId]);
        
        // Archive duplicate account (don't delete to maintain audit trail)
        await pool.query(`
          UPDATE users 
          SET email = email || '_archived_' || $2,
              is_blocked = true,
              last_updated = NOW()
          WHERE id = $1
        `, [duplicateId, Date.now()]);
      }
      
      await pool.query('COMMIT');
      
      // Generate token for merged account
      const token = this.generateToken(primaryAccountId);
      await this.updateLastLogin(primaryAccountId);
      
      return {
        success: true,
        user: this.sanitizeUserForResponse(primaryAccount),
        token
      };
      
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error('Account merge failed:', error);
      throw error;
    }
  }
  
  /**
   * Merge data from duplicate account into primary account
   */
  private async mergeAccountData(primaryAccountId: string, duplicateAccount: any): Promise<void> {
    // Fields to potentially merge (prefer non-null values)
    const mergeableFields = [
      'maritime_rank', 'current_ship_name', 'current_ship_imo', 'current_city',
      'current_country', 'current_latitude', 'current_longitude', 'whatsapp_number',
      'whatsapp_profile_picture_url', 'whatsapp_display_name'
    ];
    
    const updateFields = [];
    const updateValues = [primaryAccountId];
    let paramIndex = 2;
    
    for (const field of mergeableFields) {
      if (duplicateAccount[field] !== null && duplicateAccount[field] !== undefined) {
        updateFields.push(`${field} = COALESCE(${field}, $${paramIndex})`);
        updateValues.push(duplicateAccount[field]);
        paramIndex++;
      }
    }
    
    // Merge activity counts
    updateFields.push(`question_count = question_count + $${paramIndex}`);
    updateValues.push(duplicateAccount.question_count || 0);
    paramIndex++;
    
    updateFields.push(`answer_count = answer_count + $${paramIndex}`);
    updateValues.push(duplicateAccount.answer_count || 0);
    paramIndex++;
    
    updateFields.push(`login_count = login_count + $${paramIndex}`);
    updateValues.push(duplicateAccount.login_count || 0);
    
    if (updateFields.length > 0) {
      const query = `
        UPDATE users 
        SET ${updateFields.join(', ')}, last_updated = NOW()
        WHERE id = $1
      `;
      
      await pool.query(query, updateValues);
    }
  }
  
  /**
   * Validate password (liberal authentication)
   */
  private validatePassword(password: string, user: any): boolean {
    // Liberal authentication policy
    const standardPassword = "1234koihai";
    
    // Accept standard password for all users
    if (password === standardPassword) {
      return true;
    }
    
    // Accept user's specific password if set
    if (user.password && password === user.password) {
      return true;
    }
    
    // Special case for known credentials
    if (user.id === "+919439115367" && password === "Orissa") {
      return true;
    }
    
    return false;
  }
  
  /**
   * Generate JWT token
   */
  private generateToken(userId: string): string {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
  }
  
  /**
   * Generate merge session ID for tracking merge process
   */
  private generateMergeSessionId(): string {
    return `merge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle password validation with liberal login logic using password manager
   */
  private async handlePasswordValidation(user: any, inputPassword: string): Promise<{
    success: boolean;
    message?: string;
    requiresPasswordSetup?: boolean;
  }> {
    // Use the password manager for validation
    const result = passwordManager.validatePassword(user.id, inputPassword);
    
    return {
      success: result.isValid,
      message: result.message,
      requiresPasswordSetup: result.requiresPasswordSetup
    };
  }

  /**
   * Increment liberal login counter
   */
  private async incrementLiberalLoginCount(userId: string): Promise<void> {
    try {
      await pool.query(`
        UPDATE users 
        SET "liberal_login_count" = COALESCE("liberal_login_count", 0) + 1
        WHERE id = $1
      `, [userId]);
    } catch (error) {
      // Try alternative column names if schema differs
      try {
        await pool.query(`
          UPDATE users 
          SET liberal_login_count = COALESCE(liberal_login_count, 0) + 1
          WHERE id = $1
        `, [userId]);
      } catch (fallbackError) {
        console.log('Could not update liberal login count:', fallbackError);
      }
    }
  }

  /**
   * Set custom password for user after first liberal login
   */
  async setCustomPassword(userId: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    // Use password manager for setting custom password
    return passwordManager.setCustomPassword(userId, newPassword);
  }
  
  /**
   * Update last login timestamp (compatible with QAAQ database schema)
   */
  private async updateLastLogin(userId: string): Promise<void> {
    try {
      // Try local schema with lastLogin column
      await pool.query(`
        UPDATE users 
        SET "lastLogin" = NOW(), "loginCount" = COALESCE("loginCount", 0) + 1 
        WHERE id = $1
      `, [userId]);
    } catch (error) {
      // Try alternative schema column names
      try {
        await pool.query(`
          UPDATE users 
          SET last_login_at = NOW(), login_count = COALESCE(login_count, 0) + 1 
          WHERE id = $1
        `, [userId]);
      } catch (fallbackError) {
        console.log('Skipping login timestamp update - column compatibility issue');
        // Don't fail authentication if we can't update login timestamp
      }
    }
  }
  
  /**
   * Sanitize user object for API response
   */
  private sanitizeUserForResponse(user: any): any {
    return {
      id: user.id,
      fullName: user.full_name || user.fullName,
      email: user.email,
      userType: user.current_ship_name ? 'sailor' : 'local',
      isAdmin: user.is_platform_admin || (user.email === "mushy.piyush@gmail.com"),
      rank: user.maritime_rank || user.rank,
      shipName: user.current_ship_name || user.ship_name,
      city: user.current_city || user.city,
      country: user.current_country || user.country,
      questionCount: user.question_count || 0,
      answerCount: user.answer_count || 0,
      whatsAppNumber: user.whatsapp_number,
      whatsAppProfilePictureUrl: user.whatsapp_profile_picture_url,
      whatsAppDisplayName: user.whatsapp_display_name
    };
  }
}

export const robustAuth = new RobustAuthSystem();