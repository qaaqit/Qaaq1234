import { users, posts, likes, verificationCodes, type User, type InsertUser, type Post, type InsertPost, type VerificationCode, type Like } from "@shared/schema";
import { db, pool } from "./db";
import { eq, desc, and, ilike, or, sql, isNotNull } from "drizzle-orm";
import { testDatabaseConnection } from "./test-db";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByIdAndPassword(userId: string, password: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserVerification(userId: string, isVerified: boolean): Promise<void>;
  incrementLoginCount(userId: string): Promise<void>;
  getUsersWithLocation(): Promise<User[]>;
  
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
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    try {
      // Use direct pool query to avoid column mapping issues
      const result = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
      
      if (result.rows.length === 0) return undefined;
      
      const user = result.rows[0];
      return {
        id: user.id,
        fullName: user.first_name || user.email || 'Maritime User',
        email: user.email || '',
        password: '',
        userType: 'sailor',
        nickname: user.nickname || '',
        rank: user.maritime_rank || '',
        shipName: user.ship_name || '',
        imoNumber: user.imo_number || '',
        port: user.port || '',
        visitWindow: user.visit_window || '',
        city: user.city || '',
        country: user.country || '',
        latitude: user.current_latitude || 0,
        longitude: user.current_longitude || 0,
        isVerified: true,
        loginCount: 1,
        lastLogin: new Date(),
        createdAt: new Date(),
      } as User;
    } catch (error) {
      console.error('Get user error:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByIdAndPassword(userId: string, password: string): Promise<User | undefined> {
    // Simple dummy password check for now
    if (password !== "1234koihai") {
      return undefined;
    }

    try {
      console.log('Starting authentication for:', userId);
      
      // Run database test first
      await testDatabaseConnection();
      
      // Try simplest possible query
      console.log('Attempting basic user lookup...');
      const result = await pool.query('SELECT id, email FROM users WHERE email = $1 LIMIT 1', [userId]);
      
      if (result.rows.length === 0) {
        console.log('No user found for email:', userId);
        // Try phone lookup in email field (since phone numbers might be stored there)
        const phoneResult = await pool.query('SELECT id, email FROM users WHERE email LIKE $1 LIMIT 1', [`%${userId}%`]);
        if (phoneResult.rows.length === 0) {
          return undefined;
        }
        console.log('Found user by phone pattern');
        const user = phoneResult.rows[0];
        return {
          id: user.id,
          fullName: userId,
          email: user.email,
          password: '',
          userType: 'sailor',
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
      }
      
      const user = result.rows[0];
      console.log('Found user by email:', user.email);
      
      return {
        id: user.id,
        fullName: user.email,
        email: user.email,
        password: '',
        userType: 'sailor',
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
      console.error('Database query error:', error);
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
      // Use direct pool query with QAAQ schema
      const result = await pool.query(`
        SELECT * FROM users 
        WHERE current_latitude IS NOT NULL 
        AND current_longitude IS NOT NULL 
        AND current_latitude != 0 
        AND current_longitude != 0
        LIMIT 100
      `);
      
      return result.rows.map(user => ({
        id: user.id,
        fullName: user.first_name || user.email || 'Maritime User',
        email: user.email || '',
        password: '',
        userType: 'sailor',
        nickname: user.nickname || '',
        rank: user.maritime_rank || '',
        shipName: user.ship_name || '',
        imoNumber: user.imo_number || '',
        port: user.port || '',
        visitWindow: user.visit_window || '',
        city: user.city || '',
        country: user.country || '',
        latitude: parseFloat(user.current_latitude) || 0,
        longitude: parseFloat(user.current_longitude) || 0,
        isVerified: true,
        loginCount: 1,
        lastLogin: new Date(),
        createdAt: new Date(),
      } as User));
    } catch (error) {
      console.error('Get users with location error:', error);
      return [];
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
}

export const storage = new DatabaseStorage();
