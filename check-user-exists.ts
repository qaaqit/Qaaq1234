import { pool } from './server/db';

async function checkUserExists() {
  try {
    console.log('🔍 Checking if user +919988776655 exists...');
    
    // Check all possible ways this user might be stored
    const queries = [
      'SELECT * FROM users WHERE id = $1',
      'SELECT * FROM users WHERE user_id = $1', 
      'SELECT * FROM users WHERE email = $1',
      'SELECT * FROM users WHERE whatsapp_number = $1',
      'SELECT * FROM users WHERE full_name ILIKE $1'
    ];
    
    const searchTerms = ['+919988776655', '919988776655', '+919988776655@whatsapp.temp', '919988776655@whatsapp.temp'];
    
    for (const term of searchTerms) {
      console.log(`\n🔎 Searching for: ${term}`);
      
      for (let i = 0; i < queries.length; i++) {
        try {
          const result = await pool.query(queries[i], [term]);
          if (result.rows.length > 0) {
            console.log(`✅ Found user with query ${i + 1}:`);
            console.table(result.rows.map(row => ({
              id: row.id,
              user_id: row.user_id,
              email: row.email,
              full_name: row.full_name,
              whatsapp_number: row.whatsapp_number,
              user_type: row.user_type
            })));
            return;
          }
        } catch (error) {
          console.log(`Query ${i + 1} failed:`, error.message);
        }
      }
    }
    
    console.log('❌ User +919988776655 not found in database');
    
    // Show sample users
    const sampleResult = await pool.query('SELECT id, user_id, email, full_name, whatsapp_number FROM users LIMIT 10');
    console.log('\n📊 Sample users in database:');
    console.table(sampleResult.rows);
    
  } catch (error) {
    console.error('❌ Error checking user:', error);
  } finally {
    process.exit(0);
  }
}

checkUserExists();