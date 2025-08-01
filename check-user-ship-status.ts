import { pool } from './server/db';

async function checkUserShipStatus() {
  try {
    const client = await pool.connect();
    
    const userId = '+917972911743'; // Harshal Jichkar
    
    console.log('Checking ship details and onboard status for Harshal Jichkar...');
    
    // First check what columns exist in the users table
    const columnsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('Available columns in users table:');
    columnsResult.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });
    
    // Get detailed user information with available columns
    const userResult = await client.query(`
      SELECT *
      FROM users 
      WHERE id = $1
    `, [userId]);
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      client.release();
      return;
    }
    
    const user = userResult.rows[0];
    
    console.log('\n👤 User Details:');
    console.log(`Name: ${user.first_name} ${user.last_name}`);
    console.log(`Phone: ${user.id}`);
    console.log(`Rank: ${user.maritime_rank || 'Not specified'}`);
    console.log(`City: ${user.city || 'Not specified'}`);
    console.log(`Created: ${user.created_at}`);
    console.log(`Last Seen: ${user.last_seen || 'Never'}`);
    
    console.log('\n🚢 Ship Details:');
    console.log(`Ship Name: ${user.ship_name || 'Not specified'}`);
    console.log(`IMO Number: ${user.imo_number || 'Not specified'}`);
    console.log(`Vessel Type: ${user.vessel_type || 'Not specified'}`);
    console.log(`Company: ${user.company_name || 'Not specified'}`);
    console.log(`Port of Registry: ${user.port_of_registry || 'Not specified'}`);
    
    console.log('\n⚓ Sailing Status:');
    if (user.is_sailing === true) {
      console.log('Status: ONBOARD (Currently sailing)');
    } else if (user.is_sailing === false) {
      console.log('Status: SIGNED OFF (On shore leave)');
    } else {
      console.log('Status: NOT SPECIFIED');
    }
    
    // Check if user has any additional ship-related data
    const additionalResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name LIKE '%ship%' 
      OR column_name LIKE '%vessel%'
      OR column_name LIKE '%sailing%'
      OR column_name LIKE '%onboard%'
      ORDER BY column_name
    `);
    
    console.log('\n📋 Available ship-related fields in database:');
    additionalResult.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUserShipStatus();