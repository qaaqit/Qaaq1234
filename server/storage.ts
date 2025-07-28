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
      // Use real QAAQ users with location data from current_city and permanent_city fields
      console.log('Fetching QAAQ users with location data for map and WhatsApp bot');
      
      // Get QAAQ users with location data including real ship information  
      const result = await pool.query(`
        SELECT id, full_name, nickname, email, maritime_rank, last_ship, whatsapp_number,
               current_city, current_country, permanent_city, permanent_country, 
               city, last_login_at, created_at,
               current_ship_imo, current_ship_name, imo_number, vessel_name, ship_name
        FROM users 
        WHERE (current_city IS NOT NULL AND current_city != '') 
           OR (permanent_city IS NOT NULL AND permanent_city != '')
           OR (city IS NOT NULL AND city != '')
        ORDER BY last_login_at DESC NULLS LAST
        LIMIT 100
      `);
      
      console.log(`Found ${result.rows.length} QAAQ users with location data`);
      
      // Get ship location service for IMO-based positioning
      const shipLocationService = await this.getShipLocationService();
      
      // Collect sailors with ship data (IMO numbers, current ships, or vessel names)
      const sailorsWithShips = result.rows
        .filter(user => 
          (user.current_ship_imo && user.current_ship_imo.trim() !== '') ||
          (user.imo_number && user.imo_number.trim() !== '') ||
          (user.current_ship_name && user.current_ship_name.trim() !== '') ||
          (user.vessel_name && user.vessel_name.trim() !== '') ||
          (user.ship_name && user.ship_name.trim() !== '') ||
          (user.last_ship && user.last_ship.trim() !== '')
        )
        .map(user => ({ 
          id: user.id, 
          imo: user.current_ship_imo || user.imo_number || '',
          shipName: user.current_ship_name || user.vessel_name || user.ship_name || user.last_ship || '',
          fullName: user.full_name || user.nickname || 'Maritime User'
        }));
      
      console.log(`Found ${sailorsWithShips.length} sailors with ship data for position tracking`);
      
      // Generate ship positions using IMO numbers when available, fallback to ship names
      const shipPositions = new Map();
      for (const sailor of sailorsWithShips) {
        let position = null;
        
        // Try IMO number first (most accurate)
        if (sailor.imo && sailor.imo.trim() !== '') {
          position = await shipLocationService.getShipPosition(sailor.imo);
          if (position) {
            console.log(`Found position via IMO ${sailor.imo} for ${sailor.fullName}`);
          }
        }
        
        // Fallback to ship name
        if (!position && sailor.shipName && sailor.shipName.trim() !== '') {
          position = await shipLocationService.getShipPosition(sailor.shipName);
          if (position) {
            console.log(`Found position via ship name ${sailor.shipName} for ${sailor.fullName}`);
          }
        }
        
        if (position) {
          shipPositions.set(sailor.id, position);
        }
      }
      
      const mappedUsers = result.rows.map(user => {
        let latitude = 0;
        let longitude = 0;
        let city = '';
        let country = '';
        let locationSource = 'city'; // 'city' or 'ship'
        
        // First, check if this is a sailor with ship position available
        const hasShipData = user.current_ship_imo || user.imo_number || user.current_ship_name || user.vessel_name || user.ship_name || user.last_ship;
        if (hasShipData) {
          const shipPosition = shipPositions.get(user.id);
          if (shipPosition) {
            latitude = shipPosition.latitude;
            longitude = shipPosition.longitude;
            city = shipPosition.port || user.current_ship_name || user.vessel_name || user.ship_name || user.last_ship || 'At Sea';
            country = 'Maritime';
            locationSource = 'ship';
            const shipName = user.current_ship_name || user.vessel_name || user.ship_name || user.last_ship;
            const imoDisplay = user.current_ship_imo || user.imo_number;
            console.log(`Using ship position for sailor ${user.full_name} on ${shipName}${imoDisplay ? ` (IMO: ${imoDisplay})` : ''}`);
          }
        }
        
        // If no ship position found, fall back to city-based location
        if (locationSource === 'city') {
          // Prioritize current location over permanent location
          if (user.current_city && user.current_country) {
            city = user.current_city;
            country = user.current_country;
            const coords = this.getCityCoordinates(city, country);
            latitude = coords.lat;
            longitude = coords.lng;
          } else if (user.permanent_city && user.permanent_country) {
            city = user.permanent_city;
            country = user.permanent_country;
            const coords = this.getCityCoordinates(city, country);
            latitude = coords.lat;
            longitude = coords.lng;
          } else if (user.city) {
            city = user.city;
            country = 'Unknown';
            const coords = this.getCityCoordinates(city, country);
            latitude = coords.lat;
            longitude = coords.lng;
          } else {
            // Skip users without any location data
            console.log(`Skipping user ${user.full_name} - no location data available`);
            return null;
          }
        }

        // Ensure we have valid coordinates
        if (latitude === 0 && longitude === 0) {
          console.log(`Warning: User ${user.full_name} has zero coordinates`);
        }

        return {
          id: user.id,
          fullName: user.full_name || user.nickname || user.email || 'Maritime User',
          email: user.email || '',
          password: '',
          userType: hasShipData ? 'sailor' : 'local',
          nickname: user.nickname || user.full_name?.split(' ')[0] || '',
          rank: user.maritime_rank || '',
          shipName: user.current_ship_name || user.vessel_name || user.ship_name || user.last_ship || '',
          imoNumber: user.current_ship_imo || user.imo_number || '',
          port: city,
          visitWindow: locationSource === 'ship' ? 'Currently at sea' : 'Available for connection',
          city,
          country,
          latitude,
          longitude,
          isVerified: true,
          loginCount: 1,
          lastLogin: user.last_login_at || new Date(),
          createdAt: user.created_at || new Date(),
          whatsappNumber: user.whatsapp_number || ''
        } as User & { whatsappNumber: string };
      }).filter(user => user !== null);

      console.log(`Returning ${mappedUsers.length} QAAQ users with coordinates for map and WhatsApp bot`);
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
