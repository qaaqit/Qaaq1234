import { pool } from './db';

async function verifyShipPositions() {
  try {
    const client = await pool.connect();
    
    console.log('🗺️ Verifying ship positions on map...\n');
    
    // Get all users with their current positions
    const result = await client.query(`
      SELECT 
        id,
        first_name,
        last_name,
        current_ship_name,
        onboard_status,
        current_latitude,
        current_longitude,
        city,
        current_city,
        ship_position_updated_at
      FROM users 
      WHERE (onboard_status = 'ONBOARD' OR current_ship_name IS NOT NULL)
      ORDER BY onboard_status DESC, ship_position_updated_at DESC
    `);
    
    console.log(`📊 Found ${result.rows.length} users with ship assignments:\n`);
    
    const onboardUsers = [];
    const ashore = [];
    
    result.rows.forEach(user => {
      const userInfo = {
        name: `${user.first_name} ${user.last_name}`.trim(),
        phone: user.id,
        ship: user.current_ship_name || 'No ship',
        status: user.onboard_status || 'Unknown',
        lat: user.current_latitude ? parseFloat(user.current_latitude) : null,
        lng: user.current_longitude ? parseFloat(user.current_longitude) : null,
        city: user.city || user.current_city || 'Unknown',
        lastUpdated: user.ship_position_updated_at
      };
      
      if (user.onboard_status === 'ONBOARD') {
        onboardUsers.push(userInfo);
      } else {
        ashore.push(userInfo);
      }
    });
    
    console.log('🚢 ONBOARD USERS (Ship Coordinates):');
    console.log('═'.repeat(60));
    
    onboardUsers.forEach((user, index) => {
      const coordinates = user.lat && user.lng ? 
        `${user.lat.toFixed(4)}, ${user.lng.toFixed(4)}` : 
        'No coordinates';
      
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   📱 Phone: ${user.phone}`);
      console.log(`   🚢 Ship: ${user.ship}`);
      console.log(`   📍 Ship Position: ${coordinates}`);
      console.log(`   🏠 Home City: ${user.city}`);
      console.log(`   ⏰ Last Updated: ${user.lastUpdated || 'Never'}\n`);
    });
    
    console.log('🏖️ ASHORE USERS (City Coordinates):');
    console.log('═'.repeat(60));
    
    ashore.slice(0, 5).forEach((user, index) => {
      const coordinates = user.lat && user.lng ? 
        `${user.lat.toFixed(4)}, ${user.lng.toFixed(4)}` : 
        'No coordinates';
      
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   📱 Phone: ${user.phone}`);
      console.log(`   🚢 Last Ship: ${user.ship}`);
      console.log(`   📍 City Position: ${coordinates}`);
      console.log(`   🏠 City: ${user.city}\n`);
    });
    
    if (ashore.length > 5) {
      console.log(`... and ${ashore.length - 5} more ashore users\n`);
    }
    
    // Calculate map boundaries for onboard users
    if (onboardUsers.length > 0) {
      const lats = onboardUsers.filter(u => u.lat).map(u => u.lat);
      const lngs = onboardUsers.filter(u => u.lng).map(u => u.lng);
      
      if (lats.length > 0 && lngs.length > 0) {
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        
        console.log('🗺️ MAP COVERAGE FOR ONBOARD USERS:');
        console.log('-'.repeat(40));
        console.log(`Northern Boundary: ${maxLat.toFixed(4)}°N`);
        console.log(`Southern Boundary: ${minLat.toFixed(4)}°N`);
        console.log(`Eastern Boundary: ${maxLng.toFixed(4)}°E`);
        console.log(`Western Boundary: ${minLng.toFixed(4)}°E`);
        console.log(`Coverage Area: Global maritime positions\n`);
      }
    }
    
    console.log('📍 MAP DISPLAY LOGIC:');
    console.log('-'.repeat(40));
    console.log('✅ ONBOARD users → Show at ship coordinates (real maritime positions)');
    console.log('🏠 ASHORE users → Show at city coordinates (home/port cities)');
    console.log('🔍 Search "onboard" → Filter for sailing users only');
    console.log('📱 User cards → Display ship name and onboard status\n');
    
    client.release();
    console.log('✅ Ship position verification complete!');
    
  } catch (error) {
    console.error('❌ Error verifying ship positions:', error);
  }
}

verifyShipPositions();