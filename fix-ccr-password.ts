import { pool } from './server/db.js';

async function fixCCRPassword() {
  try {
    console.log('🔧 Fixing CCR KING password...');
    
    // Check current password
    const userResult = await pool.query(`
      SELECT id, full_name, email, password FROM users WHERE id = $1
    `, ['45016180']);

    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = userResult.rows[0];
    console.log('👤 Current User:', user.full_name);
    console.log('📧 Email:', user.email);
    console.log('🔒 Current Password:', user.password);

    // Set the password to "4321koihai"
    await pool.query(`
      UPDATE users SET password = $1 WHERE id = $2
    `, ['4321koihai', '45016180']);

    console.log('✅ Password updated to "4321koihai"');

    // Verify the update
    const verifyResult = await pool.query(`
      SELECT password FROM users WHERE id = $1
    `, ['45016180']);

    console.log('🔍 Verified password:', verifyResult.rows[0].password);

  } catch (error) {
    console.error('❌ Error fixing password:', error);
  }
}

// Run the fix
fixCCRPassword();