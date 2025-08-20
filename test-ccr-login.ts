import { pool } from './server/db.js';

async function testCCRLogin() {
  try {
    console.log('🔐 Testing CCR KING login process...\n');

    // Test the exact logic used in storage.ts getUserByIdAndPassword
    const userId = '45016180';
    const password = '4321koihai';
    
    console.log(`Attempting login with:`);
    console.log(`User ID: ${userId}`);
    console.log(`Password: ${password}\n`);

    // Try direct lookup by user_id (same as storage.ts logic)
    let result = await pool.query('SELECT * FROM users WHERE user_id = $1 LIMIT 1', [userId]);
    
    if (result.rows.length === 0) {
      console.log('❌ Step 1: No user found by user_id');
      // Fallback: try by email
      result = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [userId]);
      
      if (result.rows.length === 0) {
        console.log('❌ Step 2: No user found by email');
        // Fallback: try by id (primary key)
        result = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
        
        if (result.rows.length === 0) {
          console.log('❌ Step 3: No user found by id');
          return;
        } else {
          console.log('✅ Step 3: User found by id (primary key)');
        }
      } else {
        console.log('✅ Step 2: User found by email');
      }
    } else {
      console.log('✅ Step 1: User found by user_id field');
    }

    const user = result.rows[0];
    console.log(`\nUser found: ${user.full_name} (${user.email})`);
    console.log(`Database ID: ${user.id}`);
    console.log(`User ID field: ${user.user_id}`);
    console.log(`Stored password: "${user.password}"`);
    console.log(`Input password: "${password}"`);
    
    // Check password match
    const passwordMatch = user.password === password;
    console.log(`\nPassword match: ${passwordMatch ? '✅ YES' : '❌ NO'}`);
    
    if (!passwordMatch) {
      console.log(`Expected: "${user.password}"`);
      console.log(`Received: "${password}"`);
      console.log(`Length check - Expected: ${user.password?.length || 0}, Received: ${password.length}`);
      
      // Check for invisible characters
      if (user.password) {
        console.log(`Password bytes - Expected: ${Array.from(user.password).map(c => c.charCodeAt(0))}`);
        console.log(`Password bytes - Received: ${Array.from(password).map(c => c.charCodeAt(0))}`);
      }
    }

    // Test the API endpoint directly
    console.log('\n🌐 Testing API endpoint...');
    
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        password: password,
      }),
    });

    const data = await response.json();
    console.log(`API Response Status: ${response.status}`);
    console.log(`API Response:`, data);

  } catch (error) {
    console.error('❌ Error testing login:', error);
  }
}

// Wait for server to start then test
setTimeout(() => {
  testCCRLogin();
}, 5000);