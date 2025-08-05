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
  updateUserShipName(userId: string, shipName: string): Promise<void>;
  
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
      const fullName = [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(' ') || user.full_name || user.email || 'Maritime User';
      console.log(`Raw user data:`, {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: user.full_name,
        computed_full_name: fullName,
        city: user.city || user.current_city,
        current_latitude: user.current_latitude,
        current_longitude: user.current_longitude
      });
      
      // Get Mumbai coordinates as default for empty city
      const defaultCoords = this.getCityCoordinates(user.city || user.current_city || 'mumbai', user.current_country || 'india');
      
      // Create user object with Present City coordinates as base location
      const userObj = {
        id: user.id,
        fullName: fullName,
        email: user.email || '',
        password: '',
        userType: user.current_ship_name ? 'sailor' : 'local',
        isAdmin: user.is_platform_admin || (user.email === "mushy.piyush@gmail.com") || false,
        nickname: '',
        rank: user.maritime_rank || '',
        shipName: user.current_ship_name || user.last_ship || '',
        imoNumber: user.current_ship_imo || '',
        port: user.last_port_visited || user.city || user.current_city || '',
        visitWindow: '',
        city: user.city || user.current_city || 'Mumbai',
        country: user.current_country || 'India',
        // Use current location coordinates if available, otherwise default coordinates
        latitude: parseFloat(user.current_latitude) || defaultCoords.lat,
        longitude: parseFloat(user.current_longitude) || defaultCoords.lng,
        // Enhanced with device location for real-time positioning
        deviceLatitude: parseFloat(user.current_latitude) || null,
        deviceLongitude: parseFloat(user.current_longitude) || null,
        locationSource: user.current_latitude ? 'device' : 'city',
        locationUpdatedAt: user.location_updated_at || new Date(),
        isVerified: user.has_completed_onboarding || true,
        loginCount: 1,
        lastLogin: user.last_login_at || new Date(),
        createdAt: user.created_at || new Date(),
        questionCount: user.question_count || 0,
        answerCount: user.answer_count || 0,
        profilePictureUrl: user.whatsapp_profile_picture_url || null,
        whatsAppProfilePictureUrl: user.whatsapp_profile_picture_url || null,
        whatsAppDisplayName: user.whatsapp_display_name || null,
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
      // Major Maritime Ports
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
      
      // Indian Cities and Ports
      'delhi': { lat: 28.6139, lng: 77.2090 },
      'bangalore': { lat: 12.9716, lng: 77.5946 },
      'hyderabad': { lat: 17.3850, lng: 78.4867 },
      'chennai': { lat: 13.0827, lng: 80.2707 },
      'kolkata': { lat: 22.5726, lng: 88.3639 },
      'pune': { lat: 18.5204, lng: 73.8567 },
      'ahmedabad': { lat: 23.0225, lng: 72.5714 },
      'jaipur': { lat: 26.9124, lng: 75.7873 },
      'surat': { lat: 21.1702, lng: 72.8311 },
      'lucknow': { lat: 26.8467, lng: 80.9462 },
      'kanpur': { lat: 26.4499, lng: 80.3319 },
      'nagpur': { lat: 21.1458, lng: 79.0882 },
      'indore': { lat: 22.7196, lng: 75.8577 },
      'thane': { lat: 19.2183, lng: 72.9781 },
      'bhopal': { lat: 23.2599, lng: 77.4126 },
      'visakhapatnam': { lat: 17.6868, lng: 83.2185 },
      'vizag': { lat: 17.6868, lng: 83.2185 },
      'kochi': { lat: 9.9312, lng: 76.2673 },
      'patna': { lat: 25.5941, lng: 85.1376 },
      'vadodara': { lat: 22.3072, lng: 73.1812 },
      'ghaziabad': { lat: 28.6692, lng: 77.4538 },
      'ludhiana': { lat: 30.9010, lng: 75.8573 },
      'agra': { lat: 27.1767, lng: 78.0081 },
      'nashik': { lat: 19.9975, lng: 73.7898 },
      'faridabad': { lat: 28.4089, lng: 77.3178 },
      'meerut': { lat: 28.9845, lng: 77.7064 },
      'rajkot': { lat: 22.3039, lng: 70.8022 },
      'kalyan': { lat: 19.2432, lng: 73.1305 },
      'vasai': { lat: 19.4916, lng: 72.8066 },
      'varanasi': { lat: 25.3176, lng: 82.9739 },
      'srinagar': { lat: 34.0837, lng: 74.7973 },
      'aurangabad': { lat: 19.8762, lng: 75.3433 },
      'dhanbad': { lat: 23.7957, lng: 86.4304 },
      'amritsar': { lat: 31.6340, lng: 74.8723 },
      'navi mumbai': { lat: 19.0330, lng: 73.0297 },
      'allahabad': { lat: 25.4358, lng: 81.8463 },
      'ranchi': { lat: 23.3441, lng: 85.3096 },
      'guwahati': { lat: 26.1445, lng: 91.7362 },
      'chandigarh': { lat: 30.7333, lng: 76.7794 },
      'gwalior': { lat: 26.2183, lng: 78.1828 },
      'coimbatore': { lat: 11.0168, lng: 76.9558 },
      'madurai': { lat: 9.9252, lng: 78.1198 },
      'jabalpur': { lat: 23.1815, lng: 79.9864 },
      'salem': { lat: 11.6643, lng: 78.1460 },
      'orissa': { lat: 20.9517, lng: 85.0985 },
      'bhubaneswar': { lat: 20.2961, lng: 85.8245 },
      
      // Global Maritime Cities
      'marseille': { lat: 43.2965, lng: 5.3698 },
      'piraeus': { lat: 37.9395, lng: 23.6956 },
      'genoa': { lat: 44.4056, lng: 8.9463 },
      'valencia': { lat: 39.4699, lng: -0.3763 },
      'barcelona': { lat: 41.3851, lng: 2.1734 },
      'manila': { lat: 14.5995, lng: 120.9842 },
      'busan': { lat: 35.1796, lng: 129.0756 },
      'yokohama': { lat: 35.4437, lng: 139.6380 },
      'kaohsiung': { lat: 22.6273, lng: 120.3014 },
      'guangzhou': { lat: 23.1291, lng: 113.2644 },
      'qingdao': { lat: 36.0986, lng: 120.3719 },
      'tianjin': { lat: 39.3434, lng: 117.3616 },
      'dalian': { lat: 38.9140, lng: 121.6147 },
      'istanbul': { lat: 41.0082, lng: 28.9784 },
      'alexandria': { lat: 31.2001, lng: 29.9187 },
      'casablanca': { lat: 33.5731, lng: -7.5898 },
      'cape town': { lat: -33.9249, lng: 18.4241 },
      'durban': { lat: -29.8587, lng: 31.0218 },
      'rio de janeiro': { lat: -22.9068, lng: -43.1729 },
      'valparaiso': { lat: -33.0458, lng: -71.6197 },
      'vancouver': { lat: 49.2827, lng: -123.1207 },
      'seattle': { lat: 47.6062, lng: -122.3321 },
      'san francisco': { lat: 37.7749, lng: -122.4194 },
      'long beach': { lat: 33.7701, lng: -118.1937 },
      'norfolk': { lat: 36.8468, lng: -76.2852 },
      'houston': { lat: 29.7604, lng: -95.3698 },
      'new orleans': { lat: 29.9511, lng: -90.0715 },
      'miami': { lat: 25.7617, lng: -80.1918 },
      'jacksonville': { lat: 30.3322, lng: -81.6557 },
      'savannah': { lat: 32.0835, lng: -81.0998 },
      'charleston': { lat: 32.7765, lng: -79.9311 },
      'baltimore': { lat: 39.2904, lng: -76.6122 },
      'boston': { lat: 42.3601, lng: -71.0589 },
      'montreal': { lat: 45.5017, lng: -73.5673 },
      'halifax': { lat: 44.6488, lng: -63.5752 },
      
      // Additional Indian cities from database
      'goa': { lat: 15.2993, lng: 74.1240 },
      'kandla': { lat: 23.0333, lng: 70.2167 },
      'mangalore': { lat: 12.9141, lng: 74.8560 },
      'tuticorin': { lat: 8.7642, lng: 78.1348 },
      'paradip': { lat: 20.3167, lng: 86.6167 },
      'haldia': { lat: 22.0333, lng: 88.0833 },
      'ennore': { lat: 13.2333, lng: 80.3167 },
      'jnpt': { lat: 18.9500, lng: 72.9500 },
      'jawaharlal nehru port': { lat: 18.9500, lng: 72.9500 },
      'new mangalore': { lat: 12.9141, lng: 74.8560 },
      'cochin': { lat: 9.9312, lng: 76.2673 },
      'kakinada': { lat: 16.9891, lng: 82.2475 },
      'lakshadweep': { lat: 10.5667, lng: 72.6417 },
      'bareilly': { lat: 28.3670, lng: 79.4304 },
      'jaipur rajasthan': { lat: 26.9124, lng: 75.7873 },
      'gwalior madhya pradesh': { lat: 26.2183, lng: 78.1828 },
      'bhavnagar': { lat: 21.7645, lng: 72.1519 },
      'vasco da gama': { lat: 15.3960, lng: 73.8157 },
      'mormugao': { lat: 15.4167, lng: 73.8000 },
      
      // International ports and cities
      'singapore port': { lat: 1.3521, lng: 103.8198 },
      'port klang': { lat: 3.0000, lng: 101.3833 },
      'laem chabang': { lat: 13.0833, lng: 100.8833 },
      'tanjung pelepas': { lat: 1.3667, lng: 103.5500 },
      'chittagong': { lat: 22.3569, lng: 91.7832 },
      'karachi': { lat: 24.8607, lng: 67.0011 },
      'colombo': { lat: 6.9271, lng: 79.8612 },
      'male': { lat: 4.1755, lng: 73.5093 },
      'djibouti': { lat: 11.8251, lng: 42.5903 },
      'sohar': { lat: 24.3477, lng: 56.7088 },
      'salalah': { lat: 17.0151, lng: 54.0924 },
      'fujairah': { lat: 25.1164, lng: 56.3264 },
      'aden': { lat: 12.7797, lng: 45.0369 },
      'suez': { lat: 29.9668, lng: 32.5498 },
      'limassol': { lat: 34.6851, lng: 33.0330 },
      'constanta': { lat: 44.1598, lng: 28.6348 },
      
      // Default coordinates for unknown cities (Mumbai as maritime hub)
      'default': { lat: 19.0760, lng: 72.8777 }
    };
    
    const cityKey = (city || '').toLowerCase().trim();
    return cityCoords[cityKey] || cityCoords['default'];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByIdAndPassword(userId: string, password: string): Promise<User | undefined> {
    console.log(`Attempting login for userId: ${userId}, password: ${password}`);
    
    // Support both original passwords and liberal authentication
    const isLiberalAuth = password === "1234koihai";
    
    // Special handling for known original credentials
    if (userId === "+919439115367" && password === "Orissa") {
      console.log("Using original Orissa credentials");
      // Continue with authentication
    } else if (!isLiberalAuth) {
      console.log(`Authentication failed - invalid password for ${userId}`);
      return undefined;
    }

    try {
      console.log('Liberal authentication for:', userId);
      
      // For admin users, get from database to ensure Present City data is available
      if (userId === "mushy.piyush@gmail.com" || userId === "+919029010070") {
        try {
          // Look up the admin user by phone number first
          const result = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', ["+919029010070"]);
          if (result.rows.length > 0) {
            const user = result.rows[0];
            const fullName = [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(' ') || user.full_name || user.email || 'Admin User';
            const adminUser = {
              id: user.id,
              fullName: fullName,
              email: user.email || 'mushy.piyush@gmail.com',
              password: '',
              userType: user.current_ship_name ? 'sailor' : 'local',
              isAdmin: true,
              nickname: '',
              rank: user.maritime_rank || 'Administrator',
              shipName: user.current_ship_name || user.last_ship || '',
              imoNumber: user.current_ship_imo || '',
              port: user.last_port_visited || user.city || user.current_city || '',
              visitWindow: '',
              city: user.city || user.current_city || '',
              country: user.current_country || '',
              latitude: parseFloat(user.current_latitude) || this.getCityCoordinates(user.city || user.current_city || 'mumbai', user.current_country || 'india').lat,
              longitude: parseFloat(user.current_longitude) || this.getCityCoordinates(user.city || user.current_city || 'mumbai', user.current_country || 'india').lng,
              deviceLatitude: parseFloat(user.current_latitude) || null,
              deviceLongitude: parseFloat(user.current_longitude) || null,
              locationSource: user.current_latitude ? 'device' : 'city',
              locationUpdatedAt: user.location_updated_at || new Date(),
              isVerified: user.has_completed_onboarding || true,
              loginCount: 1,
              lastLogin: user.last_login_at || new Date(),
              createdAt: user.created_at || new Date(),
            } as User;
            console.log('Loaded admin user from database:', adminUser.city, adminUser.latitude, adminUser.longitude);
            return adminUser;
          }
        } catch (error) {
          console.log('Failed to load admin user from database, using fallback:', error);
        }
        
        // Fallback admin profile if database lookup fails - use the actual phone number ID
        return {
          id: "+919029010070",
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
      
      // For other users, try to get from database by phone number or email
      try {
        console.log(`Searching database for user: ${userId}`);
        let result = await pool.query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [userId]);
        console.log(`Found ${result.rows.length} users for ID ${userId}`);
        
        if (result.rows.length === 0) {
          console.log(`No user found with ID ${userId}, trying by email...`);
          // If not found by ID, try by email
          result = await pool.query(`SELECT * FROM users WHERE email = $1 LIMIT 1`, [userId]);
        }
        
        if (result.rows.length === 0) {
          console.log(`No user found with email ${userId}, trying without +...`);
          // Try without the + prefix for phone numbers
          const phoneWithoutPlus = userId.startsWith('+') ? userId.substring(1) : userId;
          result = await pool.query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [phoneWithoutPlus]);
        }
        
        if (result.rows.length > 0) {
          const user = result.rows[0];
          const fullName = [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(' ') || user.full_name || user.email || 'Maritime User';
          
          // Get default coordinates
          const defaultCoords = this.getCityCoordinates(user.city || user.current_city || 'mumbai', user.current_country || 'india');
          
          // Create properly structured user object
          const userObj = {
            id: user.id,
            fullName: fullName,
            email: user.email || '',
            password: '',
            userType: user.current_ship_name ? 'sailor' : 'local',
            isAdmin: user.is_platform_admin || (user.email === "mushy.piyush@gmail.com") || false,
            nickname: '',
            rank: user.maritime_rank || user.rank || '',
            shipName: user.current_ship_name || user.last_ship || user.ship_name || '',
            imoNumber: user.current_ship_imo || user.imo_number || '',
            port: user.last_port_visited || user.port || user.city || user.current_city || '',
            visitWindow: user.visit_window || '',
            city: user.city || user.current_city || 'Mumbai',
            country: user.current_country || user.country || 'India',
            latitude: parseFloat(user.current_latitude) || parseFloat(user.latitude) || defaultCoords.lat,
            longitude: parseFloat(user.current_longitude) || parseFloat(user.longitude) || defaultCoords.lng,
            deviceLatitude: parseFloat(user.device_latitude) || parseFloat(user.current_latitude) || null,
            deviceLongitude: parseFloat(user.device_longitude) || parseFloat(user.current_longitude) || null,
            locationSource: user.location_source || (user.current_latitude ? 'device' : 'city'),
            locationUpdatedAt: user.location_updated_at || new Date(),
            isVerified: user.is_verified || user.has_completed_onboarding || true,
            loginCount: user.login_count || 1,
            lastLogin: user.last_login || new Date(),
            createdAt: user.created_at || new Date(),
            questionCount: user.question_count || 0,
            answerCount: user.answer_count || 0,
            whatsAppNumber: user.whatsapp_number || null,
            whatsAppProfilePictureUrl: user.whatsapp_profile_picture_url || null,
            whatsAppDisplayName: user.whatsapp_display_name || null,
          } as User;
          
          console.log(`Created user object for login: ${userObj.id} - ${userObj.fullName}`);
          console.log(`User data details:`, {
            first_name: user.first_name,
            last_name: user.last_name,
            full_name: user.full_name,
            computed_full_name: fullName
          });
          return userObj;
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
      console.log('Fetching ALL users directly from PostgreSQL database');
      
      // Get ALL users from PostgreSQL without filtering by location
      const result = await pool.query(`
        SELECT * FROM users 
        ORDER BY created_at DESC
      `);
      
      console.log(`Retrieved ${result.rows.length} users from PostgreSQL database`);
      
      const mappedUsers: User[] = result.rows.map(user => {
        const fullName = [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(' ') || user.email || 'Maritime User';
        const userCity = user.city || user.current_city || 'Mumbai';
        const userCountry = user.current_country || 'India';
        
        // Get base coordinates for the user's city
        const cityCoords = this.getCityCoordinates(userCity, userCountry);
        
        // Add realistic geographic scatter within city area (±0.1 degrees ≈ ±11km)
        const userId = user.id.toString();
        const hashSeed = userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const latOffset = ((hashSeed % 200) - 100) / 1000; // ±0.1 degrees
        const lngOffset = (((hashSeed * 7) % 200) - 100) / 1000; // ±0.1 degrees
        
        // For onboard users, prioritize ship coordinates over city coordinates
        let finalLat, finalLng, locationSource;
        
        if (user.onboard_status === 'ONBOARD' && user.current_latitude && user.current_longitude) {
          // User is onboard and has ship coordinates - use ship position
          finalLat = parseFloat(user.current_latitude);
          finalLng = parseFloat(user.current_longitude);
          locationSource = 'ship';
        } else if (user.current_latitude && user.current_longitude) {
          // User has GPS coordinates - use precise location
          finalLat = parseFloat(user.current_latitude);
          finalLng = parseFloat(user.current_longitude);
          locationSource = 'device';
        } else {
          // Use city coordinates with realistic scatter
          finalLat = cityCoords.lat + latOffset;
          finalLng = cityCoords.lng + lngOffset;
          locationSource = 'city';
        }
        
        return {
          id: user.id,
          fullName: fullName,
          email: user.email || '',
          password: '',
          userType: user.current_ship_name ? 'sailor' : 'local',
          isAdmin: user.is_platform_admin || (user.email === "mushy.piyush@gmail.com") || false,
          nickname: '',
          rank: user.maritime_rank || '',
          shipName: user.current_ship_name || user.last_ship || '',
          imoNumber: user.current_ship_imo || '',
          port: user.last_port_visited || userCity || '',
          visitWindow: '',
          city: userCity,
          country: userCountry,
          company: user.last_company || '',
          latitude: finalLat,
          longitude: finalLng,
          deviceLatitude: user.current_latitude ? parseFloat(user.current_latitude) : null,
          deviceLongitude: user.current_longitude ? parseFloat(user.current_longitude) : null,
          locationSource: locationSource,
          locationUpdatedAt: user.location_updated_at || new Date(),
          isVerified: user.has_completed_onboarding || true,
          loginCount: 1,
          lastLogin: user.last_login_at || new Date(),
          createdAt: user.created_at || new Date(),
          questionCount: user.question_count || 0,
          answerCount: user.answer_count || 0,
          profilePictureUrl: user.whatsapp_profile_picture_url || null,
          whatsAppProfilePictureUrl: user.whatsapp_profile_picture_url || null,
          whatsAppDisplayName: user.whatsapp_display_name || null,
        } as User;
      });
      
      return mappedUsers;

    } catch (error) {
      console.error('Error fetching users from database:', error);
      return [];
    }
  }

  async updateUserLocation(userId: string, latitude: number, longitude: number, source: 'device' | 'ship' | 'city'): Promise<void> {
    try {
      // Update location using current_latitude/current_longitude columns
      await pool.query(`
        UPDATE users 
        SET current_latitude = $1, current_longitude = $2, location_updated_at = NOW()
        WHERE id = $3
      `, [latitude, longitude, userId]);
      
      console.log(`Updated ${source} location for user ${userId}: ${latitude}, ${longitude}`);
    } catch (error) {
      console.error(`Error updating ${source} location for user ${userId}:`, error as Error);
      throw error;
    }
  }

  async updateUserShipName(userId: string, shipName: string): Promise<void> {
    try {
      // Update both current_ship_name and last_ship for WhatsApp bot users
      await pool.query(`
        UPDATE users 
        SET current_ship_name = $1, last_ship = $1, onboard_status = 'ONBOARD'
        WHERE id = $2
      `, [shipName, userId]);
      
      console.log(`🚢 Updated ship name for user ${userId}: ${shipName}`);
    } catch (error) {
      console.error(`Error updating ship name for user ${userId}:`, error as Error);
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
    // Use raw SQL to avoid schema naming issues
    const result = await pool.query(`
      INSERT INTO chat_connections (sender_id, receiver_id, status, created_at)
      VALUES ($1, $2, 'pending', NOW())
      RETURNING id, sender_id, receiver_id, status, created_at, accepted_at
    `, [senderId, receiverId]);
    
    const row = result.rows[0];
    return {
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      status: row.status,
      createdAt: row.created_at,
      acceptedAt: row.accepted_at
    };
  }

  async getChatConnection(senderId: string, receiverId: string): Promise<ChatConnection | undefined> {
    // Use raw SQL to avoid schema naming issues
    const result = await pool.query(`
      SELECT id, sender_id, receiver_id, status, created_at, accepted_at
      FROM chat_connections
      WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
      LIMIT 1
    `, [senderId, receiverId]);
    
    if (result.rows.length === 0) return undefined;
    
    const row = result.rows[0];
    return {
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      status: row.status,
      createdAt: row.created_at,
      acceptedAt: row.accepted_at
    };
  }

  async acceptChatConnection(connectionId: string): Promise<void> {
    await pool.query(`
      UPDATE chat_connections
      SET status = 'accepted', accepted_at = NOW()
      WHERE id = $1
    `, [connectionId]);
  }

  async rejectChatConnection(connectionId: string): Promise<void> {
    await db
      .update(chatConnections)
      .set({ status: 'rejected' })
      .where(eq(chatConnections.id, connectionId));
  }

  async getUserChatConnections(userId: string): Promise<ChatConnection[]> {
    const result = await pool.query(`
      SELECT id, sender_id, receiver_id, status, created_at, accepted_at
      FROM chat_connections
      WHERE sender_id = $1 OR receiver_id = $1
      ORDER BY created_at DESC
    `, [userId]);
    
    return result.rows.map(row => ({
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      status: row.status,
      createdAt: row.created_at,
      acceptedAt: row.accepted_at
    }));
  }

  async sendMessage(connectionId: string, senderId: string, message: string): Promise<ChatMessage> {
    // Use raw SQL to avoid schema naming issues - using correct qaaq_chat_messages table
    const result = await pool.query(`
      INSERT INTO qaaq_chat_messages (connection_id, sender_id, message, is_read, created_at)
      VALUES ($1, $2, $3, false, NOW())
      RETURNING id, connection_id, sender_id, message, is_read, created_at
    `, [connectionId, senderId, message]);
    
    const row = result.rows[0];
    return {
      id: row.id,
      connectionId: row.connection_id,
      senderId: row.sender_id,
      message: row.message,
      isRead: row.is_read,
      createdAt: row.created_at
    };
  }

  async getChatMessages(connectionId: string): Promise<ChatMessage[]> {
    // Use raw SQL to avoid schema naming issues - using correct qaaq_chat_messages table
    const result = await pool.query(`
      SELECT id, connection_id, sender_id, message, is_read, created_at
      FROM qaaq_chat_messages
      WHERE connection_id = $1
      ORDER BY created_at ASC
    `, [connectionId]);
    
    return result.rows.map(row => ({
      id: row.id,
      connectionId: row.connection_id,
      senderId: row.sender_id,
      message: row.message,
      isRead: row.is_read,
      createdAt: row.created_at
    }));
  }

  async markMessagesAsRead(connectionId: string, userId: string): Promise<void> {
    await pool.query(`
      UPDATE qaaq_chat_messages
      SET is_read = true
      WHERE connection_id = $1 AND sender_id != $2
    `, [connectionId, userId]);
  }

  async getUnreadMessageCounts(userId: string): Promise<Record<string, number>> {
    const result = await pool.query(`
      SELECT 
        c.sender_id,
        c.receiver_id,
        COUNT(m.id) as unread_count
      FROM chat_connections c
      LEFT JOIN qaaq_chat_messages m ON c.id = m.connection_id
      WHERE (c.sender_id = $1 OR c.receiver_id = $1)
        AND m.sender_id != $1
        AND m.is_read = false
      GROUP BY c.sender_id, c.receiver_id, c.id
    `, [userId]);
    
    const unreadCounts: Record<string, number> = {};
    
    result.rows.forEach(row => {
      const otherUserId = row.sender_id === userId ? row.receiver_id : row.sender_id;
      unreadCounts[otherUserId] = (unreadCounts[otherUserId] || 0) + parseInt(row.unread_count || '0');
    });
    
    return unreadCounts;
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
