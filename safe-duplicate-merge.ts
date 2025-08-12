import { db } from './server/db';

async function safeLocationMerge() {
  try {
    console.log('🔄 Starting safe location merge from bhangar_users to users table...');
    
    // Step 1: Remove all sample/enriched location data
    console.log('📝 Step 1: Removing sample location data...');
    
    const removeResult = await db.execute(`
      UPDATE users 
      SET 
        city = NULL,
        country = NULL,
        latitude = NULL,
        longitude = NULL,
        location_source = NULL
      WHERE location_source = 'enriched'
    `);
    
    console.log('✅ Removed sample location data');
    
    // Step 2: Copy authentic location data from bhangar_users where WhatsApp numbers match
    console.log('📝 Step 2: Copying authentic location data from bhangar_users...');
    
    const updateResult = await db.execute(`
      UPDATE users 
      SET 
        city = CASE 
          WHEN b.current_city IS NOT NULL AND b.current_city != '' THEN b.current_city
          WHEN b.permanent_city IS NOT NULL AND b.permanent_city != '' THEN b.permanent_city
          ELSE users.city
        END,
        country = CASE 
          WHEN b.current_country IS NOT NULL AND b.current_country != '' THEN b.current_country
          WHEN b.permanent_country IS NOT NULL AND b.permanent_country != '' THEN b.permanent_country
          WHEN b.truecaller_location IS NOT NULL AND b.truecaller_location != '' AND b.truecaller_location != 'India' THEN b.truecaller_location
          WHEN b.truecaller_location = 'India' THEN 'India'
          ELSE users.country
        END,
        location_source = 'authentic'
      FROM bhangar_users b
      WHERE users.whatsapp_number = b.whatsapp_number
        AND b.whatsapp_number IS NOT NULL
        AND b.whatsapp_number != ''
        AND (
          (b.current_city IS NOT NULL AND b.current_city != '') OR
          (b.permanent_city IS NOT NULL AND b.permanent_city != '') OR
          (b.current_country IS NOT NULL AND b.current_country != '') OR
          (b.permanent_country IS NOT NULL AND b.permanent_country != '') OR
          (b.truecaller_location IS NOT NULL AND b.truecaller_location != '')
        )
    `);
    
    console.log('✅ Copied authentic location data from bhangar_users');
    
    // Step 3: Get coordinates for authentic city locations
    console.log('📝 Step 3: Adding coordinates for authentic cities...');
    
    // Major maritime cities coordinates lookup
    const cityCoords = {
      'Mumbai': { lat: 19.0760, lng: 72.8777 },
      'Chennai': { lat: 13.0827, lng: 80.2707 },
      'Kochi': { lat: 9.9312, lng: 76.2673 },
      'Kolkata': { lat: 22.5726, lng: 88.3639 },
      'Visakhapatnam': { lat: 17.6868, lng: 83.2185 },
      'Singapore': { lat: 1.3521, lng: 103.8198 },
      'Dubai': { lat: 25.2048, lng: 55.2708 },
      'Rotterdam': { lat: 51.9225, lng: 4.4792 },
      'Hamburg': { lat: 53.5511, lng: 9.9937 },
      'Shanghai': { lat: 31.2304, lng: 121.4737 },
      'Hong Kong': { lat: 22.3193, lng: 114.1694 },
      'Busan': { lat: 35.1796, lng: 129.0756 },
      'Antwerp': { lat: 51.2194, lng: 4.4025 },
      'Los Angeles': { lat: 34.0522, lng: -118.2437 },
      'New York': { lat: 40.7128, lng: -74.0060 },
      'Norfolk': { lat: 36.8468, lng: -76.2852 },
      'Fujairah': { lat: 25.1164, lng: 56.3265 },
      'Jebel Ali': { lat: 25.0144, lng: 55.1274 },
      'Port Said': { lat: 31.2653, lng: 32.3019 },
      'Piraeus': { lat: 37.9470, lng: 23.6347 },
      'Tokyo': { lat: 35.6762, lng: 139.6503 },
      'Manila': { lat: 14.5995, lng: 120.9842 },
      'Karachi': { lat: 24.8607, lng: 67.0011 },
      'Colombo': { lat: 6.9271, lng: 79.8612 },
      'Chittagong': { lat: 22.3569, lng: 91.7832 }
    };
    
    // Add coordinates for known cities
    for (const [city, coords] of Object.entries(cityCoords)) {
      await db.execute(`
        UPDATE users 
        SET 
          latitude = ${coords.lat},
          longitude = ${coords.lng}
        WHERE city = '${city}' AND location_source = 'authentic'
      `);
    }
    
    // For India country without specific city, use general coordinates
    await db.execute(`
      UPDATE users 
      SET 
        latitude = 19.0760,
        longitude = 72.8777
      WHERE country = 'India' AND city IS NULL AND location_source = 'authentic'
    `);
    
    console.log('✅ Added coordinates for authentic locations');
    
    // Step 4: Verify the merge results
    console.log('📊 Step 4: Verifying authentic location data...');
    
    const finalStats = await db.execute(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN city IS NOT NULL AND city != '' THEN 1 END) as users_with_city,
        COUNT(CASE WHEN country IS NOT NULL AND country != '' THEN 1 END) as users_with_country,
        COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as users_with_coords,
        COUNT(CASE WHEN location_source = 'authentic' THEN 1 END) as authentic_locations
      FROM users
    `);
    
    console.log('📈 Final statistics:', finalStats.rows[0]);
    
    // Sample of users with authentic location data
    const sampleUsers = await db.execute(`
      SELECT full_name, city, country, whatsapp_number, location_source
      FROM users 
      WHERE location_source = 'authentic'
      ORDER BY full_name
      LIMIT 15
    `);
    
    console.log('\n🌍 Sample users with authentic location data:');
    sampleUsers.rows.forEach((user, i) => {
      console.log(`${i+1}. ${user.full_name || 'Maritime Professional'} [${user.whatsapp_number}]`);
      console.log(`   Location: ${user.city || 'No city'}, ${user.country || 'No country'}`);
      console.log(`   Source: ${user.location_source}\n`);
    });
    
  } catch (error) {
    console.error('❌ Error during safe location merge:', error);
  }
}

safeLocationMerge().then(() => process.exit(0));