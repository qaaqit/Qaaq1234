import { pool } from "./db";

async function checkIMOData() {
  try {
    console.log("Checking QAAQ database for IMO numbers and ship data...\n");
    
    // Check total users
    const totalUsers = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`Total users in database: ${totalUsers.rows[0].count}`);
    
    // Check available columns first
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name LIKE '%ship%' OR column_name LIKE '%imo%' OR column_name LIKE '%vessel%'
      ORDER BY column_name
    `);
    
    console.log("\nShip-related columns found:");
    columns.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });
    
    // Check users with ship names
    const usersWithShips = await pool.query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE (last_ship IS NOT NULL AND last_ship != '') 
         OR (ship_name IS NOT NULL AND ship_name != '')
    `);
    console.log(`Users with ship names: ${usersWithShips.rows[0].count}`);
    
    // Sample of users with ship data
    const sampleShipUsers = await pool.query(`
      SELECT id, first_name, last_name, imo_number, last_ship, ship_name, maritime_rank
      FROM users 
      WHERE (imo_number IS NOT NULL AND imo_number != '') 
         OR (last_ship IS NOT NULL AND last_ship != '')
         OR (ship_name IS NOT NULL AND ship_name != '')
      LIMIT 10
    `);
    
    console.log("\nSample users with ship data:");
    console.log("ID | Name | IMO | Last Ship | Ship Name | Rank");
    console.log("-".repeat(80));
    
    sampleShipUsers.rows.forEach(user => {
      const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      console.log(`${user.id} | ${name} | ${user.imo_number || 'N/A'} | ${user.last_ship || 'N/A'} | ${user.ship_name || 'N/A'} | ${user.maritime_rank || 'N/A'}`);
    });
    
    // Check available columns in users table
    const allColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log("\nAll available columns in users table:");
    allColumns.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });
    
  } catch (error) {
    console.error("Error checking IMO data:", error);
  }
}

checkIMOData();