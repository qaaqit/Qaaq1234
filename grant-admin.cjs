const { Pool } = require('pg');

async function grantAdminAccess() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    const result = await pool.query(`
      UPDATE users SET is_admin = true WHERE id = '44885683' RETURNING id, full_name, is_admin
    `);

    if (result.rows.length === 0) {
      console.log('❌ User 44885683 not found');
    } else {
      console.log('✅ Admin access granted to:', result.rows[0].full_name);
      console.log('✅ User is now admin:', result.rows[0].is_admin);
    }
  } catch (error) {
    console.error('❌ Error granting admin access:', error);
  } finally {
    await pool.end();
  }
}

grantAdminAccess();