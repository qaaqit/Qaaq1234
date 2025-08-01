import { pool } from './server/db';

async function getHarshalInfo() {
  try {
    const client = await pool.connect();
    
    const userId = '+917972911743';
    
    // Get only the existing ship-related fields
    const userResult = await client.query(`
      SELECT 
        first_name,
        last_name,
        onboard_status,
        current_ship_name,
        current_ship_imo,
        last_ship,
        last_vessel_name
      FROM users 
      WHERE id = $1
    `, [userId]);
    
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log(`📱 ${user.first_name} ${user.last_name}`);
      console.log(`🚢 Current Ship: ${user.current_ship_name || 'Not specified'}`);
      console.log(`⚓ Status: ${user.onboard_status || 'Not specified'}`);
      console.log(`🛳️ Last Ship: ${user.last_ship || user.last_vessel_name || 'Not specified'}`);
      console.log(`🔢 IMO: ${user.current_ship_imo || 'Not specified'}`);
    }
    
    client.release();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

getHarshalInfo();