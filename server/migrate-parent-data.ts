import { Pool } from '@neondatabase/serverless';
import { db } from './db';
import { users } from '@shared/schema';

// Parent database connection (QAAQ Admin Database)
const parentPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PwdR2EKrAx1s@ep-autumn-hat-a27gd1cd.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

export async function migrateParentData() {
  console.log('🚀 Starting migration from parent QAAQ database...');
  
  try {
    // Step 1: Test parent database connection
    console.log('📡 Testing parent database connection...');
    const testResult = await parentPool.query('SELECT COUNT(*) FROM users LIMIT 1');
    console.log(`✅ Parent database connected. Total users: ${testResult.rows[0].count}`);
    
    // Step 2: Get essential user data from parent database
    console.log('📋 Fetching user data from parent database...');
    const parentUsers = await parentPool.query(`
      SELECT 
        id,
        full_name,
        email,
        maritime_rank,
        current_ship_name,
        current_ship_imo,
        current_city,
        current_country,
        current_latitude,
        current_longitude,
        nationality,
        whatsapp_number,
        whatsapp_profile_picture_url,
        whatsapp_display_name,
        question_count,
        answer_count,
        last_login_at,
        has_completed_onboarding,
        is_platform_admin,
        created_at,
        last_updated
      FROM users 
      WHERE id IS NOT NULL 
      ORDER BY last_updated DESC 
      LIMIT 1000
    `);
    
    console.log(`📊 Found ${parentUsers.rows.length} users to migrate`);
    
    // Step 3: Transform and insert data into new database
    const migrationResults = {
      successful: 0,
      skipped: 0,
      errors: 0
    };
    
    for (const parentUser of parentUsers.rows) {
      try {
        // Check if user already exists
        const existing = await db.query('SELECT id FROM users WHERE id = $1 LIMIT 1', [parentUser.id]);
        if (existing.rows.length > 0) {
          migrationResults.skipped++;
          continue;
        }
        
        // Transform parent data to match our schema
        const transformedUser = {
          id: parentUser.id,
          fullName: parentUser.full_name || parentUser.id,
          email: parentUser.email || `${parentUser.id}@qaaq.placeholder`,
          password: '1234koihai', // Liberal authentication password
          userType: parentUser.current_ship_name ? 'sailor' : 'local',
          isAdmin: parentUser.is_platform_admin || false,
          rank: parentUser.maritime_rank || '',
          maritimeRank: parentUser.maritime_rank,
          shipName: parentUser.current_ship_name || '',
          currentShipName: parentUser.current_ship_name,
          imoNumber: parentUser.current_ship_imo || '',
          currentShipIMO: parentUser.current_ship_imo,
          city: parentUser.current_city || '',
          currentCity: parentUser.current_city,
          country: parentUser.current_country || '',
          nationality: parentUser.nationality,
          latitude: parseFloat(parentUser.current_latitude) || 0,
          longitude: parseFloat(parentUser.current_longitude) || 0,
          currentLatitude: parseFloat(parentUser.current_latitude) || null,
          currentLongitude: parseFloat(parentUser.current_longitude) || null,
          whatsAppNumber: parentUser.whatsapp_number,
          whatsAppProfilePictureUrl: parentUser.whatsapp_profile_picture_url,
          whatsAppDisplayName: parentUser.whatsapp_display_name,
          questionCount: parentUser.question_count || 0,
          answerCount: parentUser.answer_count || 0,
          hasCompletedOnboarding: parentUser.has_completed_onboarding || false,
          isPlatformAdmin: parentUser.is_platform_admin || false,
          isVerified: true,
          loginCount: 0,
          lastLogin: parentUser.last_login_at ? new Date(parentUser.last_login_at) : new Date(),
          lastUpdated: parentUser.last_updated ? new Date(parentUser.last_updated) : new Date(),
          createdAt: parentUser.created_at ? new Date(parentUser.created_at) : new Date(),
          locationSource: parentUser.current_latitude ? 'device' : 'city',
          locationUpdatedAt: new Date()
        };
        
        // Insert into new database
        await db.insert(users).values(transformedUser);
        migrationResults.successful++;
        
        if (migrationResults.successful % 50 === 0) {
          console.log(`🔄 Migrated ${migrationResults.successful} users...`);
        }
        
      } catch (error) {
        console.error(`❌ Failed to migrate user ${parentUser.id}:`, error);
        migrationResults.errors++;
      }
    }
    
    console.log('\n✅ Migration completed!');
    console.log(`📊 Results:`);
    console.log(`   Successfully migrated: ${migrationResults.successful}`);
    console.log(`   Skipped (already exist): ${migrationResults.skipped}`);
    console.log(`   Errors: ${migrationResults.errors}`);
    
    // Step 4: Create indexes for performance
    console.log('🔧 Creating database indexes...');
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(id) WHERE id LIKE '+%'`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_users_whatsapp ON users("whatsAppNumber")`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_users_location ON users("currentLatitude", "currentLongitude")`);
    
    console.log('🎉 Database migration and optimization complete!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  } finally {
    await parentPool.end();
  }
}

export async function testNewAuthentication() {
  console.log('\n🔐 Testing robust authentication system...');
  
  try {
    // Test with Chiru's credentials
    const chiruTest = await db.query('SELECT * FROM users WHERE id = $1', ['+919035283755']);
    if (chiruTest.rows.length > 0) {
      const user = chiruTest.rows[0];
      console.log(`✅ Chiru found in new database:`);
      console.log(`   Name: ${user.fullName || user.full_name}`);
      console.log(`   Questions: ${user.questionCount || user.question_count}`);
      console.log(`   Rank: ${user.maritimeRank || user.maritime_rank}`);
      console.log(`   Ship: ${user.currentShipName || user.current_ship_name}`);
    } else {
      console.log(`❌ Chiru not found in new database`);
    }
    
    // Test duplicate detection
    const duplicateTest = await db.query(`
      SELECT id, "fullName", email, "whatsAppNumber" 
      FROM users 
      WHERE id LIKE '%919035283755%' OR email LIKE '%chiru%' OR "fullName" ILIKE '%chiru%'
    `);
    
    console.log(`🔍 Potential duplicates for Chiru: ${duplicateTest.rows.length}`);
    duplicateTest.rows.forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.id} - ${row.fullName} (${row.email})`);
    });
    
  } catch (error) {
    console.error('❌ Authentication test failed:', error);
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateParentData()
    .then(() => testNewAuthentication())
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}