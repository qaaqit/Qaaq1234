import { localDb, localPool } from './local-db';
import { pool } from './db'; // QAAQ parent database
import { localUsers, userMapping, verificationCodes, type LocalUser, type InsertLocalUser, type CreateGoogleUser } from './local-schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Hybrid Storage Service
 * Uses local database for user authentication and profiles
 * Uses QAAQ parent database for questions, answers, and other maritime data
 */
export class HybridStorage {
  
  // ========== USER MANAGEMENT (Local Database) ==========
  
  async getLocalUser(id: string): Promise<LocalUser | undefined> {
    try {
      console.log(`🔍 Getting local user: ${id}`);
      
      // First try direct ID lookup
      const [user] = await localDb.select().from(localUsers).where(eq(localUsers.id, id)).limit(1);
      if (user) return user;
      
      // Try QAAQ user ID lookup
      const [user2] = await localDb.select().from(localUsers).where(eq(localUsers.qaaqUserId, id)).limit(1);
      if (user2) return user2;
      
      // Try email lookup
      const [user3] = await localDb.select().from(localUsers).where(eq(localUsers.email, id)).limit(1);
      if (user3) return user3;
      
      // Try Google ID lookup
      const [user4] = await localDb.select().from(localUsers).where(eq(localUsers.googleId, id)).limit(1);
      if (user4) return user4;
      
      console.log(`❌ Local user not found: ${id}`);
      return undefined;
    } catch (error) {
      console.error('Error getting local user:', error);
      return undefined;
    }
  }
  
  async createLocalUser(userData: InsertLocalUser): Promise<LocalUser> {
    try {
      console.log(`➕ Creating local user: ${userData.email}`);
      
      const [user] = await localDb.insert(localUsers).values({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      return user;
    } catch (error) {
      console.error('Error creating local user:', error);
      throw error;
    }
  }
  
  async createGoogleUser(userData: CreateGoogleUser): Promise<LocalUser> {
    try {
      console.log(`🔗 Creating Google OAuth user: ${userData.email}`);
      
      const newUser: InsertLocalUser = {
        email: userData.email,
        fullName: userData.fullName,
        firstName: userData.googleGivenName,
        lastName: userData.googleFamilyName,
        displayName: userData.googleDisplayName,
        profilePictureUrl: userData.googleProfilePictureUrl,
        authProvider: 'google',
        googleId: userData.googleId,
        googleEmail: userData.googleEmail,
        googleProfilePictureUrl: userData.googleProfilePictureUrl,
        googleDisplayName: userData.googleDisplayName,
        googleGivenName: userData.googleGivenName,
        googleFamilyName: userData.googleFamilyName,
        googleVerifiedEmail: userData.googleVerifiedEmail,
        userType: userData.userType,
        isVerified: true, // Google accounts are pre-verified
        hasCompletedOnboarding: false,
        mustCreatePassword: false, // Google users don't need password
      };
      
      return await this.createLocalUser(newUser);
    } catch (error) {
      console.error('Error creating Google user:', error);
      throw error;
    }
  }
  
  async updateLocalUser(userId: string, updates: Partial<LocalUser>): Promise<LocalUser | undefined> {
    try {
      console.log(`📝 Updating local user: ${userId}`);
      
      const [user] = await localDb
        .update(localUsers)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(localUsers.id, userId))
        .returning();
        
      return user || undefined;
    } catch (error) {
      console.error('Error updating local user:', error);
      return undefined;
    }
  }
  
  async getUserByEmail(email: string): Promise<LocalUser | undefined> {
    try {
      const [user] = await localDb.select().from(localUsers).where(eq(localUsers.email, email)).limit(1);
      return user || undefined;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
  }
  
  async getUserByGoogleId(googleId: string): Promise<LocalUser | undefined> {
    try {
      const [user] = await localDb.select().from(localUsers).where(eq(localUsers.googleId, googleId)).limit(1);
      return user || undefined;
    } catch (error) {
      console.error('Error getting user by Google ID:', error);
      return undefined;
    }
  }
  
  async authenticateUser(userId: string, password: string): Promise<LocalUser | undefined> {
    console.log(`🔐 Authenticating user: ${userId}`);
    
    // Get user from local database
    const user = await this.getLocalUser(userId);
    if (!user) {
      console.log(`❌ User not found in local database: ${userId}`);
      return undefined;
    }
    
    // For Google OAuth users, password is not required
    if (user.authProvider === 'google') {
      console.log(`✅ Google OAuth user authenticated: ${userId}`);
      return user;
    }
    
    // For QAAQ users, check password if set
    if (user.passwordHash) {
      const hashedInput = crypto.createHash('sha256').update(password).digest('hex');
      if (user.passwordHash !== hashedInput) {
        console.log(`❌ Invalid password for user: ${userId}`);
        return undefined;
      }
    }
    
    // Update login tracking
    await this.updateLocalUser(user.id, {
      loginCount: (user.loginCount || 0) + 1,
      lastLogin: new Date(),
    });
    
    console.log(`✅ User authenticated: ${userId}`);
    return user;
  }
  
  async setUserPassword(userId: string, password: string): Promise<boolean> {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await this.updateLocalUser(userId, {
        passwordHash: hashedPassword,
        hasSetCustomPassword: true,
        passwordCreatedAt: new Date(),
        mustCreatePassword: false,
      });
      
      return !!user;
    } catch (error) {
      console.error('Error setting user password:', error);
      return false;
    }
  }
  
  // ========== SYNC WITH QAAQ DATABASE ==========
  
  async syncUserFromQAAQ(qaaqUserId: string): Promise<LocalUser | undefined> {
    try {
      console.log(`🔄 Syncing user from QAAQ database: ${qaaqUserId}`);
      
      // Check if user already exists locally
      let localUser = await this.getLocalUser(qaaqUserId);
      if (localUser) {
        console.log(`👤 User already exists locally: ${qaaqUserId}`);
        return localUser;
      }
      
      // Get user data from QAAQ database
      const result = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [qaaqUserId]);
      if (result.rows.length === 0) {
        console.log(`❌ User not found in QAAQ database: ${qaaqUserId}`);
        return undefined;
      }
      
      const qaaqUser = result.rows[0];
      
      // Create local user from QAAQ data
      const fullName = [qaaqUser.first_name, qaaqUser.middle_name, qaaqUser.last_name]
        .filter(Boolean).join(' ') || qaaqUser.full_name || qaaqUser.email || 'Maritime User';
      
      const localUserData: InsertLocalUser = {
        email: qaaqUser.email || `${qaaqUserId}@qaaq.temp`,
        fullName: fullName,
        firstName: qaaqUser.first_name,
        lastName: qaaqUser.last_name,
        displayName: fullName,
        qaaqUserId: qaaqUserId,
        authProvider: 'qaaq',
        userType: qaaqUser.current_ship_name ? 'sailor' : 'local',
        maritimeRank: qaaqUser.maritime_rank,
        currentShipName: qaaqUser.current_ship_name,
        currentShipIMO: qaaqUser.current_ship_imo,
        currentCity: qaaqUser.current_city,
        currentCountry: qaaqUser.current_country,
        nationality: qaaqUser.nationality,
        deviceLatitude: qaaqUser.current_latitude ? parseFloat(qaaqUser.current_latitude) : undefined,
        deviceLongitude: qaaqUser.current_longitude ? parseFloat(qaaqUser.current_longitude) : undefined,
        locationSource: qaaqUser.current_latitude ? 'device' : 'city',
        locationUpdatedAt: qaaqUser.location_updated_at,
        whatsappNumber: qaaqUser.whatsapp_number,
        whatsappProfilePictureUrl: qaaqUser.whatsapp_profile_picture_url,
        whatsappDisplayName: qaaqUser.whatsapp_display_name,
        questionCount: qaaqUser.question_count || 0,
        answerCount: qaaqUser.answer_count || 0,
        isVerified: qaaqUser.has_completed_onboarding || false,
        loginCount: qaaqUser.login_count || 0,
        lastLogin: qaaqUser.last_login_at,
        hasCompletedOnboarding: qaaqUser.has_completed_onboarding || false,
        isPlatformAdmin: qaaqUser.is_platform_admin || false,
        isBlocked: qaaqUser.is_blocked || false,
        mustCreatePassword: !qaaqUser.password, // Require password if not set
      };
      
      localUser = await this.createLocalUser(localUserData);
      
      // Create mapping entry
      await localDb.insert(userMapping).values({
        localUserId: localUser.id,
        qaaqUserId: qaaqUserId,
        syncStatus: 'active',
      });
      
      console.log(`✅ User synced from QAAQ: ${qaaqUserId} -> ${localUser.id}`);
      return localUser;
      
    } catch (error) {
      console.error('Error syncing user from QAAQ:', error);
      return undefined;
    }
  }
  
  // ========== VERIFICATION CODES (Local Database) ==========
  
  async createVerificationCode(userId: string, code: string, expiresAt: Date) {
    try {
      const [verificationCode] = await localDb.insert(verificationCodes).values({
        userId,
        code,
        expiresAt,
      }).returning();
      
      return verificationCode;
    } catch (error) {
      console.error('Error creating verification code:', error);
      throw error;
    }
  }
  
  async getVerificationCode(userId: string, code: string) {
    try {
      const [verificationCode] = await localDb
        .select()
        .from(verificationCodes)
        .where(
          and(
            eq(verificationCodes.userId, userId),
            eq(verificationCodes.code, code),
            eq(verificationCodes.isUsed, false)
          )
        )
        .limit(1);
        
      return verificationCode || undefined;
    } catch (error) {
      console.error('Error getting verification code:', error);
      return undefined;
    }
  }
  
  async markCodeAsUsed(codeId: string): Promise<void> {
    try {
      await localDb
        .update(verificationCodes)
        .set({ isUsed: true })
        .where(eq(verificationCodes.id, codeId));
    } catch (error) {
      console.error('Error marking code as used:', error);
      throw error;
    }
  }
  
  // ========== LEGACY QAAQ DATA ACCESS ==========
  
  async getUsersWithLocation(): Promise<any[]> {
    try {
      console.log('🌍 Fetching users with location from QAAQ database');
      
      const result = await pool.query(`
        SELECT * FROM users 
        ORDER BY created_at DESC
      `);
      
      console.log(`📊 Retrieved ${result.rows.length} users from QAAQ database`);
      return result.rows;
      
    } catch (error) {
      console.error('Error fetching users with location:', error);
      return [];
    }
  }
  
  async updateUserLocation(userId: string, latitude: number, longitude: number, source: 'device' | 'ship' | 'city'): Promise<void> {
    try {
      // Update in local database
      await this.updateLocalUser(userId, {
        deviceLatitude: latitude,
        deviceLongitude: longitude,
        locationSource: source,
        locationUpdatedAt: new Date(),
      });
      
      // Also update in QAAQ database for backward compatibility
      await pool.query(`
        UPDATE users SET 
          current_latitude = $1,
          current_longitude = $2,
          location_updated_at = NOW()
        WHERE id = $3
      `, [latitude, longitude, userId]);
      
      console.log(`📍 Updated location for user ${userId}: ${latitude}, ${longitude}`);
    } catch (error) {
      console.error('Error updating user location:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const hybridStorage = new HybridStorage();