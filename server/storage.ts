import { users, posts, likes, verificationCodes, chatConnections, chatMessages, whatsappMessages, type User, type InsertUser, type Post, type InsertPost, type VerificationCode, type Like, type ChatConnection, type ChatMessage, type InsertChatConnection, type InsertChatMessage, type WhatsappMessage, type InsertWhatsappMessage } from "@shared/schema";
import { db, pool } from "./db";
import { eq, desc, and, ilike, or, sql, isNotNull, not } from "drizzle-orm";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByIdAndPassword(userId: string, password: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createGoogleUser(googleUserData: any): Promise<User>;
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
  
  // Verification codes
  createVerificationCode(userId: string, code: string, expiresAt: Date): Promise<VerificationCode>;
  getVerificationCode(userId: string, code: string): Promise<VerificationCode | undefined>;
  markCodeAsUsed(codeId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    } catch (error) {
      // Fallback to direct SQL query to avoid column mismatch issues
      console.log('Drizzle query failed, trying direct SQL:', error);
      try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
        if (result.rows.length === 0) return undefined;
        return this.convertDbUserToAppUser(result.rows[0]);
      } catch (sqlError) {
        console.error('SQL fallback failed:', sqlError);
        return undefined;
      }
    }
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

  async incrementUserQuestionCount(userId: string): Promise<void> {
    await db.update(users).set({ 
      questionCount: sql`${users.questionCount} + 1`
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
      userType: dbUser.onboard_status === 'ONBOARD' || dbUser.current_ship_name || dbUser.ship_name ? 'Onboard' : 'On land',
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
      mustCreatePassword: dbUser.must_create_password || false,
      // Subscription fields
      isPremium: dbUser.is_premium || false,
      premiumExpiresAt: dbUser.premium_expires_at,
      subscriptionId: dbUser.subscription_id,
      subscriptionType: dbUser.subscription_type,
      subscriptionStatus: dbUser.subscription_status || 'inactive',
      razorpayCustomerId: dbUser.razorpay_customer_id,
      paymentMethod: dbUser.payment_method
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
      const connections = await db
        .select()
        .from(chatConnections)
        .where(
          or(
            eq(chatConnections.senderId, userId),
            eq(chatConnections.receiverId, userId)
          )
        )
        .orderBy(sql`${chatConnections.createdAt} DESC`);
      return connections;
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

  async sendMessage(connectionId: string, senderId: string, message: string): Promise<ChatMessage> {
    const [chatMessage] = await db
      .insert(chatMessages)
      .values({
        connectionId,
        senderId,
        message,
        isRead: false,
      })
      .returning();
    return chatMessage;
  }

  async getChatMessages(connectionId: string): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.connectionId, connectionId))
      .orderBy(chatMessages.createdAt);
  }

  async markMessagesAsRead(connectionId: string, userId: string): Promise<void> {
    await db
      .update(chatMessages)
      .set({ isRead: true })
      .where(
        and(
          eq(chatMessages.connectionId, connectionId),
          not(eq(chatMessages.senderId, userId))
        )
      );
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
}

// Export singleton instance
export const storage = new DatabaseStorage();