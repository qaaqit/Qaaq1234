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
  updateUserLocation(userId: string, latitude: number, longitude: number, source: 'device' | 'ship' | 'city'): Promise<void>;
  
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
      const fullName = user.first_name && user.last_name 
        ? `${user.first_name} ${user.last_name}`.trim()
        : user.nickname || user.email || 'Maritime User';
      
      return {
        id: user.id,
        fullName: fullName,
        email: user.email || '',
        password: '',
        userType: (user.current_ship_name || user.vessel_name || user.ship_name) ? 'sailor' : 'local',
        isAdmin: user.is_admin || user.is_platform_admin || (user.email === "mushy.piyush@gmail.com") || false,
        nickname: user.nickname || '',
        rank: user.maritime_rank || '',
        shipName: user.current_ship_name || user.vessel_name || user.ship_name || '',
        imoNumber: user.current_ship_imo || user.imo_number || '',
        port: user.current_city || user.permanent_city || user.city || '',
        visitWindow: '',
        city: user.current_city || user.permanent_city || user.city || '',
        country: user.current_country || user.permanent_country || '',
        latitude: parseFloat(user.latitude) || 0,
        longitude: parseFloat(user.longitude) || 0,
        isVerified: user.is_verified || true,
        loginCount: user.login_count || 1,
        lastLogin: user.last_login_at || new Date(),
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
    // Liberal authentication - accept password "1234koihai" for any user
    if (password !== "1234koihai") {
      return undefined;
    }

    try {
      console.log('Liberal authentication for:', userId);
      
      // For admin users, create a special admin user profile
      if (userId === "mushy.piyush@gmail.com" || userId === "+919029010070") {
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
      // Use real QAAQ users with location data from current_city and permanent_city fields
      console.log('Fetching QAAQ users with location data for map and WhatsApp bot');
      
      // Start with most basic query and work up - find what columns actually exist
      let result;
      
      console.log('Testing basic connection to users table...');
      try {
        // Ultra-minimal test query to see if table exists
        result = await pool.query('SELECT id FROM users LIMIT 1');
        console.log('Users table exists, found', result.rows.length, 'rows');
        
        // Try to get all column names
        const columnsResult = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users' 
          ORDER BY ordinal_position
        `);
        const availableColumns = columnsResult.rows.map(row => row.column_name);
        console.log('Available columns in users table:', availableColumns);
        
        // This is a maritime professional database - adapt to actual schema
        const hasLocation = availableColumns.includes('current_city') || availableColumns.includes('permanent_city');
        const hasEmail = availableColumns.includes('email');
        
        if (!hasLocation) {
          console.log('No location data found, cannot proceed');
          return [];
        }
        
        // Select key fields that exist in this schema
        let selectFields = ['id'];
        if (hasEmail) selectFields.push('email');
        if (availableColumns.includes('first_name')) selectFields.push('first_name');
        if (availableColumns.includes('last_name')) selectFields.push('last_name');
        if (availableColumns.includes('current_city')) selectFields.push('current_city');
        if (availableColumns.includes('current_country')) selectFields.push('current_country');
        if (availableColumns.includes('permanent_city')) selectFields.push('permanent_city');
        if (availableColumns.includes('permanent_country')) selectFields.push('permanent_country');
        if (availableColumns.includes('rank')) selectFields.push('rank');
        if (availableColumns.includes('ship_name')) selectFields.push('ship_name');
        if (availableColumns.includes('full_name')) selectFields.push('full_name');
        if (availableColumns.includes('whatsapp_number')) selectFields.push('whatsapp_number');
        if (availableColumns.includes('last_login_at')) selectFields.push('last_login_at');
        if (availableColumns.includes('created_at')) selectFields.push('created_at');
        if (availableColumns.includes('ship_types')) selectFields.push('ship_types');
        if (availableColumns.includes('experience_level')) selectFields.push('experience_level');
        if (availableColumns.includes('imo_number')) selectFields.push('imo_number');
        if (availableColumns.includes('seafarer_id')) selectFields.push('seafarer_id');
        if (availableColumns.includes('password')) selectFields.push('password'); // For QAAQ auth city extraction
        if (availableColumns.includes('last_login_location')) selectFields.push('last_login_location'); // Enhanced location data
        if (availableColumns.includes('payment_method')) selectFields.push('payment_method'); // QAAQ city storage
        if (availableColumns.includes('city')) selectFields.push('city'); // Direct city field
        
        console.log('Querying maritime professional database with fields:', selectFields);
        console.log('Available columns include city field:', availableColumns.includes('city'));
        
        // Ensure we always include the essential fields we need
        const essentialFields = ['id', 'full_name', 'email', 'rank', 'ship_name', 'city'];
        const combinedFields = selectFields.concat(essentialFields);
        const finalFields = combinedFields.filter((field, index) => combinedFields.indexOf(field) === index);
        
        console.log('Final query fields:', finalFields);
        
        result = await pool.query(`
          SELECT ${finalFields.join(', ')}
          FROM users 
          WHERE (current_city IS NOT NULL AND current_city != '') 
             OR (permanent_city IS NOT NULL AND permanent_city != '')
             OR (city IS NOT NULL AND city != '')
             OR (payment_method IS NOT NULL AND payment_method != '')
             OR (last_login_location IS NOT NULL AND last_login_location != '')
          ORDER BY last_login_at DESC NULLS LAST
          LIMIT 100
        `);
        
      } catch (error) {
        console.error('Failed to query users table:', (error as Error).message);
        return [];
      }
      
      console.log(`Found ${result.rows.length} QAAQ users with location data`);
      
      // Get ship location service for IMO-based positioning
      const shipLocationService = await this.getShipLocationService();
      
      // Collect sailors with ship data (IMO numbers and ship names)
      const sailorsWithShips = result.rows
        .filter(user => 
          (user.imo_number && user.imo_number.trim() !== '') ||
          (user.ship_name && user.ship_name.trim() !== '')
        )
        .map(user => ({ 
          id: user.id, 
          imo: user.imo_number || '',
          shipName: user.ship_name || '',
          fullName: user.full_name || user.nickname || user.email || 'Maritime User'
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
      
      const mappedUsers = result.rows.map((user, index) => {
        // Better name resolution using actual database fields
        const fullNameField = user.full_name || '';
        const nickname = user.nickname || '';
        const email = user.email || '';
        const rank = user.rank || '';
        const shipName = user.ship_name || '';
        const userCity = user.city || '';
        
        // Debug logging for specific users with rank data
        if (rank || shipName) {
          console.log(`DEBUG: User ${user.full_name} has rank="${rank}" shipName="${shipName}"`);
        }
        
        let fullName = '';
        
        // Show user ID directly - no descriptive text or "AVAILABLE FOR CONNECTION"
        // Priority 1: Use full_name if available (this contains user ID like +919029010070 or name like "Patel")
        if (fullNameField && fullNameField.trim() && !fullNameField.includes('Marine Professional')) {
          fullName = fullNameField.trim();
        }
        // Priority 2: Use nickname if available and meaningful
        else if (nickname && nickname.trim() && !nickname.includes('@') && nickname !== 'Marine Professional') {
          fullName = nickname.trim();
        }
        // Priority 3: Extract name from email prefix
        else if (email && email.includes('@')) {
          const emailName = email.split('@')[0].replace(/[._\d]/g, ' ').trim();
          if (emailName.length > 2 && !emailName.toLowerCase().includes('marine')) {
            fullName = emailName.split(' ').map((word: string) => 
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ');
          }
        }
        
        // Priority 4: If no meaningful name found, just use last 6 characters of user ID
        if (!fullName || fullName === 'Marine Professional') {
          fullName = user.id.toString().slice(-6);
        }
        
        // Determine primary location with QAAQ authorization logic:
        // 1. If present_city is confirmed, use current_city
        // 2. Otherwise, derive from password field (temporary city storage during auth)
        // 3. Fall back to permanent city as last resort
        let city = userCity || 'Unknown City';
        let country = user.country || 'Unknown Country';
        
        // For QAAQ authorization flow: use password field as city if userCity not set
        // This handles users who entered City name as password but haven't confirmed present city
        if (!userCity && user.password) {
          city = user.password; // In QAAQ flow, password temporarily stores city name
          console.log(`Using password field as city for ${fullName}: ${city} (QAAQ auth flow)`);
        }
        
        // Also check the 'city' field directly for QAAQ users
        if (!city || city === 'Unknown City') {
          city = userCity || 'Unknown City';
          console.log(`Using city field for ${fullName}: ${city}`);
        }
        
        // Check for enhanced location data in last_login_location field
        let enhancedLocation = null;
        if (user.last_login_location && user.last_login_location.includes(':')) {
          const [source, coords] = user.last_login_location.split(':');
          if (coords && coords.includes(',')) {
            const [lat, lng] = coords.split(',');
            if (!isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
              enhancedLocation = { source, lat: parseFloat(lat), lng: parseFloat(lng) };
              console.log(`Found enhanced location for ${fullName}: ${source} location at ${lat}, ${lng}`);
            }
          }
        }
        
        // Priority order for location: 1) Ship IMO tracking 2) Device GPS 3) City mapping
        let latitude = 0;
        let longitude = 0;
        let locationSource = 'city';
        
        // Determine user type - sailors typically have rank and ship_name
        const isMaritimeProfessional = rank || shipName;
        
        // 1. First check if this is a sailor with IMO number for real-time ship tracking
        const imoNumber = user.imo_number;
        if (imoNumber && isMaritimeProfessional) {
          const shipPosition = shipPositions.get(user.id);
          if (shipPosition) {
            latitude = shipPosition.latitude;
            longitude = shipPosition.longitude;
            city = shipPosition.port || city;
            locationSource = 'ship';
            console.log(`Using IMO-based ship position for ${fullName}: ${latitude}, ${longitude} at ${city}`);
          }
        }
        
        // 2. Fall back to device GPS if available (would be updated via API)
        // This would be populated by mobile app or browser geolocation
        
        // 2. Check for enhanced location data first
        if (enhancedLocation) {
          latitude = enhancedLocation.lat;
          longitude = enhancedLocation.lng;
          locationSource = enhancedLocation.source;
        }
        
        // 3. Final fallback: derive from city name using coordinate mapping
        if (latitude === 0 && longitude === 0) {
          const coordinates = this.getCityCoordinates(city.toLowerCase(), country.toLowerCase());
          latitude = coordinates.lat;
          longitude = coordinates.lng;
          if (latitude !== 0 || longitude !== 0) {
            locationSource = 'city';
            console.log(`Mapped city coordinates for ${fullName}: ${city} -> ${latitude}, ${longitude}`);
          }
        }
        
        // Include users even without precise coordinates if they have city info
        if (latitude === 0 && longitude === 0 && city === 'Unknown City') {
          console.log(`Skipping user ${fullName} - no location information available`);
          return null;
        }
        
        // For users with city but no coordinates, use approximate coordinates
        if (latitude === 0 && longitude === 0 && city !== 'Unknown City') {
          const coordinates = this.getCityCoordinates(city.toLowerCase(), country.toLowerCase());
          latitude = coordinates.lat;
          longitude = coordinates.lng;
          locationSource = 'city_approximate';
          console.log(`Using approximate coordinates for ${fullName} in ${city}: ${latitude}, ${longitude}`);
        }
        
        const userType = isMaritimeProfessional ? 'sailor' : 'local';
        
        // Scatter users randomly across city area to prevent clustering
        if (locationSource === 'city' || locationSource === 'city_approximate') {
          // Create larger scatter radius based on city size (roughly 5-15km radius for major cities)
          const scatterRadius = 0.1; // Roughly 10km in degrees
          const angle = (index * 37) % 360 * (Math.PI / 180); // Use index for consistent but spread angles
          const distance = (0.02 + (index % 7) * 0.02); // Vary distance from 2km to 14km
          
          const latOffset = Math.sin(angle) * distance;
          const lngOffset = Math.cos(angle) * distance;
          
          latitude += latOffset;
          longitude += lngOffset;
        }
        
        console.log(`Mapped ${userType} ${fullName} from ${city}, ${country} (${latitude}, ${longitude}) - source: ${locationSource}`);

        return {
          id: user.id,
          fullName,
          email: user.email || '',
          password: '',
          userType,
          isAdmin: false, // Set admin status based on phone/email in frontend
          nickname: fullName,
          rank: rank,
          shipName: shipName,
          imoNumber: '', // Not available in this schema
          port: city,
          visitWindow: '',
          city,
          country,
          latitude,
          longitude,
          isVerified: true,
          loginCount: 1,
          lastLogin: user.last_login_at || user.created_at || new Date(),
          createdAt: user.created_at || new Date(),
          whatsappNumber: user.whatsapp_number || ''
        } as User & { whatsappNumber: string };
      }).filter(user => user !== null);

      console.log(`Returning ${mappedUsers.length} QAAQ users with coordinates for map and WhatsApp bot`);
      return mappedUsers;
    } catch (error) {
      console.error('Get users with location error:', error as Error);
      return [];
    }
  }

  async updateUserLocation(userId: string, latitude: number, longitude: number, source: 'device' | 'ship' | 'city'): Promise<void> {
    try {
      // Update location using available QAAQ database columns
      // Use last_login_location to store location source and last_login_at for timestamp
      const locationInfo = `${source}:${latitude},${longitude}`;
      
      await pool.query(`
        UPDATE users 
        SET last_login_location = $1, last_login_at = NOW()
        WHERE id = $2
      `, [locationInfo, userId]);
      
      console.log(`Updated ${source} location for user ${userId}: ${latitude}, ${longitude} (stored in last_login_location)`);
    } catch (error) {
      console.error(`Error updating ${source} location for user ${userId}:`, error as Error);
      throw error;
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
