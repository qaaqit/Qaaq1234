import { pool } from './db';

async function createTestUsers() {
  console.log('🧪 Creating test users...');
  
  const testPassword = '1234koihai';
  
  try {
    // Create test users Test1 through Test10
    for (let i = 1; i <= 10; i++) {
      const userId = `Test${i}`;
      const email = `test${i}@qaaq.app`;
      const fullName = `Test User ${i}`;
      
      try {
        // Check if user already exists
        const existingUser = await pool.query('SELECT user_id FROM users WHERE user_id = $1', [userId]);
        
        if (existingUser.rows.length > 0) {
          // Update existing user
          await pool.query(`
            UPDATE users SET 
              password = $1,
              full_name = $2,
              email = $3,
              is_verified = $4
            WHERE user_id = $5
          `, [testPassword, fullName, email, true, userId]);
          console.log(`✅ Updated test user: ${userId} (${email})`);
        } else {
          // Create new user
          await pool.query(`
            INSERT INTO users (
              id, user_id, full_name, email, password, user_type, 
              is_verified, created_at
            ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
          `, [
            userId,
            fullName,
            email,
            testPassword,
            'Free',
            true
          ]);
          console.log(`✅ Created test user: ${userId} (${email})`);
        }
      } catch (userError) {
        console.error(`❌ Error creating user ${userId}:`, userError);
      }
    }
    
    console.log('🎉 Test user creation completed!');
    console.log('📋 Test credentials:');
    console.log('   User IDs: Test1, Test2, Test3, ..., Test10');
    console.log('   Password: 1234koihai');
    
  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    await pool.end();
  }
}

export { createTestUsers };

// Run if called directly
createTestUsers();