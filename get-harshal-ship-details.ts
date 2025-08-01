import { pool } from './server/db';

async function getHarshalShipDetails() {
  try {
    const client = await pool.connect();
    
    const userId = '+917972911743'; // Harshal Jichkar
    
    console.log('Getting Harshal Jichkar\'s ship details and onboard status...\n');
    
    // Get specific ship-related information
    const userResult = await client.query(`
      SELECT 
        first_name,
        last_name,
        maritime_rank,
        city,
        onboard_status,
        current_ship_name,
        current_ship_imo,
        current_ship_mmsi,
        last_ship,
        last_vessel_name,
        last_vessel_type,
        last_vessel_dwt,
        last_vessel_grt,
        last_vessel_engine_type,
        last_vessel_horse_power,
        vessel_name,
        vessel_type,
        onboard_since,
        ship_position_updated_at,
        previous_vessels,
        vessel_types_experience,
        ship_types,
        preferred_vessel_types
      FROM users 
      WHERE id = $1
    `, [userId]);
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      client.release();
      return;
    }
    
    const user = userResult.rows[0];
    
    console.log('👤 HARSHAL JICHKAR - SHIP STATUS REPORT');
    console.log('═'.repeat(50));
    
    console.log('\n📱 Basic Info:');
    console.log(`Name: ${user.first_name} ${user.last_name}`);
    console.log(`Rank: ${user.maritime_rank || 'Not specified'}`);
    console.log(`Location: ${user.city || 'Not specified'}`);
    
    console.log('\n🚢 CURRENT SHIP DETAILS:');
    console.log(`Ship Name: ${user.current_ship_name || user.vessel_name || 'NOT SPECIFIED'}`);
    console.log(`IMO Number: ${user.current_ship_imo || 'NOT SPECIFIED'}`);
    console.log(`MMSI: ${user.current_ship_mmsi || 'NOT SPECIFIED'}`);
    
    console.log('\n⚓ ONBOARD STATUS:');
    const onboardStatus = user.onboard_status;
    if (onboardStatus) {
      if (onboardStatus.toLowerCase().includes('onboard') || onboardStatus.toLowerCase().includes('sailing')) {
        console.log(`Status: ✅ ONBOARD (${onboardStatus})`);
      } else if (onboardStatus.toLowerCase().includes('off') || onboardStatus.toLowerCase().includes('shore')) {
        console.log(`Status: 🏖️ SIGNED OFF (${onboardStatus})`);
      } else {
        console.log(`Status: ${onboardStatus}`);
      }
    } else {
      console.log('Status: ❓ NOT SPECIFIED');
    }
    
    if (user.onboard_since) {
      console.log(`Onboard Since: ${user.onboard_since}`);
    }
    
    if (user.ship_position_updated_at) {
      console.log(`Position Last Updated: ${user.ship_position_updated_at}`);
    }
    
    console.log('\n🛳️ LAST SHIP DETAILS:');
    console.log(`Last Ship: ${user.last_ship || user.last_vessel_name || 'Not specified'}`);
    console.log(`Vessel Type: ${user.last_vessel_type || user.vessel_type || 'Not specified'}`);
    console.log(`DWT: ${user.last_vessel_dwt || 'Not specified'}`);
    console.log(`GRT: ${user.last_vessel_grt || 'Not specified'}`);
    console.log(`Engine Type: ${user.last_vessel_engine_type || 'Not specified'}`);
    console.log(`Horse Power: ${user.last_vessel_horse_power || 'Not specified'}`);
    
    console.log('\n📋 VESSEL EXPERIENCE:');
    if (user.vessel_types_experience && user.vessel_types_experience.length > 0) {
      console.log(`Experienced with: ${user.vessel_types_experience.join(', ')}`);
    }
    if (user.ship_types && user.ship_types.length > 0) {
      console.log(`Ship Types: ${user.ship_types.join(', ')}`);
    }
    if (user.preferred_vessel_types && user.preferred_vessel_types.length > 0) {
      console.log(`Preferred Types: ${user.preferred_vessel_types.join(', ')}`);
    }
    
    if (user.previous_vessels) {
      console.log('\n🚢 PREVIOUS VESSELS:');
      console.log(user.previous_vessels);
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

getHarshalShipDetails();