import { storage } from './storage';
import type { User } from '@shared/schema';

/**
 * CANONICAL IDENTITY RESOLVER
 * Single source of truth for all user authentication and identity resolution
 * Eliminates ID field confusion and provides consistent user lookup
 */
export class IdentityResolver {
  
  /**
   * Resolve user by ANY identifier with comprehensive fallback strategy
   * This becomes the ONLY method used across the entire auth system
   */
  async resolveUserByAnyMethod(identifier: string, context: 'session' | 'jwt' | 'replit' | 'whatsapp' = 'session'): Promise<User | null> {
    console.log(`🎯 CANONICAL RESOLVER: Finding user - ID: ${identifier}, Context: ${context}`);
    
    if (!identifier) {
      console.log('❌ CANONICAL RESOLVER: No identifier provided');
      return null;
    }

    try {
      // Strategy 1: Direct primary key lookup (most common)
      let user = await storage.getUser(identifier);
      if (user) {
        console.log(`✅ CANONICAL RESOLVER: Found by primary key (${context})`);
        return user;
      }

      // Strategy 2: Unified identity system lookup
      user = await storage.findUserByAnyIdentity(identifier);
      if (user) {
        console.log(`✅ CANONICAL RESOLVER: Found via unified identity (${context})`);
        return user;
      }

      // Strategy 3: Legacy field lookups with context-specific optimization
      if (context === 'replit') {
        // For Replit: check google_id field for legacy users
        user = await storage.getUserByGoogleId(identifier);
        if (user) {
          console.log(`✅ CANONICAL RESOLVER: Found by legacy googleId (${context})`);
          return user;
        }
      }

      // Strategy 4: Email lookup if identifier contains @
      if (identifier.includes('@')) {
        user = await storage.getUserByEmail(identifier);
        if (user) {
          console.log(`✅ CANONICAL RESOLVER: Found by email (${context})`);
          return user;
        }
      }

      // Strategy 5: WhatsApp lookup if identifier looks like phone number
      if (/^\+?[0-9]{10,15}$/.test(identifier)) {
        user = await storage.getUserByWhatsApp(identifier);
        if (user) {
          console.log(`✅ CANONICAL RESOLVER: Found by WhatsApp (${context})`);
          return user;
        }
      }

      console.log(`❌ CANONICAL RESOLVER: No user found for ${identifier} (${context})`);
      return null;

    } catch (error) {
      console.error(`🚨 CANONICAL RESOLVER ERROR (${context}):`, error);
      return null;
    }
  }

  /**
   * Ensure user exists in unified identity system
   * Auto-creates identity records for users found via legacy methods
   * Gracefully handles missing unified identity tables in shared databases
   */
  async ensureUserHasUnifiedIdentity(user: User, provider: string, providerId: string): Promise<void> {
    try {
      console.log(`🔗 Ensuring ${provider} identity for user ${user.id} (legacy mode - shared database)`);
      
      // Use the proper unified identity system now that table exists
      const existingIdentity = await storage.getUserByProviderId(provider, providerId);
      if (existingIdentity && existingIdentity.id === user.id) {
        console.log(`✅ User ${user.id} already has ${provider} identity`);
        return;
      }

      // Create missing identity in unified table
      console.log(`🔗 Creating ${provider} identity for user ${user.id}`);
      await storage.linkIdentityToUser(user.id, {
        provider,
        providerId,
        isVerified: true,
        metadata: {
          autoCreated: true,
          createdAt: new Date().toISOString()
        }
      });
      
      console.log(`✅ Created ${provider} identity for user ${user.id}`);
      
      // Also update legacy fields for backward compatibility
      if (provider === 'replit' || provider === 'google') {
        await storage.updateUser(user.id, {
          googleId: providerId,
          authProvider: provider
        });
        console.log(`✅ Updated legacy ${provider} fields for user ${user.id}`);
      }
      
      // For WhatsApp, the phone number is already stored in whatsAppNumber field
      // For QAAQ, the userId is already in the userId field
      
    } catch (error) {
      console.log(`ℹ️ Skipping identity linking in shared database mode:`, error.message);
    }
  }

  /**
   * Get comprehensive user data with all identities
   */
  async getUserWithAllIdentities(userId: string): Promise<User & { identities: any[] } | null> {
    try {
      const user = await this.resolveUserByAnyMethod(userId);
      if (!user) return null;

      const identities = await storage.getUserIdentities(user.id);
      
      return {
        ...user,
        identities
      };
    } catch (error) {
      console.error('Error getting user with identities:', error);
      return null;
    }
  }
}

// Export singleton instance
export const identityResolver = new IdentityResolver();