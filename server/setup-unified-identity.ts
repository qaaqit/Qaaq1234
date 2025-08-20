import { pool } from './db';
import { uuidManager } from './uuid-manager';

/**
 * Database Migration Script for Unified Identity System
 * Run this to set up the user_identities table and migrate existing data
 */
export async function setupUnifiedIdentitySystem() {
  console.log('🚀 Setting up Unified Identity System...');
  
  try {
    // Create user_identities table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_identities (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        provider TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        is_primary BOOLEAN DEFAULT false,
        is_verified BOOLEAN DEFAULT false,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(provider, provider_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    console.log('✅ Created user_identities table');

    // Add new columns to users table if they don't exist
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS primary_auth_provider TEXT DEFAULT 'qaaq',
      ADD COLUMN IF NOT EXISTS auth_providers JSONB DEFAULT '[]'::jsonb;
    `);
    console.log('✅ Added new auth columns to users table');

    // Migrate existing Google users to identity system
    const googleUsers = await pool.query(`
      SELECT id, google_id, google_email, google_display_name, google_profile_picture_url 
      FROM users 
      WHERE google_id IS NOT NULL AND google_id != ''
    `);
    
    for (const user of googleUsers.rows) {
      // Check if identity already exists
      const existingIdentity = await pool.query(
        'SELECT id FROM user_identities WHERE user_id = $1 AND provider = $2',
        [user.id, 'google']
      );
      
      if (existingIdentity.rows.length === 0) {
        await pool.query(`
          INSERT INTO user_identities (user_id, provider, provider_id, is_primary, is_verified, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          user.id,
          'google',
          user.google_id,
          true, // Set as primary since it was their original auth method
          true,
          JSON.stringify({
            email: user.google_email,
            displayName: user.google_display_name,
            profileImageUrl: user.google_profile_picture_url
          })
        ]);
        
        // Update user's auth provider info
        await pool.query(`
          UPDATE users 
          SET primary_auth_provider = 'google', auth_providers = '["google"]'::jsonb
          WHERE id = $1
        `, [user.id]);
      }
    }
    console.log(`✅ Migrated ${googleUsers.rows.length} Google users to identity system`);

    // Migrate existing WhatsApp users to identity system
    const whatsappUsers = await pool.query(`
      SELECT id, whatsapp_number, whatsapp_display_name 
      FROM users 
      WHERE whatsapp_number IS NOT NULL AND whatsapp_number != ''
    `);
    
    for (const user of whatsappUsers.rows) {
      // Check if identity already exists
      const existingIdentity = await pool.query(
        'SELECT id FROM user_identities WHERE user_id = $1 AND provider = $2',
        [user.id, 'whatsapp']
      );
      
      if (existingIdentity.rows.length === 0) {
        await pool.query(`
          INSERT INTO user_identities (user_id, provider, provider_id, is_primary, is_verified, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          user.id,
          'whatsapp',
          user.whatsapp_number,
          false, // Not primary unless it's their only auth method
          false,
          JSON.stringify({
            phone: user.whatsapp_number,
            displayName: user.whatsapp_display_name
          })
        ]);
        
        // Add WhatsApp to auth providers if not already present
        await pool.query(`
          UPDATE users 
          SET auth_providers = COALESCE(auth_providers, '[]'::jsonb) || '["whatsapp"]'::jsonb
          WHERE id = $1 AND NOT (auth_providers ? 'whatsapp')
        `, [user.id]);
      }
    }
    console.log(`✅ Migrated ${whatsappUsers.rows.length} WhatsApp users to identity system`);

    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_identities_provider_id ON user_identities(provider, provider_id);
      CREATE INDEX IF NOT EXISTS idx_user_identities_user_id ON user_identities(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_identities_primary ON user_identities(user_id, is_primary);
    `);
    console.log('✅ Created indexes for user_identities table');

    console.log('🎉 Unified Identity System setup complete!');
    
    // Print summary
    const stats = await pool.query(`
      SELECT 
        provider,
        COUNT(*) as count,
        COUNT(CASE WHEN is_primary THEN 1 END) as primary_count
      FROM user_identities 
      GROUP BY provider
      ORDER BY count DESC
    `);
    
    console.log('\n📊 Identity System Stats:');
    stats.rows.forEach(row => {
      console.log(`  ${row.provider}: ${row.count} identities (${row.primary_count} primary)`);
    });
    
  } catch (error) {
    console.error('❌ Error setting up unified identity system:', error);
    throw error;
  }
}

/**
 * Helper function to find and merge duplicate users
 * Run this after setup to identify potential account mergers
 */
export async function findDuplicateUsers() {
  console.log('🔍 Finding potential duplicate users...');
  
  try {
    // Find users with same email but different IDs
    const emailDuplicates = await pool.query(`
      SELECT email, array_agg(id) as user_ids, count(*) as count
      FROM users 
      WHERE email IS NOT NULL AND email != ''
      GROUP BY email 
      HAVING count(*) > 1
    `);
    
    console.log(`\n📧 Email Duplicates (${emailDuplicates.rows.length}):`);
    emailDuplicates.rows.forEach(row => {
      console.log(`  ${row.email}: ${row.user_ids.join(', ')}`);
    });
    
    // Find users with same WhatsApp number but different IDs
    const phoneDuplicates = await pool.query(`
      SELECT whatsapp_number, array_agg(id) as user_ids, count(*) as count
      FROM users 
      WHERE whatsapp_number IS NOT NULL AND whatsapp_number != ''
      GROUP BY whatsapp_number 
      HAVING count(*) > 1
    `);
    
    console.log(`\n📱 WhatsApp Duplicates (${phoneDuplicates.rows.length}):`);
    phoneDuplicates.rows.forEach(row => {
      console.log(`  ${row.whatsapp_number}: ${row.user_ids.join(', ')}`);
    });
    
    return {
      emailDuplicates: emailDuplicates.rows,
      phoneDuplicates: phoneDuplicates.rows
    };
    
  } catch (error) {
    console.error('❌ Error finding duplicates:', error);
    throw error;
  }
}

// Export for use in other files
export { setupUnifiedIdentitySystem as default };