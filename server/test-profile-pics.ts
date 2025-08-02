import pool from './db';

async function testProfilePictures() {
  try {
    console.log('Testing profile picture data in QAAQ database...');
    
    // First, check if the column exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'profile_picture_url'
    `);
    
    console.log('Column exists:', columnCheck.rows.length > 0);
    
    if (columnCheck.rows.length > 0) {
      // Check for users with profile pictures
      const result = await pool.query(`
        SELECT id, first_name, last_name, profile_picture_url 
        FROM users 
        WHERE profile_picture_url IS NOT NULL 
        LIMIT 5
      `);
      
      console.log(`Found ${result.rows.length} users with profile pictures`);
      
      if (result.rows.length > 0) {
        console.log('Sample profile pictures:');
        result.rows.forEach(user => {
          console.log(`- ${user.first_name} ${user.last_name}: ${user.profile_picture_url}`);
        });
      } else {
        console.log('No users have profile pictures set in the database');
      }
    } else {
      console.log('profile_picture_url column does not exist in users table');
    }
    
  } catch (error) {
    console.error('Error testing profile pictures:', error);
  } finally {
    process.exit();
  }
}

testProfilePictures();