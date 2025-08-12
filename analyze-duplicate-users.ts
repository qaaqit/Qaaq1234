import { db } from './server/db';

async function analyzeUserCityData() {
  try {
    console.log('🔍 Analyzing current_city data in users table...');
    
    // Check total users and those with current_city data
    const cityStats = await db.execute(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN current_city IS NOT NULL AND current_city != '' THEN 1 END) as users_with_current_city,
        COUNT(CASE WHEN city IS NOT NULL AND city != '' THEN 1 END) as users_with_city,
        COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as users_with_coords
      FROM users
    `);
    
    console.log('📊 User location statistics:', cityStats.rows[0]);
    
    // Get sample users with current_city data
    const usersWithCurrentCity = await db.execute(`
      SELECT full_name, current_city, city, country, whatsapp_number, latitude, longitude
      FROM users 
      WHERE current_city IS NOT NULL AND current_city != ''
      ORDER BY full_name
      LIMIT 20
    `);
    
    console.log(`\n🏙️ Users with current_city data (${usersWithCurrentCity.rows.length} found):`);
    usersWithCurrentCity.rows.forEach((user, i) => {
      console.log(`${i+1}. ${user.full_name || 'Maritime Professional'} [${user.whatsapp_number}]`);
      console.log(`   Current City: ${user.current_city}`);
      console.log(`   City: ${user.city || 'None'}`);
      console.log(`   Country: ${user.country || 'None'}`);
      console.log(`   Coordinates: ${user.latitude || 'None'}, ${user.longitude || 'None'}\n`);
    });
    
    // Check unique current_city values
    const uniqueCities = await db.execute(`
      SELECT current_city, COUNT(*) as user_count
      FROM users 
      WHERE current_city IS NOT NULL AND current_city != ''
      GROUP BY current_city
      ORDER BY user_count DESC
    `);
    
    console.log('🌆 Unique current_city values:');
    uniqueCities.rows.forEach((city, i) => {
      console.log(`${i+1}. ${city.current_city}: ${city.user_count} users`);
    });
    
    // Check if we can update coordinates for users with current_city but no coordinates
    const needCoords = await db.execute(`
      SELECT current_city, COUNT(*) as count
      FROM users 
      WHERE current_city IS NOT NULL AND current_city != ''
        AND (latitude IS NULL OR longitude IS NULL)
      GROUP BY current_city
    `);
    
    console.log('\n📍 Cities needing coordinates:');
    needCoords.rows.forEach((city, i) => {
      console.log(`${i+1}. ${city.current_city}: ${city.count} users need coordinates`);
    });
    
  } catch (error) {
    console.error('❌ Error analyzing user city data:', error);
  }
}

analyzeUserCityData().then(() => process.exit(0));