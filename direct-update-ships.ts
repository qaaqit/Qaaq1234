import { db } from './server/db';

async function directUpdateShips() {
  try {
    console.log('🚢 Directly updating ship data with real vessel positions...\n');
    
    // Update GFS Galaxy
    console.log('📍 Updating GFS Galaxy...');
    const gfsResult = await db.execute(`
      UPDATE users 
      SET 
        current_ship_name = 'GFS Galaxy',
        current_ship_imo = '9401271',
        current_latitude = 26.45551,
        current_longitude = 56.61817,
        location_source = 'Vessel Tracking'
      WHERE 
        (current_ship_name = 'GFS Galaxy' OR current_ship_imo = '9734567')
        AND onboard_status = 'ONBOARD'
      RETURNING full_name
    `);
    console.log(`   Updated ${gfsResult.rows.length} users for GFS Galaxy`);
    
    // Update Ocean Pioneer to COSCO ADEN
    console.log('\n📍 Updating Ocean Pioneer to COSCO ADEN...');
    const coscoResult = await db.execute(`
      UPDATE users 
      SET 
        current_ship_name = 'COSCO ADEN',
        current_ship_imo = '9484003',
        current_latitude = 1.2044,
        current_longitude = 103.5586,
        location_source = 'Vessel Tracking'
      WHERE 
        current_ship_name = 'Ocean Pioneer'
        AND onboard_status = 'ONBOARD'
      RETURNING full_name
    `);
    console.log(`   Updated ${coscoResult.rows.length} users for COSCO ADEN`);
    
    // Update SPIL NIKEN
    console.log('\n📍 Updating SPIL NIKEN...');
    const spilResult = await db.execute(`
      UPDATE users 
      SET 
        current_ship_name = 'SPIL NIKEN',
        current_ship_imo = '9273947',
        current_latitude = -0.6856,
        current_longitude = 106.9856,
        location_source = 'Vessel Tracking'
      WHERE 
        LOWER(current_ship_name) = 'spil niken'
        AND onboard_status = 'ONBOARD'
      RETURNING full_name
    `);
    console.log(`   Updated ${spilResult.rows.length} users for SPIL NIKEN`);
    
    // Get all onboard users to see results
    console.log('\n📊 All Onboard Users After Updates:');
    const allOnboard = await db.execute(`
      SELECT 
        full_name,
        whatsapp_number,
        current_ship_name,
        current_ship_imo,
        current_latitude,
        current_longitude,
        location_source
      FROM users
      WHERE onboard_status = 'ONBOARD'
      ORDER BY current_ship_name
    `);
    
    allOnboard.rows.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.full_name} (${user.whatsapp_number})`);
      console.log(`   Ship: ${user.current_ship_name || 'Unknown'}`);
      if (user.current_ship_imo) {
        console.log(`   IMO: ${user.current_ship_imo}`);
      }
      if (user.current_latitude && user.current_longitude) {
        console.log(`   Position: ${user.current_latitude.toFixed(4)}, ${user.current_longitude.toFixed(4)}`);
        console.log(`   Source: ${user.location_source || 'Unknown'}`);
      } else {
        console.log(`   Position: Not available`);
      }
    });
    
    // Summary
    const summary = await db.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(current_ship_imo) as with_imo,
        COUNT(CASE WHEN location_source = 'Vessel Tracking' THEN 1 END) as with_tracking
      FROM users
      WHERE onboard_status = 'ONBOARD'
    `);
    
    console.log('\n📈 Summary:');
    console.log(`   Total onboard users: ${summary.rows[0].total}`);
    console.log(`   Users with IMO numbers: ${summary.rows[0].with_imo}`);
    console.log(`   Users with vessel tracking: ${summary.rows[0].with_tracking}`);
    
  } catch (error) {
    console.error('Error updating ships:', error);
  } finally {
    process.exit(0);
  }
}

directUpdateShips();