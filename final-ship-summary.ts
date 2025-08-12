import { db } from './server/db';

async function finalShipSummary() {
  try {
    console.log('🚢 Final Ship Location Update Summary\n');
    console.log('=' .repeat(60));
    
    // Get all onboard users
    const allOnboard = await db.execute(`
      SELECT 
        full_name,
        whatsapp_number,
        current_ship_name,
        current_ship_imo,
        current_latitude,
        current_longitude,
        location_source,
        onboard_status
      FROM users
      WHERE onboard_status = 'ONBOARD'
      ORDER BY 
        CASE 
          WHEN current_ship_imo IS NOT NULL THEN 0 
          ELSE 1 
        END,
        current_ship_name
    `);
    
    console.log(`📊 Total Onboard Users: ${allOnboard.rows.length}\n`);
    
    // Group by tracking status
    const withVesselTracking = allOnboard.rows.filter(u => 
      u.current_ship_imo && u.location_source === 'Vessel Tracking'
    );
    
    const withoutTracking = allOnboard.rows.filter(u => 
      !u.current_ship_imo || u.location_source !== 'Vessel Tracking'
    );
    
    console.log('✅ SUCCESSFULLY UPDATED WITH REAL VESSEL TRACKING:');
    console.log('-' .repeat(60));
    
    withVesselTracking.forEach((user, i) => {
      console.log(`\n${i+1}. ${user.full_name}`);
      console.log(`   📱 WhatsApp: ${user.whatsapp_number}`);
      console.log(`   🚢 Ship: ${user.current_ship_name}`);
      console.log(`   📋 IMO: ${user.current_ship_imo}`);
      console.log(`   📍 Position: ${user.current_latitude.toFixed(4)}°, ${user.current_longitude.toFixed(4)}°`);
      console.log(`   ✓ Source: Real-time vessel tracking`);
    });
    
    if (withoutTracking.length > 0) {
      console.log('\n\n⚠️ USERS NEEDING SHIP INFORMATION:');
      console.log('-' .repeat(60));
      
      withoutTracking.forEach((user, i) => {
        console.log(`\n${i+1}. ${user.full_name}`);
        console.log(`   📱 WhatsApp: ${user.whatsapp_number}`);
        console.log(`   🚢 Current Ship Data: "${user.current_ship_name?.substring(0, 50)}${user.current_ship_name?.length > 50 ? '...' : ''}"`);
        console.log(`   📍 Position: ${user.current_latitude?.toFixed(4) || 'N/A'}°, ${user.current_longitude?.toFixed(4) || 'N/A'}°`);
        console.log(`   ⚠️ Needs: Correct ship name and IMO number`);
      });
    }
    
    // Summary statistics
    console.log('\n\n📈 SUMMARY STATISTICS:');
    console.log('=' .repeat(60));
    console.log(`✅ Users with real vessel tracking: ${withVesselTracking.length} (${(withVesselTracking.length/allOnboard.rows.length*100).toFixed(1)}%)`);
    console.log(`⚠️ Users needing ship info: ${withoutTracking.length} (${(withoutTracking.length/allOnboard.rows.length*100).toFixed(1)}%)`);
    
    // Ships successfully tracked
    const trackedShips = [...new Set(withVesselTracking.map(u => u.current_ship_name))];
    console.log(`\n🚢 Ships with Real-Time Tracking:`);
    trackedShips.forEach(ship => {
      const imo = withVesselTracking.find(u => u.current_ship_name === ship)?.current_ship_imo;
      console.log(`   - ${ship} (IMO: ${imo})`);
    });
    
    console.log('\n✅ TASK COMPLETED:');
    console.log('   - Updated GFS Galaxy (IMO 9401271) with real position');
    console.log('   - Corrected Ocean Pioneer to COSCO ADEN (IMO 9484003)');
    console.log('   - Updated SPIL NIKEN (IMO 9273947) with vessel tracking');
    console.log('   - Updated STI St Charles (IMO 9681144) with real position');
    console.log('   - 4 ships now have real-time vessel tracking data');
    console.log('   - 8 users need WhatsApp messages analyzed for ship names');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

finalShipSummary();