import { users, userIdentities, posts, likes, verificationCodes, chatConnections, chatMessages, whatsappMessages, userAnswers, answerLikes, workshopServiceTasks, workshopPricing, workshopBookings, workshopProfiles, type User, type InsertUser, type UserIdentity, type InsertUserIdentity, type Post, type InsertPost, type VerificationCode, type Like, type ChatConnection, type ChatMessage, type InsertChatConnection, type InsertChatMessage, type WhatsappMessage, type InsertWhatsappMessage, type UserAnswer, type InsertUserAnswer, type AnswerLike, type InsertAnswerLike, type WorkshopServiceTask, type InsertWorkshopServiceTask, type WorkshopPricing, type InsertWorkshopPricing, type WorkshopBooking, type InsertWorkshopBooking } from "@shared/schema";
import { db, pool } from "./db";
import { eq, desc, and, ilike, or, sql, isNotNull, not } from "drizzle-orm";

/**
 * COLUMN GUARD UTILITY
 * Prevents database column errors by only inserting into columns that actually exist.
 * Addresses the "100+ QAAQ columns vs minimal parent DB" mismatch.
 */
class ColumnGuard {
  private static columnCache: Map<string, Set<string>> = new Map();

  /**
   * Get existing columns for a table from database schema
   */
  static async getExistingColumns(tableName: string): Promise<Set<string>> {
    if (this.columnCache.has(tableName)) {
      return this.columnCache.get(tableName)!;
    }

    try {
      const result = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 
        AND table_schema = 'public'
      `, [tableName]);

      const columns = new Set(result.rows.map(row => row.column_name));
      this.columnCache.set(tableName, columns);
      
      console.log(`📋 COLUMN GUARD: Cached ${columns.size} columns for table '${tableName}'`);
      return columns;
    } catch (error) {
      console.error(`🚨 COLUMN GUARD: Failed to get columns for ${tableName}:`, error);
      return new Set();
    }
  }

  /**
   * Convert camelCase keys to snake_case for database compatibility
   */
  static camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Filter object to only include keys whose corresponding database columns exist
   */
  static async pickExistingColumns(data: Record<string, any>, tableName: string): Promise<Record<string, any>> {
    const existingColumns = await this.getExistingColumns(tableName);
    const filtered: Record<string, any> = {};
    const skipped: string[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null) continue;

      // Try exact match first, then snake_case version
      const snakeKey = this.camelToSnake(key);
      
      if (existingColumns.has(key)) {
        filtered[key] = value;
      } else if (existingColumns.has(snakeKey)) {
        filtered[snakeKey] = value;
      } else {
        skipped.push(key);
      }
    }

    if (skipped.length > 0) {
      console.log(`🛡️ COLUMN GUARD: Skipped ${skipped.length} non-existent columns: ${skipped.slice(0, 5).join(', ')}${skipped.length > 5 ? '...' : ''}`);
    }

    console.log(`✅ COLUMN GUARD: Filtered to ${Object.keys(filtered).length} valid columns for ${tableName}`);
    return filtered;
  }

  /**
   * Build SQL INSERT statement with only existing columns
   */
  static async buildSafeInsert(data: Record<string, any>, tableName: string): Promise<{ sql: string; values: any[] }> {
    const safeData = await this.pickExistingColumns(data, tableName);
    const columns = Object.keys(safeData);
    const values = Object.values(safeData);

    // Add default columns if they exist and aren't already set
    const existingColumns = await this.getExistingColumns(tableName);
    const defaultColumns: string[] = [];
    const defaultValues: string[] = [];
    
    if (existingColumns.has('id') && !safeData.id) {
      defaultColumns.push('id');
      defaultValues.push('gen_random_uuid()');
    }
    if (existingColumns.has('created_at') && !safeData.created_at) {
      defaultColumns.push('created_at');
      defaultValues.push('now()');
    }
    if (existingColumns.has('updated_at') && !safeData.updated_at) {
      defaultColumns.push('updated_at');
      defaultValues.push('now()');
    }

    const allColumns = [...columns, ...defaultColumns];
    const allPlaceholders = [
      ...columns.map((_, i) => `$${i + 1}`),
      ...defaultValues
    ];

    const sql = `
      INSERT INTO ${tableName} (${allColumns.join(', ')}) 
      VALUES (${allPlaceholders.join(', ')}) 
      RETURNING *
    `;

    return { sql, values };
  }
}

export interface IStorage {
  // Unified Identity Management
  findUserByAnyIdentity(identifier: string): Promise<User | undefined>;
  getUserByProviderId(provider: string, providerId: string): Promise<User | undefined>;
  createUserWithIdentity(userData: Partial<InsertUser>, identity: Omit<InsertUserIdentity, 'userId'>): Promise<User>;
  linkIdentityToUser(userId: string, identity: Omit<InsertUserIdentity, 'userId'>): Promise<UserIdentity>;
  unlinkIdentity(userId: string, provider: string): Promise<void>;
  getUserIdentities(userId: string): Promise<UserIdentity[]>;
  setPrimaryIdentity(userId: string, identityId: string): Promise<void>;
  
  // Enhanced User Management
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>; // Missing method - added
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByLinkedInId(linkedInId: string): Promise<User | undefined>;
  getUserByWhatsApp(phoneNumber: string): Promise<User | undefined>;
  getUserByReplitId(replitId: string): Promise<User | undefined>;
  getUserByIdAndPassword(userId: string, password: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createGoogleUser(googleUserData: any): Promise<User>;
  createLinkedInUser(linkedInUserData: any): Promise<User>;
  createReplitUser(replitData: any): Promise<User>; // Missing method - added
  createWhatsAppUser(phoneNumber: string, displayName?: string): Promise<User>;
  updateUser(userId: string, updates: Partial<User>): Promise<User | undefined>;
  updateUserVerification(userId: string, isVerified: boolean): Promise<void>;
  incrementLoginCount(userId: string): Promise<void>;
  incrementUserQuestionCount(userId: string): Promise<void>;
  getUsersWithLocation(): Promise<User[]>;
  updateUserLocation(userId: string, latitude: number, longitude: number, source: 'device' | 'ship' | 'city'): Promise<void>;
  updateUserProfile(userId: string, profileData: Partial<User>): Promise<User | undefined>;
  updateUserShipName(userId: string, shipName: string): Promise<void>;
  updateUserPassword(userId: string, password: string): Promise<void>;
  checkPasswordRenewalRequired(userId: string): Promise<boolean>;
  generateUserId(fullName: string, rank: string): Promise<string>;
  upsertUser(userData: any): Promise<User>;
  
  // Missing methods causing LSP errors
  createMessage(data: any): Promise<any>;
  createPost(data: any): Promise<any>;
  getPosts(filters?: any): Promise<any[]>;
  searchPosts(query: string): Promise<any[]>;
  getUserLike(userId: string, postId: string): Promise<any>;
  likePost(userId: string, postId: string): Promise<any>;
  unlikePost(userId: string, postId: string): Promise<any>;
  
  // User answers
  createUserAnswer(answer: InsertUserAnswer): Promise<UserAnswer>;
  getUserAnswersForQuestion(questionId: number): Promise<UserAnswer[]>;
  deleteUserAnswer(answerId: string, userId: string): Promise<void>;
  updateAnswerLikesCount(answerId: string): Promise<void>;
  
  // Answer likes
  likeAnswer(userId: string, answerId: string): Promise<void>;
  unlikeAnswer(userId: string, answerId: string): Promise<void>;
  getUserAnswerLike(userId: string, answerId: string): Promise<AnswerLike | undefined>;
  
  // Verification codes
  createVerificationCode(userId: string, code: string, expiresAt: Date): Promise<VerificationCode>;
  getVerificationCode(userId: string, code: string): Promise<VerificationCode | undefined>;
  markCodeAsUsed(codeId: string): Promise<void>;
  
  // Workshop Service Tasks Management
  createServiceTask(task: InsertWorkshopServiceTask): Promise<WorkshopServiceTask>;
  getServiceTask(taskId: string): Promise<WorkshopServiceTask | undefined>;
  getServiceTaskByCode(taskCode: string): Promise<WorkshopServiceTask | undefined>;
  getServiceTasksBySystem(systemCode: string): Promise<WorkshopServiceTask[]>;
  getServiceTasksByEquipment(equipmentCode: string): Promise<WorkshopServiceTask[]>;
  getAllServiceTasks(filters?: { isActive?: boolean; systemCode?: string; equipmentCode?: string }): Promise<WorkshopServiceTask[]>;
  updateServiceTask(taskId: string, updates: Partial<WorkshopServiceTask>): Promise<WorkshopServiceTask | undefined>;
  deleteServiceTask(taskId: string): Promise<void>;
  
  // Workshop Pricing Management
  createWorkshopPricing(pricing: InsertWorkshopPricing): Promise<WorkshopPricing>;
  getWorkshopPricing(pricingId: string): Promise<WorkshopPricing | undefined>;
  getWorkshopPricingByWorkshop(workshopId: string): Promise<WorkshopPricing[]>;
  getWorkshopPricingByExpertise(workshopId: string, expertiseCategory: string): Promise<WorkshopPricing | undefined>;
  updateWorkshopPricing(pricingId: string, updates: Partial<WorkshopPricing>): Promise<WorkshopPricing | undefined>;
  deleteWorkshopPricing(pricingId: string): Promise<void>;
  upsertWorkshopPricing(workshopId: string, expertiseCategory: string, pricing: Partial<InsertWorkshopPricing>): Promise<WorkshopPricing>;
  
  // Workshop Booking Management
  createWorkshopBooking(booking: InsertWorkshopBooking): Promise<WorkshopBooking>;
  getWorkshopBooking(bookingId: string): Promise<WorkshopBooking | undefined>;
  getWorkshopBookingByNumber(bookingNumber: string): Promise<WorkshopBooking | undefined>;
  getBookingsByShipManager(shipManagerId: string, filters?: { status?: string }): Promise<WorkshopBooking[]>;
  getBookingsByWorkshop(workshopId: string, filters?: { status?: string }): Promise<WorkshopBooking[]>;
  getAllWorkshopBookings(filters?: { status?: string; port?: string; priority?: string }): Promise<WorkshopBooking[]>;
  updateWorkshopBooking(bookingId: string, updates: Partial<WorkshopBooking>): Promise<WorkshopBooking | undefined>;
  generateBookingNumber(): Promise<string>;
  cancelWorkshopBooking(bookingId: string, userId: string): Promise<WorkshopBooking | undefined>;
  completeWorkshopBooking(bookingId: string, actualHours: number, finalAmount?: number): Promise<WorkshopBooking | undefined>;

  // CSV Import functionality
  importWorkshopsFromCSV(workshopData: any[]): Promise<{ success: number; failed: number; errors: Array<{ email: string; error: string }> }>;
  checkWorkshopEmailExists(email: string): Promise<boolean>;
  createWorkshopFromCSV(workshopData: any): Promise<any>;

}

export class DatabaseStorage implements IStorage {
  
  // Unified Identity Resolution - Core Method
  async findUserByAnyIdentity(identifier: string): Promise<User | undefined> {
    try {
      console.log(`🔍 Finding user by any identity: ${identifier}`);
      
      // Strategy 1: Try direct user ID lookup
      let user = await this.getUser(identifier);
      if (user) {
        console.log(`✅ Found user by direct ID: ${user.fullName}`);
        return user;
      }
      
      // Strategy 2: Check user_identities table for any provider
      const identityResult = await pool.query(`
        SELECT u.*, ui.provider, ui.provider_id, ui.is_primary 
        FROM users u 
        JOIN user_identities ui ON u.id = ui.user_id 
        WHERE ui.provider_id = $1
        LIMIT 1
      `, [identifier]);
      
      if (identityResult.rows.length > 0) {
        user = this.convertDbUserToAppUser(identityResult.rows[0]);
        console.log(`✅ Found user via identity table: ${user.fullName} (provider: ${identityResult.rows[0].provider})`);
        return user;
      }
      
      // Strategy 3: Check by email
      if (identifier.includes('@')) {
        user = await this.getUserByEmail(identifier);
        if (user) {
          console.log(`✅ Found user by email: ${user.fullName}`);
          return user;
        }
      }
      
      // Strategy 4: Check WhatsApp number (with/without country code)
      if (/^\+?[0-9]{10,15}$/.test(identifier)) {
        user = await this.getUserByWhatsApp(identifier);
        if (user) {
          console.log(`✅ Found user by WhatsApp: ${user.fullName}`);
          return user;
        }
      }
      
      console.log(`❌ No user found for identifier: ${identifier}`);
      return undefined;
    } catch (error) {
      console.error('Error finding user by identity:', error);
      return undefined;
    }
  }
  
  async getUserByProviderId(provider: string, providerId: string): Promise<User | undefined> {
    try {
      const result = await pool.query(`
        SELECT u.* FROM users u 
        JOIN user_identities ui ON u.id = ui.user_id 
        WHERE ui.provider = $1 AND ui.provider_id = $2
        LIMIT 1
      `, [provider, providerId]);
      
      if (result.rows.length === 0) return undefined;
      return this.convertDbUserToAppUser(result.rows[0]);
    } catch (error) {
      console.error('Error getting user by provider ID:', error);
      return undefined;
    }
  }
  
  async createUserWithIdentity(userData: Partial<InsertUser>, identity: Omit<InsertUserIdentity, 'userId'>): Promise<User> {
    try {
      console.log(`🆕 Creating user with identity: ${identity.provider}:${identity.providerId}`);
      
      // Generate minimal user data that's guaranteed to work
      const minimalUserData = {
        full_name: userData.fullName || 'Maritime User',
        email: userData.email || null,
        user_type: userData.userType || 'sailor',
        primary_auth_provider: identity.provider,
        auth_providers: JSON.stringify([identity.provider]),
        is_verified: identity.isVerified || false,
        // Add safe fields that commonly exist
        ...(userData.whatsAppNumber && { whatsapp_number: userData.whatsAppNumber }),
        ...(userData.whatsAppDisplayName && { whatsapp_display_name: userData.whatsAppDisplayName }),
        ...(userData.rank && { rank: userData.rank }),
        ...(userData.city && { city: userData.city }),
        ...(userData.country && { country: userData.country })
      };
      
      // Use ColumnGuard to ensure we only insert into existing columns
      const { sql: insertSql, values } = await ColumnGuard.buildSafeInsert(minimalUserData, 'users');
      
      console.log(`🛡️ COLUMN GUARD: Using safe insert with ${values.length} columns`);
      const userResult = await pool.query(insertSql, values);
      
      if (userResult.rows.length === 0) {
        throw new Error('Failed to create user - no rows returned');
      }
      
      const rawUser = userResult.rows[0];
      
      // Create identity using direct SQL to avoid schema mismatch issues
      await pool.query(`
        INSERT INTO user_identities (
          user_id, provider, provider_id, is_primary, is_verified, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        rawUser.id,
        identity.provider,
        identity.providerId,
        true,
        identity.isVerified || false,
        JSON.stringify(identity.metadata || {})
      ]);
      
      console.log(`✅ Created user: ${rawUser.full_name} (${rawUser.id})`);
      return this.convertDbUserToAppUser(rawUser);
    } catch (error) {
      console.error('🚨 Error creating user with identity:', error);
      throw error;
    }
  }
  
  async getUserByWhatsApp(phoneNumber: string): Promise<User | undefined> {
    try {
      // Try with and without country code formatting
      const phoneVariants = [phoneNumber];
      if (phoneNumber.startsWith('+')) {
        phoneVariants.push(phoneNumber.substring(1));
      } else if (/^[0-9]{10}$/.test(phoneNumber)) {
        phoneVariants.push(`+91${phoneNumber}`);
      }
      
      for (const variant of phoneVariants) {
        const result = await pool.query(
          'SELECT * FROM users WHERE whatsapp_number = $1 LIMIT 1',
          [variant]
        );
        if (result.rows.length > 0) {
          return this.convertDbUserToAppUser(result.rows[0]);
        }
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting user by WhatsApp:', error);
      return undefined;
    }
  }
  
  async getUserByReplitId(replitId: string): Promise<User | undefined> {
    return this.getUserByProviderId('replit', replitId);
  }
  
  async createReplitUser(replitData: any): Promise<User> {
    return this.createUserWithIdentity(
      {
        fullName: replitData.name || replitData.email || 'Replit User',
        email: replitData.email,
        userType: 'sailor',
        isVerified: true
      },
      {
        provider: 'replit',
        providerId: replitData.id || replitData.sub,
        isVerified: true,
        metadata: {
          email: replitData.email,
          displayName: replitData.name,
          profileImageUrl: replitData.profileImageUrl
        }
      }
    );
  }
  
  async createWhatsAppUser(phoneNumber: string, displayName?: string): Promise<User> {
    return this.createUserWithIdentity(
      {
        fullName: displayName || `User ${phoneNumber.slice(-4)}`,
        email: null,
        userType: 'sailor',
        whatsAppNumber: phoneNumber,
        whatsAppDisplayName: displayName
      },
      {
        provider: 'whatsapp',
        providerId: phoneNumber,
        isVerified: false,
        metadata: {
          phone: phoneNumber,
          displayName: displayName
        } as Record<string, any>
      }
    );
  }
  
  async getUser(id: string): Promise<User | undefined> {
    try {
      // Use direct SQL to avoid Drizzle schema mismatch with parent QAAQ database
      const result = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
      if (result.rows.length === 0) return undefined;
      return this.convertDbUserToAppUser(result.rows[0]);
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }
  
  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id); // Alias for getUser
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      // Use direct SQL query to avoid column mismatch issues with Drizzle
      const result = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
      if (result.rows.length === 0) {
        return undefined;
      }
      
      const user = result.rows[0];
      return this.convertDbUserToAppUser(user);
    } catch (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    try {
      // Use identity resolver system instead of direct google_id column lookup
      console.log('🔍 getUserByGoogleId: Using identity system for:', googleId);
      return await this.getUserByProviderId('google', googleId);
    } catch (error) {
      console.error('Error getting user by Google ID:', error);
      return undefined;
    }
  }

  async getUserByLinkedInId(linkedInId: string): Promise<User | undefined> {
    try {
      const result = await pool.query('SELECT * FROM users WHERE linkedin_id = $1 LIMIT 1', [linkedInId]);
      if (result.rows.length === 0) {
        return undefined;
      }
      
      const user = result.rows[0];
      return this.convertDbUserToAppUser(user);
    } catch (error) {
      console.error('Error getting user by LinkedIn ID:', error);
      return undefined;
    }
  }

  async getUserByIdAndPassword(userId: string, password: string): Promise<User | undefined> {
    console.log(`🔑 Login attempt for userId: ${userId}`);
    
    try {
      let result;
      let user;
      
      // Try direct lookup by user_id first
      result = await pool.query('SELECT * FROM users WHERE user_id = $1 LIMIT 1', [userId]);
      
      if (result.rows.length === 0) {
        // Fallback: try by email
        result = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [userId]);
      }
      
      if (result.rows.length === 0) {
        // Fallback: try by id (primary key)
        result = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
      }
      
      if (result.rows.length === 0) {
        console.log(`❌ No user found for ID: ${userId}`);
        return undefined;
      }
      
      user = result.rows[0];
      
      // Verify password matches
      if (user.password !== password) {
        console.log(`❌ Invalid password for user: ${userId}`);
        return undefined;
      }
      
      console.log(`✅ User authenticated: ${user.full_name || user.email} (${user.email})`);
      
      return this.convertDbUserToAppUser(user);
    } catch (error) {
      console.error('Error in getUserByIdAndPassword:', error);
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      // Use direct SQL to avoid schema mismatch issues with Drizzle
      const result = await pool.query(`
        INSERT INTO users (
          user_id, full_name, email, password, user_type, rank, 
          last_company, whatsapp_number, is_verified, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING *
      `, [
        user.userId || null,
        user.fullName,
        user.email,
        user.password || null,
        user.userType,
        user.rank || null,
        user.lastCompany || null,
        user.whatsAppNumber || null,
        user.isVerified || false
      ]);
      
      const newUser = result.rows[0];
      return this.convertDbUserToAppUser(newUser);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async createGoogleUser(googleUserData: any): Promise<User> {
    try {
      // Generate a unique user ID based on name and timestamp
      const baseUserId = googleUserData.fullName.toLowerCase().replace(/\s+/g, '.');
      const timestamp = Date.now().toString().slice(-6);
      const userId = `${baseUserId}.${timestamp}`;

      const result = await pool.query(`
        INSERT INTO users (
          user_id, full_name, email, google_id, google_email, 
          google_profile_picture_url, google_display_name, 
          auth_provider, user_type, is_verified, created_at, last_login
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *
      `, [
        userId,
        googleUserData.fullName,
        googleUserData.email,
        googleUserData.googleId,
        googleUserData.googleEmail,
        googleUserData.googleProfilePictureUrl,
        googleUserData.googleDisplayName,
        googleUserData.authProvider,
        googleUserData.userType,
        googleUserData.isVerified
      ]);

      return this.convertDbUserToAppUser(result.rows[0]);
    } catch (error) {
      console.error('Error creating Google user:', error);
      throw error;
    }
  }

  async createLinkedInUser(linkedInUserData: any): Promise<User> {
    try {
      // Generate a unique user ID based on name and timestamp
      const baseUserId = linkedInUserData.fullName.toLowerCase().replace(/\s+/g, '.');
      const timestamp = Date.now().toString().slice(-6);
      const userId = `${baseUserId}.${timestamp}`;

      const result = await pool.query(`
        INSERT INTO users (
          user_id, full_name, email, linkedin_id, linkedin_email, 
          linkedin_profile_picture_url, linkedin_display_name, 
          auth_provider, user_type, is_verified, created_at, last_login
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *
      `, [
        userId,
        linkedInUserData.fullName,
        linkedInUserData.email,
        linkedInUserData.linkedInId,
        linkedInUserData.linkedInEmail,
        linkedInUserData.linkedInProfilePictureUrl,
        linkedInUserData.linkedInDisplayName,
        linkedInUserData.authProvider,
        linkedInUserData.userType,
        linkedInUserData.isVerified
      ]);

      return this.convertDbUserToAppUser(result.rows[0]);
    } catch (error) {
      console.error('Error creating LinkedIn user:', error);
      throw error;
    }
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User | undefined> {
    try {
      // Use ColumnGuard to filter updates to only existing columns
      const safeUpdates = await ColumnGuard.pickExistingColumns(updates as any, 'users');
      
      console.log(`🛡️ COLUMN GUARD: Filtered ${Object.keys(updates).length} updates to ${Object.keys(safeUpdates).length} safe columns`);
      
      const [user] = await db
        .update(users)
        .set(safeUpdates as any)
        .where(eq(users.id, userId))
        .returning();
      return user || undefined;
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  async updateUserVerification(userId: string, isVerified: boolean): Promise<void> {
    await db.update(users).set({ isVerified }).where(eq(users.id, userId));
  }

  async incrementLoginCount(userId: string): Promise<void> {
    await db.update(users).set({ 
      loginCount: sql`${users.loginCount} + 1`,
      lastLogin: new Date()
    }).where(eq(users.id, userId));
  }

  async incrementUserQuestionCount(userId: string): Promise<void> {
    await db.update(users).set({ 
      questionCount: sql`${users.questionCount} + 1`
    }).where(eq(users.id, userId));
  }

  async getUsersWithLocation(): Promise<User[]> {
    try {
      console.log('🔍 Accessing parent QAAQ database for ALL users with location data');
      
      // Use direct SQL to avoid schema issues with parent QAAQ database
      // REMOVED LIMIT 50 to access all 884+ users from parent database
      const result = await pool.query(`
        SELECT * FROM users 
        WHERE (latitude IS NOT NULL AND longitude IS NOT NULL)
           OR (current_latitude IS NOT NULL AND current_longitude IS NOT NULL)
           OR (device_latitude IS NOT NULL AND device_longitude IS NOT NULL)
           OR (city IS NOT NULL AND city != '')
           OR (port IS NOT NULL AND port != '')
        ORDER BY last_updated DESC
      `);
      
      console.log(`📊 Retrieved ${result.rows.length} users from parent QAAQ database (was limited to 50, now accessing full database)`);
      
      return result.rows.map(row => this.convertDbUserToAppUser(row));
    } catch (error) {
      console.error('Get users with location error:', error);
      return [];
    }
  }

  async updateUserLocation(userId: string, latitude: number, longitude: number, source: 'device' | 'ship' | 'city'): Promise<void> {
    await db.update(users).set({
      latitude,
      longitude,
      locationSource: source,
      locationUpdatedAt: new Date()
    }).where(eq(users.id, userId));
  }

  async updateUserProfile(userId: string, profileData: Partial<User>): Promise<User | undefined> {
    try {
      console.log('🔄 Updating user profile with data:', profileData);
      
      // Build SET clause dynamically for only the fields we want to update
      const setClause = [];
      const values = [];
      let paramCount = 1;
      
      if (profileData.fullName !== undefined) {
        setClause.push(`full_name = $${paramCount++}`);
        values.push(profileData.fullName);
      }
      if (profileData.email !== undefined) {
        setClause.push(`email = $${paramCount++}`);
        values.push(profileData.email);
      }
      if (profileData.maritimeRank !== undefined) {
        setClause.push(`maritime_rank = $${paramCount++}`);
        values.push(profileData.maritimeRank);
      }
      if (profileData.currentLastShip !== undefined) {
        setClause.push(`current_lastship = $${paramCount++}`);
        values.push(profileData.currentLastShip);
      }

      if (profileData.city !== undefined) {
        setClause.push(`city = $${paramCount++}`);
        values.push(profileData.city);
      }
      if (profileData.country !== undefined) {
        setClause.push(`country = $${paramCount++}`);
        values.push(profileData.country);
      }
      if (profileData.countryCode !== undefined) {
        // Map countryCode to existing country column
        console.log('🗺️ Mapping countryCode to country column:', profileData.countryCode);
        setClause.push(`country = $${paramCount++}`);
        values.push(profileData.countryCode);
      }
      if (profileData.whatsAppNumber !== undefined) {
        setClause.push(`whatsapp_number = $${paramCount++}`);
        values.push(profileData.whatsAppNumber);
      }
      
      if (setClause.length === 0) {
        console.log('❌ No valid fields to update');
        return undefined;
      }
      
      // Add last_updated timestamp
      setClause.push(`last_updated = NOW()`);
      
      // Add userId to values for WHERE clause
      values.push(userId);
      
      const query = `
        UPDATE users 
        SET ${setClause.join(', ')} 
        WHERE id = $${paramCount}
        RETURNING *
      `;
      
      console.log('📝 Profile update query:', query);
      console.log('📝 Profile update values:', values);
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        console.log('❌ User not found for profile update');
        return undefined;
      }
      
      console.log('✅ Profile updated successfully');
      return this.convertDbUserToAppUser(result.rows[0]);
    } catch (error) {
      console.error('❌ Error updating user profile:', error);
      return undefined;
    }
  }

  async updateUserShipName(userId: string, shipName: string): Promise<void> {
    await db.update(users).set({ shipName }).where(eq(users.id, userId));
  }

  async updateUserPassword(userId: string, password: string): Promise<void> {
    try {
      console.log(`🔄 Updating password for user: ${userId}`);
      
      const result = await pool.query(`
        UPDATE users SET 
          password = $1,
          password_created_at = NOW(),
          has_set_custom_password = true,
          needs_password_change = false,
          last_updated = NOW()
        WHERE id = $2
        RETURNING id, full_name
      `, [password, userId]);
      
      if (result.rows.length === 0) {
        throw new Error(`User with ID ${userId} not found`);
      }
      
      console.log(`✅ Password updated for user: ${result.rows[0].full_name} (${userId})`);
    } catch (error) {
      console.error('Error updating user password:', error);
      throw error;
    }
  }

  async checkPasswordRenewalRequired(userId: string): Promise<boolean> {
    // PASSWORD RENEWAL DISABLED: Users can update passwords at their own leisure
    return false; // Never require password renewal
  }

  async generateUserId(fullName: string, rank: string): Promise<string> {
    const rankMap: Record<string, string> = {
      'captain': 'CAP',
      'chief officer': 'CO',
      'second officer': '2O',
      'third officer': '3O',
      'chief engineer': 'CE',
      'second engineer': '2E',
      'third engineer': '3E',
      'fourth engineer': '4E',
      'cadet': 'CAD',
      'student': 'STU',
      'eto': 'ETO',
      'electrical superintendent': 'ES',
      'technical superintendent': 'TSI',
      'marine superintendent': 'MSI',
      'fleet manager': 'FM',
      'maritime professional': 'MP'
    };

    const prefix = rankMap[rank.toLowerCase()] || 'MP';
    const randomNumber = Math.floor(100 + Math.random() * 900);
    
    return `${prefix}${randomNumber}`;
  }

  async createVerificationCode(userId: string, code: string, expiresAt: Date): Promise<VerificationCode> {
    const [verificationCode] = await db.insert(verificationCodes).values({
      userId,
      code,
      expiresAt,
      used: false
    }).returning();
    return verificationCode;
  }

  async getVerificationCode(userId: string, code: string): Promise<VerificationCode | undefined> {
    const [verificationCode] = await db.select().from(verificationCodes).where(
      and(
        eq(verificationCodes.userId, userId),
        eq(verificationCodes.code, code),
        eq(verificationCodes.used, false)
      )
    );
    return verificationCode || undefined;
  }

  async markCodeAsUsed(codeId: string): Promise<void> {
    await db.update(verificationCodes).set({ used: true }).where(eq(verificationCodes.id, codeId));
  }


  private convertDbUserToAppUser(dbUser: any): User {
    const fullName = [dbUser.first_name, dbUser.middle_name, dbUser.last_name].filter(Boolean).join(' ') || dbUser.full_name || dbUser.email || 'User';
    
    return {
      id: dbUser.id,
      userId: dbUser.user_id || dbUser.id, // Use user_id column, fallback to id
      fullName: fullName,
      email: dbUser.email || '',
      password: dbUser.password || '',
      hasSetCustomPassword: dbUser.has_set_custom_password || false,
      needsPasswordChange: dbUser.needs_password_change || true,
      passwordCreatedAt: dbUser.password_created_at || null,
      passwordRenewalDue: dbUser.password_renewal_due || null,
      mustCreatePassword: dbUser.must_create_password || true,
      userType: dbUser.onboard_status === 'ONBOARD' || dbUser.current_ship_name || dbUser.ship_name ? 'Onboard' : 'On land',
      isAdmin: dbUser.is_admin || dbUser.is_platform_admin || false,
      isIntern: dbUser.is_intern || false,
      nickname: dbUser.nickname || '',
      primaryAuthProvider: dbUser.primary_auth_provider || 'qaaq',
      authProviders: Array.isArray(dbUser.auth_providers) ? dbUser.auth_providers : (dbUser.auth_providers ? JSON.parse(dbUser.auth_providers) : ['qaaq']),
      rank: dbUser.rank || dbUser.maritime_rank || '',
      maritimeRank: dbUser.maritime_rank,
      shipName: dbUser.ship_name || dbUser.current_ship_name || '',
      currentShipName: dbUser.current_ship_name,
      imoNumber: dbUser.imo_number || dbUser.current_ship_imo || '',
      currentShipIMO: dbUser.current_ship_imo,
      port: dbUser.port || dbUser.city || '',
      visitWindow: dbUser.visit_window || '',
      city: dbUser.city || 'Mumbai',
      country: dbUser.country || 'India',
      nationality: dbUser.nationality,
      experienceLevel: dbUser.experience_level,
      lastCompany: dbUser.last_company || '',
      lastShip: dbUser.last_ship,
      onboardSince: dbUser.onboard_since,
      onboardStatus: dbUser.onboard_status,
      dateOfBirth: dbUser.date_of_birth,
      gender: dbUser.gender,
      whatsAppNumber: dbUser.whatsapp_number || '',
      countryCode: dbUser.country || '',
      currentLastShip: dbUser.current_lastShip || '',
      whatsAppProfilePictureUrl: dbUser.whatsapp_profile_picture_url,
      whatsAppDisplayName: dbUser.whatsapp_display_name,
      googleId: dbUser.id, // Use primary ID as fallback
      googleEmail: dbUser.google_email,
      googleProfilePictureUrl: dbUser.google_profile_picture_url,
      googleDisplayName: dbUser.google_display_name,
      authProvider: dbUser.auth_provider || 'qaaq',
      hasCompletedOnboarding: dbUser.has_completed_onboarding || false,
      isPlatformAdmin: dbUser.is_platform_admin || false,
      isBlocked: dbUser.is_blocked || false,
      isWorkshopProvider: dbUser.is_workshop_provider || false,
      latitude: parseFloat(dbUser.latitude) || null,
      longitude: parseFloat(dbUser.longitude) || null,
      currentLatitude: parseFloat(dbUser.current_latitude) || null,
      currentLongitude: parseFloat(dbUser.current_longitude) || null,
      deviceLatitude: parseFloat(dbUser.device_latitude) || null,
      deviceLongitude: parseFloat(dbUser.device_longitude) || null,
      locationSource: dbUser.location_source || 'city',
      locationUpdatedAt: dbUser.location_updated_at,
      questionCount: dbUser.question_count || 0,
      answerCount: dbUser.answer_count || 0,
      lastChatClearAt: dbUser.last_chat_clear_at,
      isVerified: dbUser.is_verified || false,
      loginCount: dbUser.login_count || 0,
      lastLogin: dbUser.last_login,
      lastUpdated: dbUser.last_updated,
      createdAt: dbUser.created_at,
      // Subscription fields - safe access for parent QAAQ database compatibility
      isPremium: dbUser.is_premium || false,
      premiumExpiresAt: dbUser.premium_expires_at || null,
      subscriptionType: dbUser.subscription_type || null,
      subscriptionStatus: dbUser.subscription_status || 'inactive',
      razorpayCustomerId: dbUser.razorpay_customer_id || null,
      paymentMethod: dbUser.payment_method || null
    };
  }

  // Chat connection methods
  async getChatConnection(senderId: string, receiverId: string): Promise<ChatConnection | null> {
    try {
      const [connection] = await db
        .select()
        .from(chatConnections)
        .where(
          or(
            and(eq(chatConnections.senderId, senderId), eq(chatConnections.receiverId, receiverId)),
            and(eq(chatConnections.senderId, receiverId), eq(chatConnections.receiverId, senderId))
          )
        );
      return connection || null;
    } catch (error) {
      console.error('Error getting chat connection:', error);
      return null;
    }
  }

  async createChatConnection(senderId: string, receiverId: string): Promise<ChatConnection> {
    const [connection] = await db
      .insert(chatConnections)
      .values({
        senderId,
        receiverId,
        status: 'pending',
      })
      .returning();
    return connection;
  }

  async getUserChatConnections(userId: string): Promise<ChatConnection[]> {
    try {
      // Use SQL query to get connections ordered by latest message activity
      // Exclude blocked connections from the receiver's view
      const result = await pool.query(`
        SELECT DISTINCT
          cc.id,
          cc.sender_id,
          cc.receiver_id,
          cc.status,
          cc.created_at,
          cc.accepted_at,
          COALESCE(latest_msg.latest_message_at, cc.created_at) as last_activity
        FROM chat_connections cc
        LEFT JOIN (
          SELECT 
            CASE 
              WHEN from_user_id < to_user_id THEN from_user_id
              ELSE to_user_id
            END as user1,
            CASE 
              WHEN from_user_id < to_user_id THEN to_user_id
              ELSE from_user_id
            END as user2,
            MAX(created_at) as latest_message_at
          FROM chat_messages 
          GROUP BY user1, user2
        ) latest_msg ON (
          (cc.sender_id = latest_msg.user1 AND cc.receiver_id = latest_msg.user2) OR
          (cc.sender_id = latest_msg.user2 AND cc.receiver_id = latest_msg.user1)
        )
        WHERE (cc.sender_id = $1 OR cc.receiver_id = $1)
        ORDER BY last_activity DESC
      `, [userId]);

      return result.rows.map(row => ({
        id: row.id,
        senderId: row.sender_id,
        receiverId: row.receiver_id,
        status: row.status,
        createdAt: row.created_at,
        acceptedAt: row.accepted_at,
        lastActivity: row.last_activity
      }));
    } catch (error) {
      console.error('Error getting user chat connections:', error);
      throw error;
    }
  }

  async acceptChatConnection(connectionId: string): Promise<void> {
    await db
      .update(chatConnections)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
      })
      .where(eq(chatConnections.id, connectionId));
  }

  async rejectChatConnection(connectionId: string): Promise<void> {
    await db
      .update(chatConnections)
      .set({ status: 'rejected' })
      .where(eq(chatConnections.id, connectionId));
  }

  async blockChatConnection(connectionId: string): Promise<void> {
    await db
      .update(chatConnections)
      .set({ status: 'blocked' })
      .where(eq(chatConnections.id, connectionId));
  }

  async getChatConnectionById(connectionId: string): Promise<ChatConnection | null> {
    try {
      const [connection] = await db
        .select()
        .from(chatConnections)
        .where(eq(chatConnections.id, connectionId));
      return connection || null;
    } catch (error) {
      console.error('Error getting chat connection by ID:', error);
      return null;
    }
  }

  async unblockChatConnection(connectionId: string): Promise<void> {
    await db
      .update(chatConnections)
      .set({ status: 'pending' })
      .where(eq(chatConnections.id, connectionId));
  }

  async sendMessage(connectionId: string, senderId: string, message: string): Promise<ChatMessage> {
    try {
      // Use 'content' column instead of 'message' to match database schema
      const result = await pool.query(`
        INSERT INTO chat_messages (
          connection_id, 
          sender_id,
          user_id, 
          content,
          is_delivered,
          delivered_at
        )
        VALUES ($1, $2, $2, $3, true, NOW())
        RETURNING id, connection_id, sender_id, user_id, content, created_at, is_read, is_delivered, delivered_at, read_at
      `, [connectionId, senderId, message]);
      
      const row = result.rows[0];
      return {
        id: row.id,
        connectionId: row.connection_id,
        senderId: row.sender_id,
        message: row.content || row.message, // Support both field names for compatibility
        isRead: row.is_read || false,
        isDelivered: row.is_delivered || false,
        readAt: row.read_at,
        deliveredAt: row.delivered_at,
        createdAt: row.created_at
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async getChatMessages(connectionId: string): Promise<ChatMessage[]> {
    try {
      // Use direct SQL to handle parent QAAQ database schema
      const result = await pool.query(`
        SELECT * FROM chat_messages 
        WHERE connection_id = $1
        ORDER BY created_at ASC
      `, [connectionId]);
      
      return result.rows.map(row => ({
        id: row.id,
        connectionId: row.connection_id,
        senderId: row.sender_id,
        message: row.content || row.message, // Support both field names for compatibility
        isRead: row.is_read || false,
        isDelivered: row.is_delivered || false,
        readAt: row.read_at,
        deliveredAt: row.delivered_at,
        createdAt: row.created_at
      }));
    } catch (error) {
      console.error('Error getting chat messages:', error);
      return [];
    }
  }

  async markMessagesAsRead(connectionId: string, userId: string): Promise<void> {
    try {
      // Use direct SQL to handle parent QAAQ database schema with read_at timestamp
      await pool.query(`
        UPDATE chat_messages 
        SET is_read = true, read_at = NOW() 
        WHERE connection_id = $1 AND sender_id != $2 AND is_read = false
      `, [connectionId, userId]);
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  async getUnreadMessageCounts(userId: string): Promise<Record<string, number>> {
    try {
      // Get all connections for this user
      const connections = await this.getUserChatConnections(userId);
      const counts: Record<string, number> = {};

      for (const connection of connections) {
        // Find the other user in this connection
        const otherUserId = connection.senderId === userId ? connection.receiverId : connection.senderId;
        
        // Count unread messages from the other user in this connection
        const [result] = await db
          .select({ count: sql`count(*)` })
          .from(chatMessages)
          .where(
            and(
              eq(chatMessages.connectionId, connection.id),
              eq(chatMessages.senderId, otherUserId),
              eq(chatMessages.isRead, false)
            )
          );

        counts[otherUserId] = Number(result.count) || 0;
      }

      return counts;
    } catch (error) {
      console.error('Error getting unread message counts:', error);
      throw error;
    }
  }

  async upsertUser(userData: any): Promise<User> {
    try {
      // Use direct SQL for upsert to avoid schema issues
      const result = await pool.query(`
        INSERT INTO users (
          id, full_name, email, google_id, google_email, 
          google_profile_picture_url, google_display_name, 
          auth_provider, user_type, is_verified, created_at, last_login
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        ON CONFLICT (email) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          google_profile_picture_url = EXCLUDED.google_profile_picture_url,
          google_display_name = EXCLUDED.google_display_name,
          last_login = NOW()
        RETURNING *
      `, [
        userData.id || userData.sub,
        `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email,
        userData.email,
        userData.id || userData.sub,
        userData.email,
        userData.profileImageUrl || userData.profile_image_url,
        `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email,
        'replit',
        'sailor',
        true
      ]);

      return this.convertDbUserToAppUser(result.rows[0]);
    } catch (error) {
      console.error('Error upserting user:', error);
      throw error;
    }
  }
  
  // Missing methods causing LSP errors - stub implementations
  async linkIdentityToUser(userId: string, identity: Omit<InsertUserIdentity, 'userId'>): Promise<UserIdentity> {
    try {
      console.log(`🔗 Linking identity ${identity.provider}:${identity.providerId} to user ${userId}`);
      
      // Check if identity already exists
      const existing = await pool.query(
        'SELECT * FROM user_identities WHERE provider = $1 AND provider_id = $2',
        [identity.provider, identity.providerId]
      );
      
      if (existing.rows.length > 0) {
        throw new Error(`Identity ${identity.provider}:${identity.providerId} already linked to another user`);
      }
      
      // Create new identity link using direct SQL to avoid schema mismatch issues
      const result = await pool.query(`
        INSERT INTO user_identities (
          user_id, provider, provider_id, is_primary, is_verified, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        userId,
        identity.provider,
        identity.providerId,
        identity.isPrimary || false,
        identity.isVerified || false,
        JSON.stringify(identity.metadata || {})
      ]);
      
      const linkedIdentity = result.rows[0];
      
      // Update user's auth providers list
      await pool.query(`
        UPDATE users 
        SET auth_providers = COALESCE(auth_providers, '[]'::jsonb) || $2::jsonb
        WHERE id = $1 AND NOT (auth_providers ? $3)
      `, [userId, JSON.stringify([identity.provider]), identity.provider]);
      
      console.log(`✅ Linked identity successfully`);
      return linkedIdentity;
    } catch (error) {
      console.error('Error linking identity:', error);
      throw error;
    }
  }
  
  async unlinkIdentity(userId: string, provider: string): Promise<void> {
    try {
      await db.delete(userIdentities).where(
        and(
          eq(userIdentities.userId, userId),
          eq(userIdentities.provider, provider)
        )
      );
      
      // Update user's auth providers list
      await pool.query(`
        UPDATE users 
        SET auth_providers = auth_providers - $2
        WHERE id = $1
      `, [userId, provider]);
    } catch (error) {
      console.error('Error unlinking identity:', error);
      throw error;
    }
  }
  
  async getUserIdentities(userId: string): Promise<UserIdentity[]> {
    try {
      return await db.select().from(userIdentities)
        .where(eq(userIdentities.userId, userId))
        .orderBy(desc(userIdentities.isPrimary));
    } catch (error) {
      console.error('Error getting user identities:', error);
      return [];
    }
  }
  
  async setPrimaryIdentity(userId: string, identityId: string): Promise<void> {
    try {
      // Set all identities to non-primary
      await db.update(userIdentities)
        .set({ isPrimary: false })
        .where(eq(userIdentities.userId, userId));
      
      // Set specified identity as primary
      await db.update(userIdentities)
        .set({ isPrimary: true })
        .where(eq(userIdentities.id, identityId));
    } catch (error) {
      console.error('Error setting primary identity:', error);
      throw error;
    }
  }
  
  // Stub implementations for missing methods to resolve LSP errors
  async createMessage(data: any): Promise<any> {
    throw new Error('createMessage method not yet implemented');
  }
  
  async createPost(data: any): Promise<any> {
    throw new Error('createPost method not yet implemented');
  }
  
  async getPosts(filters?: any): Promise<any[]> {
    try {
      // Posts functionality not available in QAAQ admin database
      console.log('Posts table not available - returning empty array');
      return [];
    } catch (error) {
      console.error('Error in getPosts:', error);
      return [];
    }
  }
  
  async searchPosts(query: string): Promise<any[]> {
    throw new Error('searchPosts method not yet implemented');
  }
  
  async getUserLike(userId: string, postId: string): Promise<any> {
    throw new Error('getUserLike method not yet implemented');
  }
  
  async likePost(userId: string, postId: string): Promise<any> {
    throw new Error('likePost method not yet implemented');
  }
  
  async unlikePost(userId: string, postId: string): Promise<any> {
    throw new Error('unlikePost method not yet implemented');
  }

  // User answers implementation
  async createUserAnswer(answer: InsertUserAnswer): Promise<UserAnswer> {
    try {
      const [newAnswer] = await db
        .insert(userAnswers)
        .values(answer)
        .returning();
      return newAnswer;
    } catch (error) {
      console.error('Error creating user answer:', error);
      throw error;
    }
  }

  async getUserAnswersForQuestion(questionId: number): Promise<UserAnswer[]> {
    try {
      const answers = await db
        .select({
          id: userAnswers.id,
          questionId: userAnswers.questionId,
          userId: userAnswers.userId,
          content: userAnswers.content,
          likesCount: userAnswers.likesCount,
          createdAt: userAnswers.createdAt,
          updatedAt: userAnswers.updatedAt,
          // Join user data
          authorName: users.fullName,
          authorRank: users.rank,
        })
        .from(userAnswers)
        .leftJoin(users, eq(userAnswers.userId, users.id))
        .where(eq(userAnswers.questionId, questionId))
        .orderBy(desc(userAnswers.likesCount), desc(userAnswers.createdAt));
      
      return answers.map(answer => ({
        id: answer.id,
        questionId: answer.questionId,
        userId: answer.userId,
        content: answer.content,
        likesCount: answer.likesCount || 0,
        createdAt: answer.createdAt,
        updatedAt: answer.updatedAt,
        authorName: answer.authorName || 'Anonymous',
        authorRank: answer.authorRank,
      })) as UserAnswer[];
    } catch (error) {
      console.error('Error getting user answers:', error);
      return [];
    }
  }

  async deleteUserAnswer(answerId: string, userId: string): Promise<void> {
    try {
      await db
        .delete(userAnswers)
        .where(
          and(
            eq(userAnswers.id, answerId),
            eq(userAnswers.userId, userId)
          )
        );
    } catch (error) {
      console.error('Error deleting user answer:', error);
      throw error;
    }
  }

  async updateAnswerLikesCount(answerId: string): Promise<void> {
    try {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(answerLikes)
        .where(eq(answerLikes.answerId, answerId));
      
      await db
        .update(userAnswers)
        .set({ likesCount: count })
        .where(eq(userAnswers.id, answerId));
    } catch (error) {
      console.error('Error updating answer likes count:', error);
      throw error;
    }
  }

  // Answer likes implementation
  async likeAnswer(userId: string, answerId: string): Promise<void> {
    try {
      await db.insert(answerLikes).values({
        userId,
        answerId,
      });
      await this.updateAnswerLikesCount(answerId);
    } catch (error) {
      console.error('Error liking answer:', error);
      throw error;
    }
  }

  async unlikeAnswer(userId: string, answerId: string): Promise<void> {
    try {
      await db
        .delete(answerLikes)
        .where(
          and(
            eq(answerLikes.userId, userId),
            eq(answerLikes.answerId, answerId)
          )
        );
      await this.updateAnswerLikesCount(answerId);
    } catch (error) {
      console.error('Error unliking answer:', error);
      throw error;
    }
  }

  async getUserAnswerLike(userId: string, answerId: string): Promise<AnswerLike | undefined> {
    try {
      const [like] = await db
        .select()
        .from(answerLikes)
        .where(
          and(
            eq(answerLikes.userId, userId),
            eq(answerLikes.answerId, answerId)
          )
        );
      return like || undefined;
    } catch (error) {
      console.error('Error getting user answer like:', error);
      return undefined;
    }
  }

  // Workshop Service Tasks Management Implementation
  async createServiceTask(task: InsertWorkshopServiceTask): Promise<WorkshopServiceTask> {
    try {
      // Use direct SQL to avoid schema mismatch issues with Drizzle
      const result = await pool.query(`
        INSERT INTO workshop_service_tasks (
          task_code, system_code, equipment_code, task_sequence, task_name,
          task_description, required_expertise, estimated_hours, difficulty_level,
          "order", tags, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        task.taskCode,
        task.systemCode,
        task.equipmentCode,
        task.taskSequence,
        task.taskName,
        task.taskDescription,
        JSON.stringify(task.requiredExpertise || []),
        task.estimatedHours,
        task.difficultyLevel || 'medium',
        task.order,
        JSON.stringify(task.tags || []),
        task.isActive !== false // Default to true unless explicitly false
      ]);
      
      const newTask = result.rows[0];
      console.log(`✅ Created service task: ${newTask.task_code} - ${newTask.task_name}`);
      return newTask;
    } catch (error) {
      console.error('Error creating service task:', error);
      throw error;
    }
  }

  async getServiceTask(taskId: string): Promise<WorkshopServiceTask | undefined> {
    try {
      const [task] = await db
        .select()
        .from(workshopServiceTasks)
        .where(eq(workshopServiceTasks.id, taskId));
      return task || undefined;
    } catch (error) {
      console.error('Error getting service task:', error);
      return undefined;
    }
  }

  async getServiceTaskByCode(taskCode: string): Promise<WorkshopServiceTask | undefined> {
    try {
      const [task] = await db
        .select()
        .from(workshopServiceTasks)
        .where(eq(workshopServiceTasks.taskCode, taskCode));
      return task || undefined;
    } catch (error) {
      console.error('Error getting service task by code:', error);
      return undefined;
    }
  }

  async getServiceTasksBySystem(systemCode: string): Promise<WorkshopServiceTask[]> {
    try {
      const tasks = await db
        .select()
        .from(workshopServiceTasks)
        .where(
          and(
            eq(workshopServiceTasks.systemCode, systemCode),
            eq(workshopServiceTasks.isActive, true)
          )
        )
        .orderBy(workshopServiceTasks.order);
      return tasks;
    } catch (error) {
      console.error('Error getting service tasks by system:', error);
      return [];
    }
  }

  async getServiceTasksByEquipment(equipmentCode: string): Promise<WorkshopServiceTask[]> {
    try {
      const tasks = await db
        .select()
        .from(workshopServiceTasks)
        .where(
          and(
            eq(workshopServiceTasks.equipmentCode, equipmentCode),
            eq(workshopServiceTasks.isActive, true)
          )
        )
        .orderBy(workshopServiceTasks.order);
      return tasks;
    } catch (error) {
      console.error('Error getting service tasks by equipment:', error);
      return [];
    }
  }

  async getAllServiceTasks(filters?: { isActive?: boolean; systemCode?: string; equipmentCode?: string }): Promise<WorkshopServiceTask[]> {
    try {
      let query = db.select().from(workshopServiceTasks);
      
      const conditions = [];
      if (filters?.isActive !== undefined) {
        conditions.push(eq(workshopServiceTasks.isActive, filters.isActive));
      }
      if (filters?.systemCode) {
        conditions.push(eq(workshopServiceTasks.systemCode, filters.systemCode));
      }
      if (filters?.equipmentCode) {
        conditions.push(eq(workshopServiceTasks.equipmentCode, filters.equipmentCode));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const tasks = await query.orderBy(workshopServiceTasks.systemCode, workshopServiceTasks.equipmentCode, workshopServiceTasks.order);
      return tasks;
    } catch (error) {
      console.error('Error getting all service tasks:', error);
      return [];
    }
  }

  async updateServiceTask(taskId: string, updates: Partial<WorkshopServiceTask>): Promise<WorkshopServiceTask | undefined> {
    try {
      const [updatedTask] = await db
        .update(workshopServiceTasks)
        .set({ ...updates, updatedAt: sql`now()` })
        .where(eq(workshopServiceTasks.id, taskId))
        .returning();
      console.log(`✅ Updated service task: ${taskId}`);
      return updatedTask || undefined;
    } catch (error) {
      console.error('Error updating service task:', error);
      return undefined;
    }
  }

  async deleteServiceTask(taskId: string): Promise<void> {
    try {
      await db
        .delete(workshopServiceTasks)
        .where(eq(workshopServiceTasks.id, taskId));
      console.log(`✅ Deleted service task: ${taskId}`);
    } catch (error) {
      console.error('Error deleting service task:', error);
      throw error;
    }
  }

  // Workshop Pricing Management Implementation
  async createWorkshopPricing(pricing: InsertWorkshopPricing): Promise<WorkshopPricing> {
    try {
      const [newPricing] = await db.insert(workshopPricing).values(pricing).returning();
      console.log(`✅ Created workshop pricing: ${pricing.workshopId} - ${pricing.expertiseCategory}`);
      return newPricing;
    } catch (error) {
      console.error('Error creating workshop pricing:', error);
      throw error;
    }
  }

  async getWorkshopPricing(pricingId: string): Promise<WorkshopPricing | undefined> {
    try {
      const [pricing] = await db
        .select()
        .from(workshopPricing)
        .where(eq(workshopPricing.id, pricingId));
      return pricing || undefined;
    } catch (error) {
      console.error('Error getting workshop pricing:', error);
      return undefined;
    }
  }

  async getWorkshopPricingByWorkshop(workshopId: string): Promise<WorkshopPricing[]> {
    try {
      const pricing = await db
        .select()
        .from(workshopPricing)
        .where(
          and(
            eq(workshopPricing.workshopId, workshopId),
            eq(workshopPricing.isActive, true)
          )
        )
        .orderBy(workshopPricing.expertiseCategory);
      return pricing;
    } catch (error) {
      console.error('Error getting workshop pricing by workshop:', error);
      return [];
    }
  }

  async getWorkshopPricingByExpertise(workshopId: string, expertiseCategory: string): Promise<WorkshopPricing | undefined> {
    try {
      const [pricing] = await db
        .select()
        .from(workshopPricing)
        .where(
          and(
            eq(workshopPricing.workshopId, workshopId),
            eq(workshopPricing.expertiseCategory, expertiseCategory),
            eq(workshopPricing.isActive, true)
          )
        );
      return pricing || undefined;
    } catch (error) {
      console.error('Error getting workshop pricing by expertise:', error);
      return undefined;
    }
  }

  async updateWorkshopPricing(pricingId: string, updates: Partial<WorkshopPricing>): Promise<WorkshopPricing | undefined> {
    try {
      const [updatedPricing] = await db
        .update(workshopPricing)
        .set({ ...updates, updatedAt: sql`now()` })
        .where(eq(workshopPricing.id, pricingId))
        .returning();
      console.log(`✅ Updated workshop pricing: ${pricingId}`);
      return updatedPricing || undefined;
    } catch (error) {
      console.error('Error updating workshop pricing:', error);
      return undefined;
    }
  }

  async deleteWorkshopPricing(pricingId: string): Promise<void> {
    try {
      await db
        .delete(workshopPricing)
        .where(eq(workshopPricing.id, pricingId));
      console.log(`✅ Deleted workshop pricing: ${pricingId}`);
    } catch (error) {
      console.error('Error deleting workshop pricing:', error);
      throw error;
    }
  }

  async upsertWorkshopPricing(workshopId: string, expertiseCategory: string, pricingData: Partial<InsertWorkshopPricing>): Promise<WorkshopPricing> {
    try {
      // Check if pricing already exists
      const existingPricing = await this.getWorkshopPricingByExpertise(workshopId, expertiseCategory);
      
      if (existingPricing) {
        // Update existing pricing
        return this.updateWorkshopPricing(existingPricing.id, pricingData) as Promise<WorkshopPricing>;
      } else {
        // Create new pricing
        return this.createWorkshopPricing({
          workshopId,
          expertiseCategory,
          ...pricingData
        } as InsertWorkshopPricing);
      }
    } catch (error) {
      console.error('Error upserting workshop pricing:', error);
      throw error;
    }
  }

  // Workshop Booking Management Implementation
  async createWorkshopBooking(booking: InsertWorkshopBooking): Promise<WorkshopBooking> {
    try {
      // Use direct SQL to avoid schema mismatch issues with Drizzle
      // bookingNumber is auto-generated in the database
      const result = await pool.query(`
        INSERT INTO workshop_bookings (
          ship_manager_id, ship_name, imo_number, port, workshop_id,
          service_type, estimated_hours, custom_description, priority,
          scheduled_date, status, ship_manager_notes, quoted_amount
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `, [
        booking.shipManagerId,
        booking.shipName,
        booking.imoNumber || null,
        booking.port,
        booking.workshopId,
        booking.serviceType,
        booking.estimatedHours,
        (booking as any).customDescription || null,
        (booking as any).priority || 'normal',
        (booking as any).scheduledDate || null,
        booking.status || 'pending',
        (booking as any).shipManagerNotes || null,
        (booking as any).quotedAmount || null
      ]);
      
      const newBooking = result.rows[0];
      console.log(`✅ Created workshop booking: ${newBooking.booking_number}`);
      return newBooking;
    } catch (error) {
      console.error('Error creating workshop booking:', error);
      throw error;
    }
  }

  async getWorkshopBooking(bookingId: string): Promise<WorkshopBooking | undefined> {
    try {
      const [booking] = await db
        .select()
        .from(workshopBookings)
        .where(eq(workshopBookings.id, bookingId));
      return booking || undefined;
    } catch (error) {
      console.error('Error getting workshop booking:', error);
      return undefined;
    }
  }

  async getWorkshopBookingByNumber(bookingNumber: string): Promise<WorkshopBooking | undefined> {
    try {
      const [booking] = await db
        .select()
        .from(workshopBookings)
        .where(eq(workshopBookings.bookingNumber, bookingNumber));
      return booking || undefined;
    } catch (error) {
      console.error('Error getting workshop booking by number:', error);
      return undefined;
    }
  }

  async getBookingsByShipManager(shipManagerId: string, filters?: { status?: string }): Promise<WorkshopBooking[]> {
    try {
      const conditions = [eq(workshopBookings.shipManagerId, shipManagerId)];
      
      if (filters?.status) {
        conditions.push(eq(workshopBookings.status, filters.status));
      }

      const bookings = await db
        .select()
        .from(workshopBookings)
        .where(and(...conditions))
        .orderBy(desc(workshopBookings.createdAt));
      
      return bookings;
    } catch (error) {
      console.error('Error getting bookings by ship manager:', error);
      return [];
    }
  }

  async getBookingsByWorkshop(workshopId: string, filters?: { status?: string }): Promise<WorkshopBooking[]> {
    try {
      const conditions = [eq(workshopBookings.workshopId, workshopId)];
      
      if (filters?.status) {
        conditions.push(eq(workshopBookings.status, filters.status));
      }

      const bookings = await db
        .select()
        .from(workshopBookings)
        .where(and(...conditions))
        .orderBy(desc(workshopBookings.createdAt));
      
      return bookings;
    } catch (error) {
      console.error('Error getting bookings by workshop:', error);
      return [];
    }
  }

  async getAllWorkshopBookings(filters?: { status?: string; port?: string; priority?: string }): Promise<WorkshopBooking[]> {
    try {
      let query = db.select().from(workshopBookings);
      
      const conditions = [];
      if (filters?.status) {
        conditions.push(eq(workshopBookings.status, filters.status));
      }
      if (filters?.port) {
        conditions.push(eq(workshopBookings.port, filters.port));
      }
      if (filters?.priority) {
        conditions.push(eq(workshopBookings.priority, filters.priority));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const bookings = await query.orderBy(desc(workshopBookings.createdAt));
      return bookings;
    } catch (error) {
      console.error('Error getting all workshop bookings:', error);
      return [];
    }
  }

  async updateWorkshopBooking(bookingId: string, updates: Partial<WorkshopBooking>): Promise<WorkshopBooking | undefined> {
    try {
      const [updatedBooking] = await db
        .update(workshopBookings)
        .set({ ...updates, updatedAt: sql`now()` })
        .where(eq(workshopBookings.id, bookingId))
        .returning();
      
      console.log(`✅ Updated workshop booking: ${bookingId}`);
      return updatedBooking || undefined;
    } catch (error) {
      console.error('Error updating workshop booking:', error);
      return undefined;
    }
  }

  async generateBookingNumber(): Promise<string> {
    try {
      // Generate booking number format: WB-YYYY-NNNNNN (e.g., WB-2025-000001)
      const year = new Date().getFullYear();
      
      // Count existing bookings this year to get next number
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year + 1}-01-01`;
      
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(workshopBookings)
        .where(
          and(
            sql`${workshopBookings.createdAt} >= ${yearStart}`,
            sql`${workshopBookings.createdAt} < ${yearEnd}`
          )
        );
      
      const nextNumber = (result.count || 0) + 1;
      const bookingNumber = `WB-${year}-${nextNumber.toString().padStart(6, '0')}`;
      
      return bookingNumber;
    } catch (error) {
      console.error('Error generating booking number:', error);
      // Fallback to timestamp-based booking number
      return `WB-${Date.now()}`;
    }
  }

  async cancelWorkshopBooking(bookingId: string, userId: string): Promise<WorkshopBooking | undefined> {
    try {
      const [updatedBooking] = await db
        .update(workshopBookings)
        .set({ 
          status: 'cancelled',
          updatedAt: sql`now()`
        })
        .where(eq(workshopBookings.id, bookingId))
        .returning();
      
      console.log(`✅ Cancelled workshop booking: ${bookingId} by user: ${userId}`);
      return updatedBooking || undefined;
    } catch (error) {
      console.error('Error cancelling workshop booking:', error);
      return undefined;
    }
  }

  async completeWorkshopBooking(bookingId: string, actualHours: number, finalAmount?: number): Promise<WorkshopBooking | undefined> {
    try {
      const updates: any = {
        status: 'completed',
        actualHours,
        completedAt: sql`now()`,
        updatedAt: sql`now()`
      };

      if (finalAmount !== undefined) {
        updates.finalAmount = finalAmount;
      }

      const [updatedBooking] = await db
        .update(workshopBookings)
        .set(updates)
        .where(eq(workshopBookings.id, bookingId))
        .returning();
      
      console.log(`✅ Completed workshop booking: ${bookingId} with ${actualHours} hours`);
      return updatedBooking || undefined;
    } catch (error) {
      console.error('Error completing workshop booking:', error);
      return undefined;
    }
  }

  // CSV Import functionality implementation
  async importWorkshopsFromCSV(workshopData: any[]): Promise<{ success: number; failed: number; errors: Array<{ email: string; error: string }> }> {
    const results = { success: 0, failed: 0, errors: [] as Array<{ email: string; error: string }> };
    
    console.log(`📊 Starting CSV import for ${workshopData.length} workshops`);

    for (const workshop of workshopData) {
      try {
        // Check if workshop with email already exists
        const exists = await this.checkWorkshopEmailExists(workshop.email);
        if (exists) {
          results.failed++;
          results.errors.push({
            email: workshop.email,
            error: 'Workshop with this email already exists'
          });
          continue;
        }

        // Create workshop record
        await this.createWorkshopFromCSV(workshop);
        results.success++;
        console.log(`✅ Successfully imported workshop: ${workshop.email}`);

      } catch (error: unknown) {
        results.failed++;
        results.errors.push({
          email: workshop.email || 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error during import'
        });
        console.error(`❌ Failed to import workshop ${workshop.email}:`, error);
      }
    }

    console.log(`📈 CSV Import completed: ${results.success} success, ${results.failed} failed`);
    return results;
  }

  async checkWorkshopEmailExists(email: string): Promise<boolean> {
    try {
      const result = await db
        .select({ id: workshopProfiles.id })
        .from(workshopProfiles)
        .where(eq(workshopProfiles.email, email.toLowerCase()))
        .limit(1);
      
      return result.length > 0;
    } catch (error) {
      console.error('Error checking workshop email existence:', error);
      return false;
    }
  }

  async createWorkshopFromCSV(workshopData: any): Promise<any> {
    try {
      // Generate anonymous display ID
      const displayId = await this.generateWorkshopDisplayId(workshopData.homePort);

      // Build the insert data with only existing columns
      const insertData = await ColumnGuard.pickExistingColumns({
        fullName: workshopData.fullName,
        email: workshopData.email.toLowerCase(),
        services: workshopData.services || '',
        maritimeExpertise: workshopData.maritimeExpertise || [],
        description: workshopData.description,
        whatsappNumber: workshopData.whatsappNumber,
        homePort: workshopData.homePort,
        visaStatus: workshopData.visaStatus,
        companiesWorkedFor: workshopData.companiesWorkedFor,
        workshopFrontPhoto: workshopData.workshopFrontPhoto,
        workshopWorkPhoto: workshopData.workshopWorkPhoto,
        quote8Hours: workshopData.quote8Hours,
        perDayAttendanceRate: workshopData.perDayAttendanceRate,
        officialWebsite: workshopData.officialWebsite,
        remoteTroubleshootingRate: workshopData.remoteTroubleshootingRate,
        bankDetails: workshopData.bankDetails,
        businessCardPhoto: workshopData.businessCardPhoto,
        displayId: displayId,
        importSource: 'csv',
        isActive: true,
        anonymousMode: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }, 'workshop_profiles');

      const [workshop] = await db
        .insert(workshopProfiles)
        .values(insertData as any)
        .returning();

      return workshop;
    } catch (error) {
      console.error('Error creating workshop from CSV:', error);
      throw error;
    }
  }

  private async generateWorkshopDisplayId(homePort: string): Promise<string> {
    try {
      // Clean and format port name for display ID
      const cleanPort = homePort
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '')
        .toLowerCase();

      // Count existing workshops in this port
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(workshopProfiles)
        .where(ilike(workshopProfiles.homePort, `%${homePort}%`));

      const nextNumber = (result.count || 0) + 1;
      const displayId = `w${cleanPort.charAt(0).toUpperCase()}${cleanPort.slice(1)}${nextNumber}`;
      
      return displayId;
    } catch (error) {
      console.error('Error generating workshop display ID:', error);
      // Fallback to random ID
      return `w${Math.random().toString(36).substr(2, 8)}`;
    }
  }
}

// Export singleton instance
export const storage = new DatabaseStorage();