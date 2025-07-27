import { users, posts, likes, verificationCodes, type User, type InsertUser, type Post, type InsertPost, type VerificationCode, type Like } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, ilike, or, sql, isNotNull } from "drizzle-orm";

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
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByIdAndPassword(userId: string, password: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      and(
        or(eq(users.id, userId), eq(users.fullName, userId), eq(users.email, userId)),
        eq(users.password, password)
      )
    );
    return user || undefined;
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
    await db
      .update(users)
      .set({ 
        loginCount: sql`${users.loginCount} + 1`,
        lastLogin: new Date()
      })
      .where(eq(users.id, userId));
  }

  async getUsersWithLocation(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(
        and(
          isNotNull(users.latitude),
          isNotNull(users.longitude)
        )
      );
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
    return await db
      .select()
      .from(posts)
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);
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
