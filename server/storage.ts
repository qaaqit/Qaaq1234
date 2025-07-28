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
        fullName: user.full_name || user.email || 'Maritime User',
        email: user.email || '',
        password: '',
        userType: user.ship_name ? 'sailor' : 'local',
        nickname: user.nickname || '',
        rank: user.rank || '',
        shipName: user.ship_name || '',
        imoNumber: user.imo_number || '',
        port: user.port || '',
        visitWindow: user.visit_window || '',
        city: user.city || '',
        country: user.country || '',
        latitude: parseFloat(user.latitude) || 0,
        longitude: parseFloat(user.longitude) || 0,
        isVerified: user.is_verified || true,
        loginCount: user.login_count || 1,
        lastLogin: user.last_login || new Date(),
        createdAt: user.created_at || new Date(),
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
      // Since the main QAAQ database doesn't have location data for the 621 users,
      // we'll use our sample maritime users to demonstrate the map functionality
      console.log('Using sample maritime users with location data for map demonstration');
      
      const sampleUsers = [
        {
          id: "sample-1",
          fullName: "James Miller",
          email: "captain.miller@qaaq.com",
          userType: "sailor" as const,
          rank: "Captain",
          shipName: "MV Singapore Star",
          city: "Singapore",
          country: "Singapore",
          latitude: 1.3521,
          longitude: 103.8198,
          port: "Singapore Port"
        },
        {
          id: "sample-2", 
          fullName: "Sarah Chen",
          email: "chief.chen@qaaq.com",
          userType: "sailor" as const,
          rank: "Chief Engineer",
          shipName: "MV Rotterdam Express",
          city: "Rotterdam",
          country: "Netherlands", 
          latitude: 51.9225,
          longitude: 4.47917,
          port: "Port of Rotterdam"
        },
        {
          id: "sample-3",
          fullName: "Ahmed Hassan", 
          email: "bosun.hassan@qaaq.com",
          userType: "sailor" as const,
          rank: "Bosun",
          shipName: "MV Dubai Pearl",
          city: "Dubai",
          country: "UAE",
          latitude: 25.2048,
          longitude: 55.2708,
          port: "Jebel Ali Port"
        },
        {
          id: "sample-4",
          fullName: "Li Wei",
          email: "captain.li@qaaq.com", 
          userType: "sailor" as const,
          rank: "Captain",
          shipName: "MV Shanghai Dragon",
          city: "Shanghai",
          country: "China",
          latitude: 31.2304,
          longitude: 121.4737,
          port: "Port of Shanghai"
        },
        {
          id: "sample-5",
          fullName: "Maria Santos",
          email: "maria.santos@local.com",
          userType: "local" as const,
          rank: "",
          shipName: "",
          city: "Santos",
          country: "Brazil",
          latitude: -23.9618,
          longitude: -46.3322,
          port: "Port of Santos"
        },
        {
          id: "sample-6",
          fullName: "Rajesh Patel",
          email: "engineer.patel@qaaq.com",
          userType: "sailor" as const,
          rank: "Second Engineer", 
          shipName: "MV Mumbai Queen",
          city: "Mumbai",
          country: "India",
          latitude: 19.0760,
          longitude: 72.8777,
          port: "JNPT Mumbai"
        },
        {
          id: "sample-7",
          fullName: "Hans Olsen",
          email: "chief.olsen@qaaq.com",
          userType: "sailor" as const,
          rank: "Chief Officer",
          shipName: "MV Hamburg Trader", 
          city: "Hamburg",
          country: "Germany",
          latitude: 53.5511,
          longitude: 9.9937,
          port: "Port of Hamburg"
        },
        {
          id: "sample-8",
          fullName: "Yuki Tanaka",
          email: "yuki.guide@local.com",
          userType: "local" as const,
          rank: "",
          shipName: "",
          city: "Yokohama", 
          country: "Japan",
          latitude: 35.4437,
          longitude: 139.6380,
          port: "Port of Yokohama"
        }
      ];

      const mappedUsers = sampleUsers.map(user => ({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        password: '',
        userType: user.userType,
        nickname: user.fullName.split(' ')[0],
        rank: user.rank,
        shipName: user.shipName,
        imoNumber: '',
        port: user.port,
        visitWindow: 'Next 7 days',
        city: user.city,
        country: user.country,
        latitude: user.latitude,
        longitude: user.longitude,
        isVerified: true,
        loginCount: 1,
        lastLogin: new Date(),
        createdAt: new Date(),
      } as User));

      console.log(`Returning ${mappedUsers.length} sample maritime users with coordinates`);
      return mappedUsers;
    } catch (error) {
      console.error('Get users with location error:', error);
      return [];
    }
  }

  private getCityCoordinates(city: string, country: string): { lat: number; lng: number } {
    // Major maritime cities and ports coordinates
    const cityCoords: { [key: string]: { lat: number; lng: number } } = {
      // India
      'mumbai': { lat: 19.0760, lng: 72.8777 },
      'chennai': { lat: 13.0827, lng: 80.2707 },
      'kolkata': { lat: 22.5726, lng: 88.3639 },
      'kochi': { lat: 9.9312, lng: 76.2673 },
      'delhi': { lat: 28.6139, lng: 77.2090 },
      'bangalore': { lat: 12.9716, lng: 77.5946 },
      'hyderabad': { lat: 17.3850, lng: 78.4867 },
      'pune': { lat: 18.5204, lng: 73.8567 },
      'ahmedabad': { lat: 23.0225, lng: 72.5714 },
      
      // UAE
      'dubai': { lat: 25.2048, lng: 55.2708 },
      'abu dhabi': { lat: 24.4539, lng: 54.3773 },
      'sharjah': { lat: 25.3463, lng: 55.4209 },
      
      // Singapore
      'singapore': { lat: 1.3521, lng: 103.8198 },
      
      // Major ports worldwide
      'hamburg': { lat: 53.5511, lng: 9.9937 },
      'rotterdam': { lat: 51.9225, lng: 4.4792 },
      'antwerp': { lat: 51.2194, lng: 4.4025 },
      'shanghai': { lat: 31.2304, lng: 121.4737 },
      'hong kong': { lat: 22.3193, lng: 114.1694 },
      'los angeles': { lat: 34.0522, lng: -118.2437 },
      'long beach': { lat: 33.7701, lng: -118.1937 },
      'new york': { lat: 40.7128, lng: -74.0060 },
      'london': { lat: 51.5074, lng: -0.1278 },
      'tokyo': { lat: 35.6762, lng: 139.6503 },
      'osaka': { lat: 34.6937, lng: 135.5023 },
      'busan': { lat: 35.1796, lng: 129.0756 },
    };
    
    const searchKey = city.toLowerCase();
    
    // Check direct city match first
    if (cityCoords[searchKey]) {
      return cityCoords[searchKey];
    }
    
    // Check if city contains known port names
    for (const [knownCity, coords] of Object.entries(cityCoords)) {
      if (searchKey.includes(knownCity) || knownCity.includes(searchKey)) {
        return coords;
      }
    }
    
    // Default coordinates for unknown cities (approximate center of maritime activity)
    const countryDefaults: { [key: string]: { lat: number; lng: number } } = {
      'india': { lat: 20.5937, lng: 78.9629 },
      'uae': { lat: 24.4539, lng: 54.3773 },
      'singapore': { lat: 1.3521, lng: 103.8198 },
      'germany': { lat: 53.5511, lng: 9.9937 },
      'netherlands': { lat: 51.9225, lng: 4.4792 },
      'china': { lat: 31.2304, lng: 121.4737 },
      'usa': { lat: 34.0522, lng: -118.2437 },
      'uk': { lat: 51.5074, lng: -0.1278 },
      'japan': { lat: 35.6762, lng: 139.6503 },
      'south korea': { lat: 35.1796, lng: 129.0756 },
    };
    
    return countryDefaults[country.toLowerCase()] || { lat: 0, lng: 0 };
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
