import { db } from './server/db';

async function checkOnboardUsers() {
  try {
    console.log('🚢 Checking for users currently onboard ships...');
    
    // Check users table for onboard status
    const onboardUsersQuery = await db.execute(`
      SELECT 
        full_name, 
        whatsapp_number, 
        ship_name, 
        current_ship_name,
        imo_number,
        current_ship_imo,
        rank, 
        onboard_status,
        onboard_since,
        current_city,
        city,
        country,
        latitude,
        longitude,
        current_latitude,
        current_longitude,
        location_source
      FROM users 
      WHERE (
        onboard_status ILIKE '%onboard%' OR 
        onboard_status ILIKE '%sailing%' OR
        onboard_status ILIKE '%at sea%' OR
        ship_name IS NOT NULL OR
        current_ship_name IS NOT NULL OR
        imo_number IS NOT NULL OR
        current_ship_imo IS NOT NULL
      )
      ORDER BY current_ship_name, ship_name, full_name
    `);
    
    console.log(`📊 Found ${onboardUsersQuery.rows.length} users with ship-related data in users table`);
    
    if (onboardUsersQuery.rows.length > 0) {
      console.log('\n🚢 Users with ship information:');
      onboardUsersQuery.rows.forEach((user, i) => {
        console.log(`${i+1}. ${user.full_name || 'Maritime Professional'} [${user.whatsapp_number}]`);
        console.log(`   Current Ship: ${user.current_ship_name || user.ship_name || 'Not specified'}`);
        console.log(`   IMO: ${user.current_ship_imo || user.imo_number || 'Not specified'}`);
        console.log(`   Rank: ${user.rank || 'Not specified'}`);
        console.log(`   Onboard Status: ${user.onboard_status || 'Not specified'}`);
        console.log(`   Onboard Since: ${user.onboard_since || 'Not specified'}`);
        console.log(`   Location: ${user.city || user.current_city || 'No location'}`);
        console.log(`   Ship Coordinates: ${user.current_latitude || user.latitude || 'None'}, ${user.current_longitude || user.longitude || 'None'}\n`);
      });
    }
    
    // Check bhangar_users for more comprehensive ship data
    console.log('🔍 Checking bhangar_users for ship assignments...');
    
    const bhangarShipData = await db.execute(`
      SELECT 
        full_name,
        whatsapp_number,
        current_ship_name,
        current_ship_imo,
        current_ship_mmsi,
        last_vessel_name,
        maritime_rank,
        onboard_status,
        onboard_since,
        current_city,
        permanent_city,
        truecaller_location,
        ship_position_updated_at
      FROM bhangar_users 
      WHERE (
        current_ship_name IS NOT NULL AND current_ship_name != '' OR
        current_ship_imo IS NOT NULL AND current_ship_imo != '' OR
        last_vessel_name IS NOT NULL AND last_vessel_name != '' OR
        onboard_status ILIKE '%onboard%' OR 
        onboard_status ILIKE '%sailing%' OR
        onboard_status ILIKE '%at sea%'
      )
      ORDER BY current_ship_name, last_vessel_name, full_name
    `);
    
    console.log(`📊 Found ${bhangarShipData.rows.length} users with ship data in bhangar_users table`);
    
    if (bhangarShipData.rows.length > 0) {
      console.log('\n⚓ Maritime professionals with ship assignments:');
      
      // Group by ship
      const shipGroups = {};
      bhangarShipData.rows.forEach(user => {
        const shipKey = user.current_ship_name || user.last_vessel_name || user.current_ship_imo || 'Unknown Ship';
        if (!shipGroups[shipKey]) {
          shipGroups[shipKey] = [];
        }
        shipGroups[shipKey].push(user);
      });
      
      Object.entries(shipGroups).forEach(([shipName, crew]) => {
        console.log(`\n🚢 ${shipName}:`);
        crew.forEach((user, i) => {
          console.log(`  ${i+1}. ${user.full_name || 'Maritime Professional'} [${user.whatsapp_number}]`);
          console.log(`     Rank: ${user.maritime_rank || 'Not specified'}`);
          console.log(`     Onboard Status: ${user.onboard_status || 'Not specified'}`);
          console.log(`     Current Ship IMO: ${user.current_ship_imo || 'Not specified'}`);
          console.log(`     MMSI: ${user.current_ship_mmsi || 'Not specified'}`);
          console.log(`     Onboard Since: ${user.onboard_since || 'Not specified'}`);
          console.log(`     Position Updated: ${user.ship_position_updated_at || 'Never'}`);
        });
      });
    }
    
    // Check for specific onboard keywords in current_city (sometimes users put ship location there)
    const shipLocationKeywords = await db.execute(`
      SELECT 
        full_name,
        whatsapp_number,
        current_city,
        city,
        country,
        rank
      FROM users 
      WHERE current_city ILIKE '%sea%' OR 
            current_city ILIKE '%ocean%' OR
            current_city ILIKE '%ship%' OR
            current_city ILIKE '%vessel%' OR
            current_city ILIKE '%onboard%' OR
            current_city ILIKE '%sailing%'
      ORDER BY current_city
    `);
    
    console.log(`\n🌊 Found ${shipLocationKeywords.rows.length} users with sea/ship keywords in location:`);
    shipLocationKeywords.rows.forEach((user, i) => {
      console.log(`${i+1}. ${user.full_name || 'Maritime Professional'} [${user.whatsapp_number}]`);
      console.log(`   Current City: ${user.current_city}`);
      console.log(`   Rank: ${user.rank || 'Not specified'}\n`);
    });
    
    // Summary statistics
    console.log('\n📈 Summary:');
    console.log(`- Users with ship data in main table: ${onboardUsersQuery.rows.length}`);
    console.log(`- Users with ship assignments in bhangar_users: ${bhangarShipData.rows.length}`);
    console.log(`- Users with sea/ship location keywords: ${shipLocationKeywords.rows.length}`);
    
    const totalOnboard = new Set([
      ...onboardUsersQuery.rows.map(u => u.whatsapp_number),
      ...bhangarShipData.rows.map(u => u.whatsapp_number),
      ...shipLocationKeywords.rows.map(u => u.whatsapp_number)
    ]).size;
    
    console.log(`- Total unique users potentially onboard: ${totalOnboard}`);
    
  } catch (error) {
    console.error('❌ Error checking onboard users:', error);
  }
}

checkOnboardUsers().then(() => process.exit(0));