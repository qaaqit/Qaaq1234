import { db } from './server/db';

async function checkMergeBhangarData() {
  try {
    console.log('🔍 Analyzing bhangar_users and users tables for merge...');
    
    // Check if users already have data from bhangar_users
    const userComparison = await db.execute(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users_count,
        (SELECT COUNT(*) FROM bhangar_users) as bhangar_count,
        (SELECT COUNT(*) FROM users WHERE whats_app_number IN (SELECT whatsapp_number FROM bhangar_users)) as overlap_count
    `);
    
    console.log('Database comparison:', userComparison.rows[0]);
    
    // Find users that exist in bhangar but not in main users table
    const missingUsers = await db.execute(`
      SELECT COUNT(*) as missing_count
      FROM bhangar_users b
      WHERE b.whatsapp_number NOT IN (SELECT whats_app_number FROM users WHERE whats_app_number IS NOT NULL)
    `);
    
    console.log('Users in bhangar_users but not in users table:', missingUsers.rows[0].missing_count);
    
    // Sample users from bhangar with good location data
    const locationUsers = await db.execute(`
      SELECT b.full_name, b.whatsapp_number, b.maritime_rank, 
             b.current_city, b.current_country, b.truecaller_location,
             u.id as user_exists
      FROM bhangar_users b
      LEFT JOIN users u ON b.whatsapp_number = u.whats_app_number
      WHERE (b.current_city IS NOT NULL AND b.current_city != '') 
         OR (b.truecaller_location IS NOT NULL AND b.truecaller_location != '')
      LIMIT 20
    `);
    
    console.log('\n📍 Users with location data:');
    locationUsers.rows.forEach((user, i) => {
      const status = user.user_exists ? '✅ EXISTS' : '❌ MISSING';
      console.log(`${i+1}. ${user.full_name} [${user.whatsapp_number}] ${status}`);
      console.log(`   Current: ${user.current_city || 'No city'}, ${user.current_country || 'No country'}`);
      console.log(`   TrueCaller: ${user.truecaller_location || 'No location'}`);
      console.log(`   Rank: ${user.maritime_rank || 'No rank'}\n`);
    });
    
    // Check location data quality in bhangar_users
    const locationQuality = await db.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN truecaller_location = 'India' THEN 1 END) as india_count,
        COUNT(CASE WHEN truecaller_location IS NOT NULL AND truecaller_location != '' AND truecaller_location != 'India' THEN 1 END) as specific_location_count,
        COUNT(CASE WHEN current_city IS NOT NULL AND current_city != '' THEN 1 END) as has_city_count
      FROM bhangar_users
    `);
    
    console.log('📊 Location data quality:', locationQuality.rows[0]);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkMergeBhangarData().then(() => process.exit(0));