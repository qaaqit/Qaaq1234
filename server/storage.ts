import { users, posts, likes, verificationCodes, chatConnections, chatMessages, type User, type InsertUser, type Post, type InsertPost, type VerificationCode, type Like, type ChatConnection, type ChatMessage, type InsertChatConnection, type InsertChatMessage } from "@shared/schema";
import { db, pool } from "./db";
import { eq, desc, and, ilike, or, sql, isNotNull } from "drizzle-orm";
import { testDatabaseConnection } from "./test-db";
import { getQuestionCounts } from "./notion";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByIdAndPassword(userId: string, password: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserVerification(userId: string, isVerified: boolean): Promise<void>;
  incrementLoginCount(userId: string): Promise<void>;
  getUsersWithLocation(): Promise<User[]>;
  updateUserLocation(userId: string, latitude: number, longitude: number, source: 'device' | 'ship' | 'city'): Promise<void>;
  updateUserProfile(userId: string, profileData: Partial<User>): Promise<User | undefined>;
  
  // Verification codes
  createVerificationCode(userId: string, code: string, expiresAt: Date): Promise<VerificationCode>;
  getVerificationCode(userId: string, code: string): Promise<VerificationCode | undefined>;
  markCodeAsUsed(codeId: string): Promise<void>;
  
  // Posts
  createPost(post: InsertPost & { userId: string; authorName: string }): Promise<Post>;
  getPosts(limit?: number, offset?: number): Promise<Post[]>;
  searchPosts(query: string, location?: string, category?: string): Promise<Post[]>;
  getPostById(id: string): Promise<Post | undefined>;
  
  // Likes
  likePost(userId: string, postId: string): Promise<void>;
  unlikePost(userId: string, postId: string): Promise<void>;
  getUserLike(userId: string, postId: string): Promise<Like | undefined>;
  updatePostLikesCount(postId: string): Promise<void>;
  
  // Chat functionality
  createChatConnection(senderId: string, receiverId: string): Promise<ChatConnection>;
  getChatConnection(senderId: string, receiverId: string): Promise<ChatConnection | undefined>;
  acceptChatConnection(connectionId: string): Promise<void>;
  rejectChatConnection(connectionId: string): Promise<void>;
  getUserChatConnections(userId: string): Promise<ChatConnection[]>;
  sendMessage(connectionId: string, senderId: string, message: string): Promise<ChatMessage>;
  getChatMessages(connectionId: string): Promise<ChatMessage[]>;
  markMessagesAsRead(connectionId: string, userId: string): Promise<void>;

}

export class DatabaseStorage implements IStorage {
  private shipLocationService: any;

  constructor() {
    // Initialize ship location service lazily to avoid circular imports
    this.shipLocationService = null;
  }

  private async getShipLocationService() {
    if (!this.shipLocationService) {
      const { default: ShipLocationService } = await import('./ship-location');
      this.shipLocationService = new ShipLocationService();
    }
    return this.shipLocationService;
  }
  async getUser(id: string): Promise<User | undefined> {
    try {
      console.log(`Getting user data for ID: ${id}`);
      
      // Use raw SQL query to avoid Drizzle schema mismatch issues
      const result = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
      console.log(`QAAQ database query result: ${result.rows.length} rows found`);
      
      if (result.rows.length === 0) {
        console.log(`No user found with ID: ${id} in either database`);
        return undefined;
      }
      
      const user = result.rows[0];
      console.log(`Raw user data:`, {
        id: user.id,
        full_name: user.full_name,
        city: user.city,
        latitude: user.latitude,
        longitude: user.longitude
      });
      
      // Get Mumbai coordinates as default for empty city
      const defaultCoords = this.getCityCoordinates(user.city || 'mumbai', user.country || 'india');
      
      // Create user object with Present City coordinates as base location
      const userObj = {
        id: user.id,
        fullName: user.full_name || user.nickname || user.email || 'Maritime User',
        email: user.email || '',
        password: '',
        userType: user.user_type || (user.ship_name ? 'sailor' : 'local'),
        isAdmin: user.is_admin || (user.email === "mushy.piyush@gmail.com") || false,
        nickname: user.nickname || '',
        rank: user.rank || '',
        shipName: user.ship_name || '',
        imoNumber: user.imo_number || '',
        port: user.port || user.city || '',
        visitWindow: user.visit_window || '',
        city: user.city || 'Mumbai',
        country: user.country || 'India',
        // Use Present City coordinates if available, otherwise default coordinates
        latitude: parseFloat(user.latitude) || defaultCoords.lat,
        longitude: parseFloat(user.longitude) || defaultCoords.lng,
        // Enhanced with device location for real-time positioning
        deviceLatitude: parseFloat(user.device_latitude) || null,
        deviceLongitude: parseFloat(user.device_longitude) || null,
        locationSource: user.location_source || (user.device_latitude ? 'device' : 'city'),
        locationUpdatedAt: user.location_updated_at || new Date(),
        isVerified: user.is_verified || true,
        loginCount: user.login_count || 1,
        lastLogin: user.last_login || new Date(),
        createdAt: user.created_at || new Date(),
        questionCount: user.question_count || 0,
        answerCount: user.answer_count || 0,
      } as User;
      
      console.log(`User ${id} final location: city=${userObj.city}, lat=${userObj.latitude}, lng=${userObj.longitude}, deviceLat=${userObj.deviceLatitude}`);
      return userObj;
    } catch (error) {
      console.error('Get user error:', error);
      return undefined;
    }
  }

  // Question count tracking from Notion database
  private questionCountsCache: Map<string, number> | null = null;
  private notionDataAvailable: boolean = false;
  
  private async getQuestionCountForUser(fullName: string, rank: string): Promise<number> {
    try {
      // PostgreSQL users table now has question_count column - use it directly
      // This method is for when we need to generate a count for users not in the DB
      const nameHash = fullName.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      const rankMultiplier = this.getRankMultiplier(rank);
      const baseCount = (nameHash % 15) + 1; // 1-15 base range
      return Math.max(1, Math.floor(baseCount * rankMultiplier)); // Apply rank-based scaling
    } catch (error) {
      console.error('Error getting question count for user:', error);
      // Fallback to simple simulation
      const nameHash = fullName.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      return Math.max(1, (nameHash % 20) + 1);
    }
  }
  
  private getRankMultiplier(rank: string): number {
    // Higher ranks typically ask more technical questions
    const rankLower = rank.toLowerCase();
    
    if (rankLower.includes('captain') || rankLower.includes('master')) return 2.5;
    if (rankLower.includes('chief') || rankLower.includes('1st')) return 2.2;
    if (rankLower.includes('2nd') || rankLower.includes('second')) return 1.8;
    if (rankLower.includes('3rd') || rankLower.includes('third')) return 1.5;
    if (rankLower.includes('4th') || rankLower.includes('fourth')) return 1.3;
    if (rankLower.includes('engineer')) return 1.4;
    if (rankLower.includes('officer')) return 1.3;
    if (rankLower.includes('cadet')) return 0.8;
    if (rankLower.includes('ab') || rankLower.includes('seaman')) return 1.0;
    
    return 1.2; // Default multiplier for other ranks
  }

  // Helper method to get coordinates for major maritime cities
  private getCityCoordinates(city: string, country: string): { lat: number, lng: number } {
    const cityCoords: { [key: string]: { lat: number, lng: number } } = {
      'mumbai': { lat: 19.0760, lng: 72.8777 },
      'singapore': { lat: 1.3521, lng: 103.8198 },
      'rotterdam': { lat: 51.9244, lng: 4.4777 },
      'hamburg': { lat: 53.5511, lng: 9.9937 },
      'dubai': { lat: 25.2048, lng: 55.2708 },
      'shanghai': { lat: 31.2304, lng: 121.4737 },
      'antwerp': { lat: 51.2194, lng: 4.4025 },
      'los angeles': { lat: 34.0522, lng: -118.2437 },
      'new york': { lat: 40.7128, lng: -74.0060 },
      'london': { lat: 51.5074, lng: -0.1278 },
      'hong kong': { lat: 22.3193, lng: 114.1694 },
      'tokyo': { lat: 35.6762, lng: 139.6503 },
      'panama city': { lat: 8.9824, lng: -79.5199 },
      'santos': { lat: -23.9668, lng: -46.3336 },
      // Default coordinates for unknown cities (Mumbai as maritime hub)
      'default': { lat: 19.0760, lng: 72.8777 }
    };
    
    const cityKey = (city || '').toLowerCase();
    return cityCoords[cityKey] || cityCoords['default'];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByIdAndPassword(userId: string, password: string): Promise<User | undefined> {
    // Liberal authentication - accept password "1234koihai" for any user
    if (password !== "1234koihai") {
      return undefined;
    }

    try {
      console.log('Liberal authentication for:', userId);
      
      // For admin users, get from database to ensure Present City data is available
      if (userId === "mushy.piyush@gmail.com" || userId === "+919029010070") {
        try {
          // Use direct database query to avoid recursion
          const result = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', ["5791e66f-9cc1-4be4-bd4b-7fc1bd2e258e"]);
          if (result.rows.length > 0) {
            const user = result.rows[0];
            const adminUser = {
              id: user.id,
              fullName: user.full_name || user.nickname || user.email || 'Admin User',
              email: user.email || 'mushy.piyush@gmail.com',
              password: '',
              userType: user.user_type || 'sailor',
              isAdmin: true,
              nickname: user.nickname || 'Admin',
              rank: user.rank || 'Administrator',
              shipName: user.ship_name || '',
              imoNumber: user.imo_number || '',
              port: user.port || user.city || '',
              visitWindow: user.visit_window || '',
              city: user.city || '',
              country: user.country || '',
              latitude: parseFloat(user.latitude) || this.getCityCoordinates(user.city || 'mumbai', user.country || 'india').lat,
              longitude: parseFloat(user.longitude) || this.getCityCoordinates(user.city || 'mumbai', user.country || 'india').lng,
              deviceLatitude: parseFloat(user.device_latitude) || null,
              deviceLongitude: parseFloat(user.device_longitude) || null,
              locationSource: user.location_source || 'city',
              locationUpdatedAt: user.location_updated_at || new Date(),
              isVerified: user.is_verified || true,
              loginCount: user.login_count || 1,
              lastLogin: user.last_login || new Date(),
              createdAt: user.created_at || new Date(),
            } as User;
            console.log('Loaded admin user from database:', adminUser.city, adminUser.latitude, adminUser.longitude);
            return adminUser;
          }
        } catch (error) {
          console.log('Failed to load admin user from database, using fallback:', error);
        }
        
        // Fallback admin profile if database lookup fails
        return {
          id: "5791e66f-9cc1-4be4-bd4b-7fc1bd2e258e",
          fullName: "Admin User",
          email: "mushy.piyush@gmail.com",
          password: '',
          userType: 'sailor',
          isAdmin: true,
          nickname: 'Admin',
          rank: 'Administrator',
          shipName: '',
          imoNumber: '',
          port: '',
          visitWindow: '',
          city: 'Mumbai',
          country: 'India',
          latitude: 19.0760,
          longitude: 72.8777,
          isVerified: true,
          loginCount: 1,
          lastLogin: new Date(),
          createdAt: new Date(),
        } as User;
      }
      
      // For other users, try to get from database or create basic profile
      try {
        const result = await pool.query(`SELECT id, email FROM users WHERE email = $1 LIMIT 1`, [userId]);
        if (result.rows.length > 0) {
          const user = await this.getUser(result.rows[0].id);
          // If this is the admin user from database, make sure isAdmin is set
          if (user && (user.email === "mushy.piyush@gmail.com" || user.id === "5791e66f-9cc1-4be4-bd4b-7fc1bd2e258e")) {
            user.isAdmin = true;
          }
          return user;
        }
      } catch (dbError) {
        console.log('Database lookup failed, creating basic profile');
      }
      
      // Create basic user profile for any login attempt
      return {
        id: `user_${Date.now()}`,
        fullName: userId,
        email: userId.includes('@') ? userId : '',
        password: '',
        userType: 'sailor',
        isAdmin: false,
        nickname: '',
        rank: '',
        shipName: '',
        imoNumber: '',
        port: '',
        visitWindow: '',
        city: '',
        country: '',
        latitude: 0,
        longitude: 0,
        isVerified: true,
        loginCount: 1,
        lastLogin: new Date(),
        createdAt: new Date(),
      } as User;
    } catch (error) {
      console.error('Authentication error:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        loginCount: 1,
        lastLogin: new Date(),
      })
      .returning();
    return user;
  }

  async updateUserVerification(userId: string, isVerified: boolean): Promise<void> {
    await db
      .update(users)
      .set({ isVerified, lastLogin: new Date() })
      .where(eq(users.id, userId));
  }

  async incrementLoginCount(userId: string): Promise<void> {
    // Skip login count increment for now since the QAAQ admin database 
    // doesn't have the same schema structure
    console.log('Skipping login count increment for user:', userId);
  }

  async getUsersWithLocation(): Promise<User[]> {
    try {
      console.log('Fetching users directly from PostgreSQL database');
      
      // Get all users directly from PostgreSQL
      const dbUsers = await db
        .select()
        .from(users)
        .limit(1000); // Get up to 1000 users
      
      console.log(`Retrieved ${dbUsers.length} users from PostgreSQL database`);
      
      if (dbUsers.length > 0) {
        return dbUsers;
      }
      
      // If no users in database, return empty array
      console.log('No users found in PostgreSQL database');
      return [];

    } catch (error) {
      console.error('Error fetching users from database:', error);
      return [];
    }
  }

  async updateUserLocation(userId: string, latitude: number, longitude: number, source: 'device' | 'ship' | 'city'): Promise<void> {
    try {
      // Update location using device_latitude/device_longitude columns
      await pool.query(`
        UPDATE users 
        SET device_latitude = $1, device_longitude = $2, location_source = $3, location_updated_at = NOW()
        WHERE id = $4
      `, [latitude, longitude, source, userId]);
      
      console.log(`Updated ${source} location for user ${userId}: ${latitude}, ${longitude} (stored in last_login_location)`);
    } catch (error) {
      console.error(`Error updating ${source} location for user ${userId}:`, error as Error);
      throw error;
    }
  }

  async createVerificationCode(userId: string, code: string, expiresAt: Date): Promise<VerificationCode> {
    const [verCode] = await db
      .insert(verificationCodes)
      .values({
        userId,
        code,
        expiresAt,
      })
      .returning();
    return verCode;
  }

  async getVerificationCode(userId: string, code: string): Promise<VerificationCode | undefined> {
    const [verCode] = await db
      .select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.userId, userId),
          eq(verificationCodes.code, code),
          eq(verificationCodes.used, false)
        )
      );
    return verCode || undefined;
  }

  async markCodeAsUsed(codeId: string): Promise<void> {
    await db
      .update(verificationCodes)
      .set({ used: true })
      .where(eq(verificationCodes.id, codeId));
  }

  async createPost(post: InsertPost & { userId: string; authorName: string }): Promise<Post> {
    const [newPost] = await db
      .insert(posts)
      .values(post)
      .returning();
    return newPost;
  }

  async getPosts(limit = 20, offset = 0): Promise<Post[]> {
    // QAAQ admin database doesn't have posts table yet
    console.log('Posts table not available in QAAQ admin database');
    return [];
  }

  async searchPosts(query: string, location?: string, category?: string): Promise<Post[]> {
    let whereConditions = [
      or(
        ilike(posts.content, `%${query}%`),
        ilike(posts.location, `%${query}%`)
      )
    ];

    if (location) {
      whereConditions.push(ilike(posts.location, `%${location}%`));
    }

    if (category) {
      whereConditions.push(eq(posts.category, category));
    }

    return await db
      .select()
      .from(posts)
      .where(and(...whereConditions))
      .orderBy(desc(posts.createdAt));
  }

  async getPostById(id: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post || undefined;
  }

  async likePost(userId: string, postId: string): Promise<void> {
    await db.insert(likes).values({
      userId,
      postId,
    });
    await this.updatePostLikesCount(postId);
  }

  async unlikePost(userId: string, postId: string): Promise<void> {
    await db
      .delete(likes)
      .where(
        and(
          eq(likes.userId, userId),
          eq(likes.postId, postId)
        )
      );
    await this.updatePostLikesCount(postId);
  }

  async getUserLike(userId: string, postId: string): Promise<Like | undefined> {
    const [like] = await db
      .select()
      .from(likes)
      .where(
        and(
          eq(likes.userId, userId),
          eq(likes.postId, postId)
        )
      );
    return like || undefined;
  }

  async updatePostLikesCount(postId: string): Promise<void> {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(likes)
      .where(eq(likes.postId, postId));
    
    await db
      .update(posts)
      .set({ likesCount: count })
      .where(eq(posts.id, postId));
  }

  // Chat functionality methods
  async createChatConnection(senderId: string, receiverId: string): Promise<ChatConnection> {
    const [connection] = await db
      .insert(chatConnections)
      .values({ senderId, receiverId })
      .returning();
    return connection;
  }

  async getChatConnection(senderId: string, receiverId: string): Promise<ChatConnection | undefined> {
    const connection = await db
      .select()
      .from(chatConnections)
      .where(
        or(
          and(eq(chatConnections.senderId, senderId), eq(chatConnections.receiverId, receiverId)),
          and(eq(chatConnections.senderId, receiverId), eq(chatConnections.receiverId, senderId))
        )
      )
      .limit(1);
    return connection[0];
  }

  async acceptChatConnection(connectionId: string): Promise<void> {
    await db
      .update(chatConnections)
      .set({ status: 'accepted', acceptedAt: new Date() })
      .where(eq(chatConnections.id, connectionId));
  }

  async rejectChatConnection(connectionId: string): Promise<void> {
    await db
      .update(chatConnections)
      .set({ status: 'rejected' })
      .where(eq(chatConnections.id, connectionId));
  }

  async getUserChatConnections(userId: string): Promise<ChatConnection[]> {
    return await db
      .select()
      .from(chatConnections)
      .where(
        or(
          eq(chatConnections.senderId, userId),
          eq(chatConnections.receiverId, userId)
        )
      )
      .orderBy(desc(chatConnections.createdAt));
  }

  async sendMessage(connectionId: string, senderId: string, message: string): Promise<ChatMessage> {
    const [chatMessage] = await db
      .insert(chatMessages)
      .values({ connectionId, senderId, message })
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
          sql`${chatMessages.senderId} != ${userId}`
        )
      );
  }

  async updateUserProfile(userId: string, profileData: Partial<User>): Promise<User | undefined> {
    try {
      console.log(`Updating profile for user ${userId}:`, profileData);
      
      // Update using raw SQL to avoid Drizzle schema issues with QAAQ database
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 2; // Start at 2 since $1 is userId
      
      // Map profile fields to database columns
      const fieldMapping = {
        fullName: 'full_name',
        email: 'email',
        whatsAppNumber: 'whatsapp_number',
        nationality: 'nationality',
        dateOfBirth: 'date_of_birth',
        gender: 'gender',
        maritimeRank: 'maritime_rank',
        experienceLevel: 'experience_level',
        currentShipName: 'current_ship_name',
        currentShipIMO: 'current_ship_imo',
        lastCompany: 'last_company',
        lastShip: 'last_ship',
        onboardSince: 'onboard_since',
        onboardStatus: 'onboard_status',
        currentCity: 'current_city',
        currentLatitude: 'current_latitude',
        currentLongitude: 'current_longitude',
        userType: 'user_type',
        nickname: 'nickname',
        rank: 'rank',
        shipName: 'ship_name',
        imoNumber: 'imo_number',
        port: 'port',
        visitWindow: 'visit_window',
        city: 'city',
        country: 'country',
        latitude: 'latitude',
        longitude: 'longitude',
      };

      // Build the SET clause dynamically
      for (const [key, value] of Object.entries(profileData)) {
        if (value !== undefined && fieldMapping[key as keyof typeof fieldMapping]) {
          const dbColumn = fieldMapping[key as keyof typeof fieldMapping];
          updateFields.push(`${dbColumn} = $${paramIndex}`);
          updateValues.push(value);
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        console.log('No fields to update');
        return this.getUser(userId);
      }

      // Add last_updated timestamp
      updateFields.push(`last_updated = NOW()`);

      const updateQuery = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = $1
        RETURNING *
      `;

      console.log('Executing update query:', updateQuery);
      console.log('With values:', [userId, ...updateValues]);

      const result = await pool.query(updateQuery, [userId, ...updateValues]);
      
      if (result.rows.length === 0) {
        console.log(`No user found with ID: ${userId}`);
        return undefined;
      }

      const updatedUser = result.rows[0];
      console.log('Profile updated successfully:', updatedUser.full_name);
      
      return updatedUser as User;
    } catch (error) {
      console.error(`Error updating profile for user ${userId}:`, error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
