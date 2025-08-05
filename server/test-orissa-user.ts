import { pool } from './db';

async function findOrissaUser() {
  try {
    console.log('Testing database connection and searching for Orissa user...');
    
    // Test basic connection
    const basicTest = await pool.query('SELECT COUNT(*) as total FROM users');
    console.log(`Database connected. Total users: ${basicTest.rows[0].total}`);
    
    // Search for the specific user ID variations
    const searchPatterns = [
      '+919439115367',
      '919439115367',
      '9439115367'
    ];
    
    for (const pattern of searchPatterns) {
      console.log(`\nSearching for: ${pattern}`);
      const result = await pool.query('SELECT id, email, first_name, last_name, city, current_city, current_country, maritime_rank FROM users WHERE id = $1', [pattern]);
      
      if (result.rows.length > 0) {
        console.log('FOUND USER:');
        result.rows.forEach(user => {
          console.log({
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
            city: user.city,
            current_city: user.current_city,
            country: user.current_country,
            maritime_rank: user.maritime_rank
          });
        });
      } else {
        console.log('No user found with this pattern');
      }
    }
    
    // Search for any users with similar phone numbers
    console.log('\nSearching for similar phone numbers...');
    const similarResult = await pool.query('SELECT id, first_name, last_name FROM users WHERE id LIKE $1 ORDER BY id LIMIT 10', ['%9439115367%']);
    
    if (similarResult.rows.length > 0) {
      console.log('Similar users found:');
      similarResult.rows.forEach(user => {
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        console.log(`  ${user.id} - ${fullName}`);
      });
    } else {
      console.log('No similar phone numbers found');
    }
    
    // Check if any users have "Orissa" related data
    console.log('\nSearching for Orissa-related users...');
    const orissaResult = await pool.query('SELECT id, first_name, last_name, city, current_city, current_country FROM users WHERE city ILIKE $1 OR current_city ILIKE $1 OR current_country ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1 LIMIT 10', ['%orissa%']);
    
    if (orissaResult.rows.length > 0) {
      console.log('Orissa-related users found:');
      orissaResult.rows.forEach(user => {
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        console.log({
          id: user.id,
          name: fullName,
          city: user.city || user.current_city,
          country: user.current_country
        });
      });
    } else {
      console.log('No Orissa-related users found');
    }
    
  } catch (error) {
    console.error('Database error:', error.message);
    if (error.message.includes('WebSocket')) {
      console.error('WebSocket connection issue detected. This suggests database connectivity problems.');
    }
  } finally {
    process.exit(0);
  }
}

findOrissaUser();