import { db } from './server/db';

async function checkBhangarUsers() {
  try {
    console.log('Checking bhangar_users table...');
    
    // Check if bhangar_users table exists
    const tables = await db.execute(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE '%bhangar%';
    `);
    console.log('Bhangar-related tables:', tables.rows.map(r => r.table_name));
    
    if (tables.rows.length === 0) {
      console.log('No bhangar_users table found. Checking all tables...');
      const allTables = await db.execute(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public';
      `);
      console.log('All tables:', allTables.rows.map(r => r.table_name));
      return;
    }
    
    // Get total count from bhangar_users
    const totalCount = await db.execute(`SELECT COUNT(*) as count FROM bhangar_users;`);
    console.log('Total users in bhangar_users:', totalCount.rows[0].count);
    
    // Check structure of bhangar_users
    const columns = await db.execute(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'bhangar_users' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    console.log('bhangar_users columns:');
    columns.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    });
    
    // Get sample data with location info - check which location columns exist
    const sampleData = await db.execute(`
      SELECT full_name, permanent_city, permanent_country, current_city, current_country, 
             truecaller_location, maritime_rank, id, nationality, whatsapp_number
      FROM bhangar_users 
      WHERE (permanent_city IS NOT NULL AND permanent_city != '') 
         OR (current_city IS NOT NULL AND current_city != '')
         OR (truecaller_location IS NOT NULL AND truecaller_location != '')
      LIMIT 15;
    `);
    console.log('Sample bhangar_users with location data:');
    sampleData.rows.forEach((user, i) => {
      console.log(`${i+1}. ${user.full_name || 'No name'} [${user.whatsapp_number || user.id}]`);
      console.log(`   Permanent: ${user.permanent_city || 'No city'}, ${user.permanent_country || 'No country'}`);
      console.log(`   Current: ${user.current_city || 'No city'}, ${user.current_country || 'No country'}`);
      console.log(`   TrueCaller: ${user.truecaller_location || 'No location'}`);
      console.log(`   Nationality: ${user.nationality || 'No nationality'}`);
      console.log(`   Rank: ${user.maritime_rank || 'No rank'}\n`);
    });
    
    // Check for location data availability
    const locationStats = await db.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(permanent_city) as has_permanent_city,
        COUNT(permanent_country) as has_permanent_country,
        COUNT(current_city) as has_current_city,
        COUNT(current_country) as has_current_country,
        COUNT(truecaller_location) as has_truecaller_location,
        COUNT(nationality) as has_nationality
      FROM bhangar_users;
    `);
    console.log('Location data statistics:', locationStats.rows[0]);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkBhangarUsers().then(() => process.exit(0));