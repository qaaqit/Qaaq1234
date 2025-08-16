import { users, userIdentities, posts, likes, verificationCodes, chatConnections, chatMessages, whatsappMessages, type User, type InsertUser, type UserIdentity, type InsertUserIdentity, type Post, type InsertPost, type VerificationCode, type Like, type ChatConnection, type ChatMessage, type InsertChatConnection, type InsertChatMessage, type WhatsappMessage, type InsertWhatsappMessage } from "@shared/schema";
import { db, pool } from "./db";
import { eq, desc, and, ilike, or, sql, isNotNull, not } from "drizzle-orm";

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
  getUserByWhatsApp(phoneNumber: string): Promise<User | undefined>;
  getUserByReplitId(replitId: string): Promise<User | undefined>;
  getUserByIdAndPassword(userId: string, password: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createGoogleUser(googleUserData: any): Promise<User>;
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
  
  // Verification codes
  createVerificationCode(userId: string, code: string, expiresAt: Date): Promise<VerificationCode>;
  getVerificationCode(userId: string, code: string): Promise<VerificationCode | undefined>;
  markCodeAsUsed(codeId: string): Promise<void>;
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
      
      // Generate user data with defaults
      const userToCreate = {
        fullName: userData.fullName || 'Maritime User',
        email: userData.email || null,
        userType: userData.userType || 'sailor',
        primaryAuthProvider: identity.provider,
        authProviders: [identity.provider],
        isVerified: identity.isVerified || false,
        ...userData
      } as InsertUser;
      
      // Create user
      const [user] = await db.insert(users).values(userToCreate).returning();
      
      // Create identity
      await db.insert(userIdentities).values({
        userId: user.id,
        isPrimary: true,
        ...identity
      });
      
      console.log(`✅ Created user: ${user.fullName} (${user.id})`);
      return this.convertDbUserToAppUser(user);
    } catch (error) {
      console.error('Error creating user with identity:', error);
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
        }
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
        setClause.push(`current_lastShip = $${paramCount++}`);
        values.push(profileData.currentLastShip);
      }
      if (profileData.currentShipIMO !== undefined) {
        setClause.push(`current_ship_imo = $${paramCount++}`);
        values.push(profileData.currentShipIMO);
      }
      if (profileData.city !== undefined) {
        setClause.push(`city = $${paramCount++}`);
        values.push(profileData.city);
      }
      if (profileData.country !== undefined) {
        setClause.push(`country = $${paramCount++}`);
        values.push(profileData.country);
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
      needsPasswordChange: dbUser.needs_password_change || false,
      passwordCreatedAt: dbUser.password_created_at,
      passwordRenewalDue: dbUser.password_renewal_due,
      mustCreatePassword: dbUser.must_create_password || false,
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
            connection_id,
            MAX(created_at) as latest_message_at
          FROM chat_messages 
          GROUP BY connection_id
        ) latest_msg ON cc.id = latest_msg.connection_id
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
        content: row.content,
        messageType: 'text',
        sentAt: row.created_at,
        isRead: row.is_read || false,
        isDelivered: row.is_delivered || false,
        deliveredAt: row.delivered_at,
        readAt: row.read_at
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
        content: row.content,
        messageType: 'text',
        sentAt: row.created_at,
        isRead: row.is_read || false,
        isDelivered: row.is_delivered || false,
        deliveredAt: row.delivered_at,
        readAt: row.read_at
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
      
      // Create new identity link
      const [linkedIdentity] = await db.insert(userIdentities).values({
        userId,
        ...identity
      }).returning();
      
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
    throw new Error('getPosts method not yet implemented');
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
}

// Export singleton instance
export const storage = new DatabaseStorage();