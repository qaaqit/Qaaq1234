import { pool } from './server/db';

async function fixUserRank() {
  try {
    const client = await pool.connect();
    
    const userId = '+917972911743';
    
    // First check what maritime rank values are allowed
    const enumResult = await client.query(`
      SELECT enumlabel FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'maritime_rank'
      )
      ORDER BY enumlabel
    `);
    
    console.log('Available maritime rank values:');
    enumResult.rows.forEach(row => {
      console.log(`- ${row.enumlabel}`);
    });
    
    // Update user's rank to a valid value for 4th Engineer
    const updateResult = await client.query(`
      UPDATE users 
      SET maritime_rank = 'engineer'
      WHERE id = $1
      RETURNING first_name, last_name, maritime_rank
    `, [userId]);
    
    if (updateResult.rows.length > 0) {
      const user = updateResult.rows[0];
      console.log(`✅ Updated maritime rank: ${user.first_name} ${user.last_name} -> ${user.maritime_rank}`);
    }
    
    // Verify the user is now in the 3E 4E group
    const verifyResult = await client.query(`
      SELECT 
        u.first_name,
        u.last_name,
        u.maritime_rank,
        rg.name as group_name,
        rgm.role,
        rgm."joinedAt"
      FROM users u
      JOIN rank_group_members rgm ON u.id = rgm."userId"
      JOIN rank_groups rg ON rgm."groupId" = rg.id
      WHERE u.id = $1
    `, [userId]);
    
    console.log('\n📋 Current group assignment:');
    verifyResult.rows.forEach(row => {
      console.log(`👤 ${row.first_name} ${row.last_name} (${row.maritime_rank})`);
      console.log(`🏆 Group: ${row.group_name}`);
      console.log(`🔑 Role: ${row.role}`);
      console.log(`📅 Joined: ${row.joinedAt}`);
    });
    
    client.release();
    console.log('\n🎉 User successfully moved to 3E 4E group!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixUserRank();