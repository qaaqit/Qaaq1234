import { pool } from './db';

async function analyzeOnboardUsers() {
  try {
    const client = await pool.connect();
    
    console.log('🤖 BOT Database Analysis: Scanning for ONBOARD users...\n');
    
    // Count users by onboard status
    const statusResult = await client.query(`
      SELECT 
        onboard_status,
        COUNT(*) as user_count
      FROM users 
      WHERE onboard_status IS NOT NULL 
      GROUP BY onboard_status
      ORDER BY user_count DESC
    `);
    
    console.log('📊 ONBOARD STATUS SUMMARY:');
    console.log('═'.repeat(40));
    let totalOnboard = 0;
    let totalOffline = 0;
    
    statusResult.rows.forEach(row => {
      console.log(`${row.onboard_status}: ${row.user_count} users`);
      if (row.onboard_status.toLowerCase().includes('onboard')) {
        totalOnboard += parseInt(row.user_count);
      } else {
        totalOffline += parseInt(row.user_count);
      }
    });
    
    console.log('\n🚢 DETAILED ONBOARD ANALYSIS:');
    console.log('═'.repeat(50));
    
    // Get detailed list of onboard users with ship names
    const onboardResult = await client.query(`
      SELECT 
        first_name,
        last_name,
        maritime_rank,
        current_ship_name,
        onboard_status,
        city,
        onboard_since,
        id
      FROM users 
      WHERE onboard_status = 'ONBOARD' 
      ORDER BY current_ship_name, first_name
    `);
    
    console.log(`✅ Currently ONBOARD: ${onboardResult.rows.length} seafarers`);
    
    if (onboardResult.rows.length > 0) {
      console.log('\n👥 ONBOARD CREW BY SHIP:');
      console.log('-'.repeat(60));
      
      let currentShip = '';
      let shipCount = 0;
      
      onboardResult.rows.forEach(user => {
        const shipName = user.current_ship_name || 'Unknown Ship';
        
        if (shipName !== currentShip) {
          if (currentShip) {
            console.log(`   └─ Total crew: ${shipCount}\n`);
          }
          currentShip = shipName;
          shipCount = 0;
          console.log(`🚢 ${shipName.toUpperCase()}`);
        }
        
        shipCount++;
        const fullName = `${user.first_name} ${user.last_name}`.trim();
        const rank = user.maritime_rank || 'Crew';
        const onboardSince = user.onboard_since ? 
          new Date(user.onboard_since).toLocaleDateString() : 'Unknown';
        
        console.log(`   ├─ ${fullName} (${rank}) - Onboard since: ${onboardSince}`);
        console.log(`   │  Phone: ${user.id} | Location: ${user.city || 'At sea'}`);
      });
      
      if (currentShip) {
        console.log(`   └─ Total crew: ${shipCount}`);
      }
    }
    
    // Check for users with ship names but no onboard status
    const unclearStatusResult = await client.query(`
      SELECT 
        COUNT(*) as count
      FROM users 
      WHERE current_ship_name IS NOT NULL 
      AND current_ship_name != ''
      AND (onboard_status IS NULL OR onboard_status = '')
    `);
    
    const unclearCount = unclearStatusResult.rows[0]?.count || 0;
    
    // Count total users with ship assignments
    const shipAssignedResult = await client.query(`
      SELECT COUNT(*) as count
      FROM users 
      WHERE current_ship_name IS NOT NULL AND current_ship_name != ''
    `);
    
    const shipAssignedCount = shipAssignedResult.rows[0]?.count || 0;
    
    console.log('\n📈 FINAL STATISTICS:');
    console.log('═'.repeat(40));
    console.log(`🟢 Confirmed ONBOARD: ${totalOnboard} users`);
    console.log(`🔴 Signed OFF/Shore: ${totalOffline} users`);
    console.log(`❓ Unclear status (has ship, no status): ${unclearCount} users`);
    console.log(`🚢 Total with ship assignments: ${shipAssignedCount} users`);
    console.log(`📱 Total users analyzed: ${statusResult.rows.reduce((sum, row) => sum + parseInt(row.user_count), 0) + parseInt(unclearCount)} users`);
    
    // Ship name extraction recommendations
    console.log('\n🤖 BOT RECOMMENDATIONS:');
    console.log('═'.repeat(40));
    
    if (unclearCount > 0) {
      console.log(`⚠️  ${unclearCount} users have ship names but unclear onboard status`);
      console.log('📋 Recommend: Enhanced conversation parsing to detect status');
    }
    
    if (totalOnboard > 0) {
      console.log(`✅ Ship name extraction working: ${totalOnboard} users properly tracked`);
    }
    
    // Most active ships
    const activeShipsResult = await client.query(`
      SELECT 
        current_ship_name,
        COUNT(*) as crew_count
      FROM users 
      WHERE current_ship_name IS NOT NULL 
      AND current_ship_name != ''
      GROUP BY current_ship_name
      ORDER BY crew_count DESC
      LIMIT 10
    `);
    
    if (activeShipsResult.rows.length > 0) {
      console.log('\n🏆 TOP 10 MOST ACTIVE SHIPS:');
      console.log('-'.repeat(40));
      activeShipsResult.rows.forEach((ship, index) => {
        console.log(`${index + 1}. ${ship.current_ship_name}: ${ship.crew_count} crew members`);
      });
    }
    
    client.release();
    console.log('\n✅ Database analysis complete!');
    
  } catch (error) {
    console.error('❌ Error analyzing database:', error);
  }
}

analyzeOnboardUsers();