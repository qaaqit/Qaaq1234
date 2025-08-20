import { pool } from './server/db.js';

async function checkLoginIssue() {
  try {
    console.log('🔍 Checking login issue for user 45016180...');
    
    // First check what columns exist in users table
    const columnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY column_name
    `);
    
    console.log('Available columns in users table:');
    columnsResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}`);
    });

    // Check user's basic details
    const result = await pool.query(`
      SELECT 
        id,
        full_name,
        email,
        is_verified,
        login_count,
        last_login,
        created_at
      FROM users 
      WHERE id = $1
    `, ['45016180']);

    if (result.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = result.rows[0];
    console.log('👤 User Found:', user.full_name);
    console.log('📧 Email:', user.email);
    console.log('✅ Verified:', user.is_verified);
    console.log('🔢 Login Count:', user.login_count);
    console.log('⏰ Last Login:', user.last_login);
    console.log('📅 Created:', user.created_at);

    console.log('\n💡 The system uses universal password acceptance for authentication');

    // Check user identities
    console.log('\n🔍 Checking user identities...');
    const identityResult = await pool.query(`
      SELECT 
        provider,
        provider_id,
        is_primary,
        created_at
      FROM user_identities 
      WHERE user_id = $1
      ORDER BY created_at ASC
    `, ['45016180']);

    console.log(`🆔 Found ${identityResult.rows.length} identity records:`);
    identityResult.rows.forEach((identity, index) => {
      console.log(`  ${index + 1}. Provider: ${identity.provider}`);
      console.log(`     Provider ID: ${identity.provider_id}`);
      console.log(`     Primary: ${identity.is_primary}`);
      console.log(`     Created: ${identity.created_at}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error checking login issue:', error);
  }
}

// Run the check
checkLoginIssue();