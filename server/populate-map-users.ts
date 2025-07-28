import { pool } from './db.js';

async function populateMapUsers() {
  try {
    console.log('Adding QAAQ maritime users with location data for map display...');
    
    const users = [
      {
        id: 'qaaq_mumbai_sailor',
        first_name: 'Rajesh',
        last_name: 'Sharma',
        email: 'rajesh.sharma@qaaq.com',
        current_city: 'Mumbai',
        current_country: 'India',
        maritime_rank: null,
        last_ship: 'MV Ocean Star',
        whatsapp_number: '+919876543210',
        last_login_location: 'ship:19.0760,72.8777',
        last_login_at: new Date()
      },
      {
        id: 'qaaq_singapore_engineer',
        first_name: 'Li',
        last_name: 'Wei',
        email: 'li.wei@qaaq.com',
        current_city: 'Singapore',
        current_country: 'Singapore',
        maritime_rank: null,
        last_ship: 'MV Asia Pacific',
        whatsapp_number: '+6591234567',
        city: 'Singapore',
        payment_method: 'Singapore',
        last_login_at: new Date()
      },
      {
        id: 'qaaq_dubai_agent',
        first_name: 'Ahmed',
        last_name: 'Hassan',
        email: 'ahmed.hassan@qaaq.com',
        current_city: 'Dubai',
        current_country: 'UAE',
        maritime_rank: null,
        whatsapp_number: '+971501234567',
        city: 'Dubai',
        last_login_at: new Date()
      },
      {
        id: 'qaaq_london_captain',
        first_name: 'James',
        last_name: 'Smith',
        email: 'james.smith@qaaq.com',
        current_city: 'London',
        current_country: 'UK',
        maritime_rank: null,
        last_ship: 'MV Atlantic Voyager',
        whatsapp_number: '+447123456789',
        city: 'London',
        payment_method: 'London',
        last_login_location: 'device:51.5074,-0.1278',
        last_login_at: new Date()
      },
      {
        id: 'qaaq_rotterdam_pilot',
        first_name: 'Hans',
        last_name: 'Van Der Berg',
        email: 'hans.vandenberg@qaaq.com',
        permanent_city: 'Rotterdam',
        permanent_country: 'Netherlands',
        maritime_rank: null,
        whatsapp_number: '+31612345678',
        city: 'Rotterdam',
        last_login_at: new Date()
      }
    ];

    for (const user of users) {
      const columns = Object.keys(user);
      const values = Object.values(user);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      
      await pool.query(`
        INSERT INTO users (${columns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT (id) DO UPDATE SET
          last_login_at = EXCLUDED.last_login_at,
          last_login_location = COALESCE(EXCLUDED.last_login_location, users.last_login_location)
      `, values);
      
      console.log(`Added/updated user: ${user.first_name} ${user.last_name} in ${user.current_city || user.permanent_city || user.city}`);
    }
    
    console.log('Successfully populated QAAQ maritime users for map display');
    process.exit(0);
  } catch (error) {
    console.error('Error populating map users:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  populateMapUsers();
}

export default populateMapUsers;