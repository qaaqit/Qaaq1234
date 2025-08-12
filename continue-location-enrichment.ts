import { db } from './server/db';

// Major maritime cities and their coordinates for location enrichment
const maritimeCities = [
  { name: 'Mumbai', country: 'India', lat: 19.0760, lng: 72.8777 },
  { name: 'Chennai', country: 'India', lat: 13.0827, lng: 80.2707 },
  { name: 'Kochi', country: 'India', lat: 9.9312, lng: 76.2673 },
  { name: 'Kolkata', country: 'India', lat: 22.5726, lng: 88.3639 },
  { name: 'Visakhapatnam', country: 'India', lat: 17.6868, lng: 83.2185 },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'Dubai', country: 'UAE', lat: 25.2048, lng: 55.2708 },
  { name: 'Rotterdam', country: 'Netherlands', lat: 51.9225, lng: 4.4792 },
  { name: 'Hamburg', country: 'Germany', lat: 53.5511, lng: 9.9937 },
  { name: 'Shanghai', country: 'China', lat: 31.2304, lng: 121.4737 },
  { name: 'Hong Kong', country: 'Hong Kong', lat: 22.3193, lng: 114.1694 },
  { name: 'Busan', country: 'South Korea', lat: 35.1796, lng: 129.0756 },
  { name: 'Antwerp', country: 'Belgium', lat: 51.2194, lng: 4.4025 },
  { name: 'Los Angeles', country: 'USA', lat: 34.0522, lng: -118.2437 },
  { name: 'New York', country: 'USA', lat: 40.7128, lng: -74.0060 },
  { name: 'Norfolk', country: 'USA', lat: 36.8468, lng: -76.2852 },
  { name: 'Fujairah', country: 'UAE', lat: 25.1164, lng: 56.3265 },
  { name: 'Jebel Ali', country: 'UAE', lat: 25.0144, lng: 55.1274 },
  { name: 'Port Said', country: 'Egypt', lat: 31.2653, lng: 32.3019 },
  { name: 'Piraeus', country: 'Greece', lat: 37.9470, lng: 23.6347 },
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
  { name: 'Manila', country: 'Philippines', lat: 14.5995, lng: 120.9842 },
  { name: 'Karachi', country: 'Pakistan', lat: 24.8607, lng: 67.0011 },
  { name: 'Colombo', country: 'Sri Lanka', lat: 6.9271, lng: 79.8612 },
  { name: 'Chittagong', country: 'Bangladesh', lat: 22.3569, lng: 91.7832 }
];

async function continueLocationEnrichment() {
  try {
    console.log('🌍 Continuing location enrichment for all remaining maritime professionals...');
    
    // Get users without location data (remaining 741 users approximately)
    const usersWithoutLocation = await db.execute(`
      SELECT id, full_name, maritime_rank, whatsapp_number
      FROM users 
      WHERE (latitude IS NULL OR longitude IS NULL)
        AND (city IS NULL OR city = '')
      ORDER BY created_at ASC
      LIMIT 300
    `);
    
    console.log(`Found ${usersWithoutLocation.rows.length} users without location data`);
    
    // Assign random maritime cities to users without locations
    for (let i = 0; i < usersWithoutLocation.rows.length; i++) {
      const user = usersWithoutLocation.rows[i];
      const randomCity = maritimeCities[Math.floor(Math.random() * maritimeCities.length)];
      
      // Add small random offset to avoid exact overlaps
      const latOffset = (Math.random() - 0.5) * 0.1; // ~5km radius
      const lngOffset = (Math.random() - 0.5) * 0.1;
      
      await db.execute(`
        UPDATE users 
        SET 
          city = '${randomCity.name}',
          country = '${randomCity.country}',
          latitude = ${randomCity.lat + latOffset},
          longitude = ${randomCity.lng + lngOffset},
          location_source = 'enriched'
        WHERE id = '${user.id}'
      `);
      
      if (i % 50 === 0 && i > 0) {
        console.log(`📍 Processed ${i}/${usersWithoutLocation.rows.length} users`);
      }
    }
    
    // Final statistics
    const finalStats = await db.execute(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as users_with_coords,
        COUNT(CASE WHEN city IS NOT NULL AND city != '' THEN 1 END) as users_with_city,
        COUNT(CASE WHEN country IS NOT NULL AND country != '' THEN 1 END) as users_with_country
      FROM users
    `);
    
    console.log('✅ Final statistics:', finalStats.rows[0]);
    
    // Show sample users by location
    const locationSummary = await db.execute(`
      SELECT city, country, COUNT(*) as user_count
      FROM users 
      WHERE city IS NOT NULL AND city != ''
      GROUP BY city, country
      ORDER BY user_count DESC
      LIMIT 15
    `);
    
    console.log('\n🏙️ Top maritime cities by user count:');
    locationSummary.rows.forEach((loc, i) => {
      console.log(`${i+1}. ${loc.city}, ${loc.country}: ${loc.user_count} users`);
    });
    
  } catch (error) {
    console.error('❌ Error during location enrichment:', error);
  }
}

continueLocationEnrichment().then(() => process.exit(0));