import { db } from './server/db';

async function checkUsersCount() {
  try {
    console.log('Checking users table...');
    
    // Get total count
    const totalCount = await db.execute(`SELECT COUNT(*) as count FROM users;`);
    console.log('Total users in database:', totalCount.rows[0].count);
    
    // Get users with location data
    const withLocation = await db.execute(`
      SELECT COUNT(*) as count FROM users 
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
    `);
    console.log('Users with location data:', withLocation.rows[0].count);
    
    // Get sample of users with different cities/countries
    const sampleUsers = await db.execute(`
      SELECT full_name, city, country, latitude, longitude, maritime_rank 
      FROM users 
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL 
      LIMIT 10;
    `);
    console.log('Sample users with locations:');
    sampleUsers.rows.forEach((user, i) => {
      console.log(`${i+1}. ${user.full_name} - ${user.city || 'No city'}, ${user.country || 'No country'} (${user.latitude}, ${user.longitude}) - ${user.maritime_rank || 'No rank'}`);
    });
    
    // Get sample of users without locations to understand the data structure
    const allUsers = await db.execute(`
      SELECT full_name, city, country, latitude, longitude, maritime_rank 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 20;
    `);
    console.log('\nSample of all users (recent):');
    allUsers.rows.forEach((user, i) => {
      console.log(`${i+1}. ${user.full_name} - ${user.city || 'No city'}, ${user.country || 'No country'} (lat: ${user.latitude || 'null'}, lng: ${user.longitude || 'null'}) - ${user.maritime_rank || 'No rank'}`);
    });
    
    // Check for different countries
    const countries = await db.execute(`
      SELECT DISTINCT country, COUNT(*) as count 
      FROM users 
      WHERE country IS NOT NULL AND country != '' 
      GROUP BY country 
      ORDER BY count DESC 
      LIMIT 10;
    `);
    console.log('Top countries by user count:');
    countries.rows.forEach((row, i) => {
      console.log(`${i+1}. ${row.country}: ${row.count} users`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUsersCount().then(() => process.exit(0));