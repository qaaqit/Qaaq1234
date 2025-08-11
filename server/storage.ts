import { users, posts, likes, verificationCodes, chatConnections, chatMessages, whatsappMessages, type User, type InsertUser, type Post, type InsertPost, type VerificationCode, type Like, type ChatConnection, type ChatMessage, type InsertChatConnection, type InsertChatMessage, type WhatsappMessage, type InsertWhatsappMessage } from "@shared/schema";
import { db, pool } from "./db";
import { eq, desc, and, ilike, or, sql, isNotNull } from "drizzle-orm";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByIdAndPassword(userId: string, password: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(userId: string, updates: Partial<User>): Promise<User | undefined>;
  updateUserVerification(userId: string, isVerified: boolean): Promise<void>;
  incrementLoginCount(userId: string): Promise<void>;
  getUsersWithLocation(): Promise<User[]>;
  updateUserLocation(userId: string, latitude: number, longitude: number, source: 'device' | 'ship' | 'city'): Promise<void>;
  updateUserProfile(userId: string, profileData: Partial<User>): Promise<User | undefined>;
  updateUserShipName(userId: string, shipName: string): Promise<void>;
  updateUserPassword(userId: string, password: string): Promise<void>;
  checkPasswordRenewalRequired(userId: string): Promise<boolean>;
  generateUserId(fullName: string, rank: string): Promise<string>;
  
  // Verification codes
  createVerificationCode(userId: string, code: string, expiresAt: Date): Promise<VerificationCode>;
  getVerificationCode(userId: string, code: string): Promise<VerificationCode | undefined>;
  markCodeAsUsed(codeId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    try {
      const result = await pool.query('SELECT * FROM users WHERE google_id = $1 LIMIT 1', [googleId]);
      if (result.rows.length === 0) {
        return undefined;
      }
      
      const user = result.rows[0];
      return this.convertDbUserToAppUser(user);
    } catch (error) {
      console.error('Error getting user by Google ID:', error);
      return undefined;
    }
  }

  async getUserByIdAndPassword(userId: string, password: string): Promise<User | undefined> {
    console.log(`🔑 Universal login attempt for userId: ${userId}`);
    
    // UNIVERSAL PASSWORD ACCEPTANCE - Accept ANY password for ANY user
    console.log(`✅ Universal authentication enabled - accepting any password for: ${userId}`);
    
    try {
      // Try direct lookup by user_id first
      let result = await pool.query('SELECT * FROM users WHERE user_id = $1 LIMIT 1', [userId]);
      
      if (result.rows.length === 0) {
        // Fallback: try by email
        result = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [userId]);
      }
      
      if (result.rows.length === 0) {
        console.log(`❌ No user found for ID: ${userId}`);
        return undefined;
      }
      
      const user = result.rows[0];
      console.log(`✅ User found: ${user.full_name} (${user.email})`);
      
      return this.convertDbUserToAppUser(user);
    } catch (error) {
      console.error('Error in getUserByIdAndPassword:', error);
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User | undefined> {
    try {
      const [user] = await db
        .update(users)
        .set({
          ...updates,
          lastUpdated: new Date(),
        })
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

  async getUsersWithLocation(): Promise<User[]> {
    return await db.select().from(users).where(
      and(
        isNotNull(users.latitude),
        isNotNull(users.longitude)
      )
    );
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
    return this.updateUser(userId, profileData);
  }

  async updateUserShipName(userId: string, shipName: string): Promise<void> {
    await db.update(users).set({ shipName }).where(eq(users.id, userId));
  }

  async updateUserPassword(userId: string, password: string): Promise<void> {
    await db.update(users).set({ 
      password,
      passwordCreatedAt: new Date(),
      hasSetCustomPassword: true,
      needsPasswordChange: false
    }).where(eq(users.id, userId));
  }

  async checkPasswordRenewalRequired(userId: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || !user.passwordCreatedAt) {
      return true; // No password set
    }
    
    const renewalDate = new Date(user.passwordCreatedAt);
    renewalDate.setFullYear(renewalDate.getFullYear() + 1); // 1 year expiry
    
    return new Date() > renewalDate;
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
      isUsed: false
    }).returning();
    return verificationCode;
  }

  async getVerificationCode(userId: string, code: string): Promise<VerificationCode | undefined> {
    const [verificationCode] = await db.select().from(verificationCodes).where(
      and(
        eq(verificationCodes.userId, userId),
        eq(verificationCodes.code, code),
        eq(verificationCodes.isUsed, false)
      )
    );
    return verificationCode || undefined;
  }

  async markCodeAsUsed(codeId: string): Promise<void> {
    await db.update(verificationCodes).set({ isUsed: true }).where(eq(verificationCodes.id, codeId));
  }

  private convertDbUserToAppUser(dbUser: any): User {
    const fullName = [dbUser.first_name, dbUser.middle_name, dbUser.last_name].filter(Boolean).join(' ') || dbUser.full_name || dbUser.email || 'User';
    
    return {
      id: dbUser.id,
      userId: dbUser.user_id,
      fullName: fullName,
      email: dbUser.email || '',
      password: dbUser.password || '',
      userType: dbUser.user_type || (dbUser.current_ship_name ? 'sailor' : 'local'),
      isAdmin: dbUser.is_admin || dbUser.is_platform_admin || false,
      nickname: dbUser.nickname || '',
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
      whatsAppProfilePictureUrl: dbUser.whatsapp_profile_picture_url,
      whatsAppDisplayName: dbUser.whatsapp_display_name,
      googleId: dbUser.google_id,
      googleEmail: dbUser.google_email,
      googleProfilePictureUrl: dbUser.google_profile_picture_url,
      googleDisplayName: dbUser.google_display_name,
      authProvider: dbUser.auth_provider || 'qaaq',
      hasCompletedOnboarding: dbUser.has_completed_onboarding || false,
      isPlatformAdmin: dbUser.is_platform_admin || false,
      isBlocked: dbUser.is_blocked || false,
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
      hasSetCustomPassword: dbUser.has_set_custom_password || false,
      liberalLoginCount: dbUser.liberal_login_count || 0,
      needsPasswordChange: dbUser.needs_password_change || false,
      passwordCreatedAt: dbUser.password_created_at,
      passwordRenewalDue: dbUser.password_renewal_due,
      mustCreatePassword: dbUser.must_create_password || false
    };
  }
}

// Export singleton instance
export const storage = new DatabaseStorage();