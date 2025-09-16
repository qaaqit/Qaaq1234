import { storage } from './storage';
import { identityResolver } from './identity-resolver';
import type { User } from '@shared/schema';
import { pool } from './db';

/**
 * IDENTITY CONSOLIDATION SERVICE
 * Automatically merges duplicate users and links multiple identities
 * Eliminates the "multiple users, one person" problem permanently
 */
export class IdentityConsolidationService {
  
  /**
   * Consolidate user when they login with a new method
   * If user exists with different identity, merge accounts
   */
  async consolidateOnLogin(identifier: string, provider: string, userData: any): Promise<User> {
    console.log(`🔄 CONSOLIDATION: Login attempt - ${provider}:${identifier}`);
    
    try {
      // Step 1: Find existing user by this provider
      let existingUser = await storage.getUserByProviderId(provider, identifier);
      
      if (existingUser) {
        console.log(`✅ CONSOLIDATION: Found existing ${provider} user:`, existingUser.fullName);
        return existingUser;
      }

      // Step 2: Check for potential matches by email/phone
      const potentialMatches = await this.findPotentialMatches(userData);
      
      if (potentialMatches.length === 0) {
        // Create new user - no consolidation needed
        console.log(`🆕 CONSOLIDATION: Creating new user for ${provider}:${identifier}`);
        return await this.createNewUserWithIdentity(provider, identifier, userData);
      }

      // Step 3: Consolidate with best match
      const primaryUser = potentialMatches[0]; // Use first match as primary
      console.log(`🔗 CONSOLIDATION: Linking ${provider} identity to existing user:`, primaryUser.fullName);
      
      // Link the new identity to existing user
      await storage.linkIdentityToUser(primaryUser.id, {
        provider,
        providerId: identifier,
        isVerified: true,
        metadata: {
          consolidatedAt: new Date().toISOString(),
          originalUserData: userData
        } as Record<string, any>
      });

      // Update user data with any new information
      const updatedUser = await this.mergeUserData(primaryUser, userData);
      
      console.log(`✅ CONSOLIDATION: Successfully linked ${provider} to user ${updatedUser.fullName}`);
      return updatedUser;

    } catch (error) {
      console.error('🚨 CONSOLIDATION ERROR:', error);
      
      // Fallback: create new user if consolidation fails
      return await this.createNewUserWithIdentity(provider, identifier, userData);
    }
  }

  /**
   * Find potential user matches by email, phone, or similar identifiers
   */
  private async findPotentialMatches(userData: any): Promise<User[]> {
    const matches: User[] = [];
    
    try {
      // Match by email
      if (userData.email) {
        const emailMatch = await storage.getUserByEmail(userData.email);
        if (emailMatch) {
          console.log(`🎯 CONSOLIDATION: Found email match:`, emailMatch.fullName);
          matches.push(emailMatch);
        }
      }

      // Match by WhatsApp number (from metadata)
      if (userData.phone || userData.whatsapp_number) {
        const phone = userData.phone || userData.whatsapp_number;
        const phoneMatch = await storage.getUserByWhatsApp(phone);
        if (phoneMatch && !matches.some(m => m.id === phoneMatch.id)) {
          console.log(`🎯 CONSOLIDATION: Found phone match:`, phoneMatch.fullName);
          matches.push(phoneMatch);
        }
      }

      // Advanced matching by name similarity (future enhancement)
      // This could include fuzzy name matching for maritime professionals
      
      return matches;

    } catch (error) {
      console.error('Error finding potential matches:', error);
      return [];
    }
  }

  /**
   * Create new user with identity when no matches found
   * Uses minimal, safe fields that exist in parent database
   */
  private async createNewUserWithIdentity(provider: string, identifier: string, userData: any): Promise<User> {
    console.log(`🔧 CONSOLIDATION: Creating minimal user for ${provider}:${identifier}`);
    
    // Only use fields that are guaranteed to exist in parent database
    const minimalUserData = {
      fullName: userData.name || userData.displayName || userData.email || `User ${identifier.slice(-4)}`,
      email: userData.email || null,
      userType: 'sailor' as const,
      // Add optional fields that commonly exist
      ...(userData.phone && { whatsAppNumber: userData.phone }),
      ...(userData.profileImageUrl && { profileImageUrl: userData.profileImageUrl })
    };

    return await storage.createUserWithIdentity(minimalUserData, {
      provider,
      providerId: identifier,
      isVerified: provider === 'replit' || provider === 'google',
      metadata: {
        originalProvider: provider,
        consolidatedAt: new Date().toISOString(),
        ...userData
      }
    });
  }

  /**
   * Merge new user data with existing user data
   */
  private async mergeUserData(existingUser: User, newData: any): Promise<User> {
    try {
      const updates: Partial<User> = {};

      // Merge email if not present
      if (!existingUser.email && newData.email) {
        updates.email = newData.email;
      }

      // Merge profile picture if not present
      if (!existingUser.googleProfilePictureUrl && newData.profileImageUrl) {
        updates.googleProfilePictureUrl = newData.profileImageUrl;
      }

      // Merge display name if more complete
      if (newData.name && newData.name.length > (existingUser.fullName?.length || 0)) {
        updates.fullName = newData.name;
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        console.log(`🔄 CONSOLIDATION: Updating user data for ${existingUser.fullName}:`, updates);
        const updatedUser = await storage.updateUser(existingUser.id, updates);
        return updatedUser || existingUser;
      }

      return existingUser;

    } catch (error) {
      console.error('Error merging user data:', error);
      return existingUser;
    }
  }

  /**
   * Find and merge all duplicate users in the system
   * Run this as a maintenance task
   */
  async findAndMergeDuplicates(): Promise<{ merged: number; errors: number }> {
    console.log('🧹 CONSOLIDATION: Starting duplicate user cleanup...');
    
    let merged = 0;
    let errors = 0;

    try {
      // Find users with same email
      const emailDuplicates = await pool.query(`
        SELECT email, array_agg(id) as user_ids, count(*) as count
        FROM users 
        WHERE email IS NOT NULL AND email != ''
        GROUP BY email 
        HAVING count(*) > 1
      `);

      for (const duplicate of emailDuplicates.rows) {
        try {
          await this.mergeDuplicateUsers(duplicate.user_ids);
          merged++;
        } catch (error) {
          console.error(`Error merging email duplicates for ${duplicate.email}:`, error);
          errors++;
        }
      }

      // Find users with same WhatsApp number
      const phoneDuplicates = await pool.query(`
        SELECT whatsapp_number, array_agg(id) as user_ids, count(*) as count
        FROM users 
        WHERE whatsapp_number IS NOT NULL AND whatsapp_number != ''
        GROUP BY whatsapp_number 
        HAVING count(*) > 1
      `);

      for (const duplicate of phoneDuplicates.rows) {
        try {
          await this.mergeDuplicateUsers(duplicate.user_ids);
          merged++;
        } catch (error) {
          console.error(`Error merging phone duplicates for ${duplicate.whatsapp_number}:`, error);
          errors++;
        }
      }

      console.log(`✅ CONSOLIDATION: Cleanup complete - Merged: ${merged}, Errors: ${errors}`);
      return { merged, errors };

    } catch (error) {
      console.error('🚨 CONSOLIDATION: Cleanup failed:', error);
      return { merged, errors: errors + 1 };
    }
  }

  /**
   * Merge multiple user accounts into the primary (first) account
   */
  private async mergeDuplicateUsers(userIds: string[]): Promise<void> {
    if (userIds.length < 2) return;

    const primaryUserId = userIds[0];
    const duplicateIds = userIds.slice(1);

    console.log(`🔀 CONSOLIDATION: Merging users ${duplicateIds.join(', ')} into ${primaryUserId}`);

    // Move all identities to primary user
    for (const duplicateId of duplicateIds) {
      await pool.query(`
        UPDATE user_identities 
        SET user_id = $1 
        WHERE user_id = $2
      `, [primaryUserId, duplicateId]);

      // Move other related data (posts, likes, etc.)
      await pool.query(`UPDATE posts SET user_id = $1 WHERE user_id = $2`, [primaryUserId, duplicateId]);
      await pool.query(`UPDATE likes SET user_id = $1 WHERE user_id = $2`, [primaryUserId, duplicateId]);
      await pool.query(`UPDATE chat_connections SET sender_id = $1 WHERE sender_id = $2`, [primaryUserId, duplicateId]);
      await pool.query(`UPDATE chat_connections SET receiver_id = $1 WHERE receiver_id = $2`, [primaryUserId, duplicateId]);
      await pool.query(`UPDATE chat_messages SET sender_id = $1 WHERE sender_id = $2`, [primaryUserId, duplicateId]);

      // Delete the duplicate user
      await pool.query(`DELETE FROM users WHERE id = $1`, [duplicateId]);
    }
  }
}

// Export singleton instance
export const identityConsolidation = new IdentityConsolidationService();