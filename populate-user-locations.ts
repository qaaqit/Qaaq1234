import { db } from './server/db';

async function populateUserLocations() {
  try {
    console.log('🗺️ Populating authentic user locations from current_city data...');
    
    // Major maritime cities coordinates lookup
    const cityCoords = {
      'Mumbai': { lat: 19.0760, lng: 72.8777, country: 'India' },
      'Kolkata': { lat: 22.5726, lng: 88.3639, country: 'India' },
      'Pune': { lat: 18.5204, lng: 73.8567, country: 'India' },
      'pune': { lat: 18.5204, lng: 73.8567, country: 'India' },
      'New Delhi': { lat: 28.6139, lng: 77.2090, country: 'India' },
      'Chennai': { lat: 13.0827, lng: 80.2707, country: 'India' },
      'chennai': { lat: 13.0827, lng: 80.2707, country: 'India' },
      'Bengaluru': { lat: 12.9716, lng: 77.5946, country: 'India' },
      'Visakhapatnam': { lat: 17.6868, lng: 83.2185, country: 'India' },
      'Jaipur': { lat: 26.9124, lng: 75.7873, country: 'India' },
      'Patna': { lat: 25.5941, lng: 85.1376, country: 'India' },
      'patna': { lat: 25.5941, lng: 85.1376, country: 'India' },
      'Nashik': { lat: 19.9975, lng: 73.7898, country: 'India' },
      'Lucknow': { lat: 26.8467, lng: 80.9462, country: 'India' },
      'Varanasi': { lat: 25.3176, lng: 82.9739, country: 'India' },
      'Jamshedpur': { lat: 22.8046, lng: 86.2029, country: 'India' },
      'Kochi': { lat: 9.9312, lng: 76.2673, country: 'India' },
      'Mangaluru': { lat: 12.9141, lng: 74.8560, country: 'India' },
      'Surat': { lat: 21.1702, lng: 72.8311, country: 'India' },
      'surat': { lat: 21.1702, lng: 72.8311, country: 'India' },
      'Ahmedabad': { lat: 23.0225, lng: 72.5714, country: 'India' },
      'Chandigarh': { lat: 30.7333, lng: 76.7794, country: 'India' },
      'Hyderabad': { lat: 17.3850, lng: 78.4867, country: 'India' },
      'thrissur': { lat: 10.5276, lng: 76.2144, country: 'India' },
      'hoshiarpur': { lat: 31.5349, lng: 75.9119, country: 'India' },
      'navsari': { lat: 20.9463, lng: 72.9520, country: 'India' },
      'Dhanbad': { lat: 23.7957, lng: 86.4304, country: 'India' },
      'kottayam': { lat: 9.5916, lng: 76.5222, country: 'India' },
      'Solapur': { lat: 17.6599, lng: 75.9064, country: 'India' },
      'hazaribag': { lat: 23.9929, lng: 85.3667, country: 'India' },
      'Mumbra': { lat: 19.1672, lng: 73.0169, country: 'India' },
      'navi mumbai': { lat: 19.0330, lng: 73.0297, country: 'India' },
      'badlapur': { lat: 19.1559, lng: 73.2697, country: 'India' },
      'ratnagiri': { lat: 16.9944, lng: 73.3000, country: 'India' },
      'Sikar': { lat: 27.6094, lng: 75.1399, country: 'India' },
      'Vadalur': { lat: 11.6186, lng: 79.4858, country: 'India' },
      'bangkok': { lat: 13.7563, lng: 100.5018, country: 'Thailand' },
      'Mussoorie': { lat: 30.4598, lng: 78.0664, country: 'India' },
      'KANPUR': { lat: 26.4499, lng: 80.3319, country: 'India' },
      'Lakshadweep': { lat: 10.5667, lng: 72.6417, country: 'India' },
      'bihar': { lat: 25.0961, lng: 85.3131, country: 'India' },
      'kerala': { lat: 10.8505, lng: 76.2711, country: 'India' },
      'tamilnadu': { lat: 11.1271, lng: 78.6569, country: 'India' }
    };
    
    let updatedCount = 0;
    
    // Update users with legitimate city data
    for (const [cityName, coords] of Object.entries(cityCoords)) {
      const result = await db.execute(`
        UPDATE users 
        SET 
          city = '${cityName}',
          country = '${coords.country}',
          latitude = ${coords.lat},
          longitude = ${coords.lng},
          location_source = 'authentic'
        WHERE current_city = '${cityName}'
          AND (city IS NULL OR city = '')
      `);
      
      if (result.rowCount && result.rowCount > 0) {
        console.log(`✅ Updated ${result.rowCount} users in ${cityName}`);
        updatedCount += result.rowCount;
      }
    }
    
    console.log(`\n🎯 Total users updated with authentic city locations: ${updatedCount}`);
    
    // Get final statistics
    const finalStats = await db.execute(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN city IS NOT NULL AND city != '' THEN 1 END) as users_with_city,
        COUNT(CASE WHEN country IS NOT NULL AND country != '' THEN 1 END) as users_with_country,
        COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as users_with_coords,
        COUNT(CASE WHEN location_source = 'authentic' THEN 1 END) as authentic_locations
      FROM users
    `);
    
    console.log('\n📊 Final location statistics:', finalStats.rows[0]);
    
    // Show city distribution
    const cityDistribution = await db.execute(`
      SELECT city, COUNT(*) as user_count
      FROM users 
      WHERE city IS NOT NULL AND city != '' AND location_source = 'authentic'
      GROUP BY city
      ORDER BY user_count DESC
      LIMIT 15
    `);
    
    console.log('\n🏙️ Top cities with maritime professionals:');
    cityDistribution.rows.forEach((city, i) => {
      console.log(`${i+1}. ${city.city}: ${city.user_count} users`);
    });
    
    // Sample users with complete location data
    const sampleUsers = await db.execute(`
      SELECT full_name, city, country, whatsapp_number, latitude, longitude
      FROM users 
      WHERE location_source = 'authentic' AND city IS NOT NULL
      ORDER BY city, full_name
      LIMIT 15
    `);
    
    console.log('\n🌍 Sample maritime professionals with authentic locations:');
    sampleUsers.rows.forEach((user, i) => {
      console.log(`${i+1}. ${user.full_name || 'Maritime Professional'} [${user.whatsapp_number}]`);
      console.log(`   📍 ${user.city}, ${user.country}`);
      console.log(`   📌 ${user.latitude}, ${user.longitude}\n`);
    });
    
  } catch (error) {
    console.error('❌ Error populating user locations:', error);
  }
}

populateUserLocations().then(() => process.exit(0));