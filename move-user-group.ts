import { pool } from './server/db';

async function moveUserToCorrectGroup() {
  try {
    const client = await pool.connect();
    
    const userId = '+917972911743'; // Harshal Jichkar
    
    console.log('Moving Harshal Jichkar (4E) to the correct "3E 4E" group...');
    
    // First, find the 3E 4E group ID
    const groupResult = await client.query(`
      SELECT id, name FROM rank_groups WHERE name = '3E 4E'
    `);
    
    if (groupResult.rows.length === 0) {
      console.log('❌ 3E 4E group not found');
      client.release();
      return;
    }
    
    const targetGroupId = groupResult.rows[0].id;
    console.log(`✅ Found 3E 4E group: ${targetGroupId}`);
    
    // Remove user from current group (Cadets)
    const removeResult = await client.query(`
      DELETE FROM rank_group_members 
      WHERE "userId" = $1
    `, [userId]);
    
    console.log(`🗑️ Removed user from ${removeResult.rowCount} previous groups`);
    
    // Add user to 3E 4E group
    const addResult = await client.query(`
      INSERT INTO rank_group_members ("userId", "groupId", role, "joinedAt")
      VALUES ($1, $2, 'member', NOW())
      ON CONFLICT ("userId", "groupId") 
      DO UPDATE SET 
        role = EXCLUDED.role,
        "joinedAt" = NOW()
      RETURNING *
    `, [userId, targetGroupId]);
    
    if (addResult.rows.length > 0) {
      console.log('✅ Successfully moved Harshal Jichkar to "3E 4E" group');
      console.log(`👤 User: ${userId}`);
      console.log(`🏆 New Group: 3E 4E`);
      console.log(`🔑 Role: member`);
      console.log(`📅 Joined: ${addResult.rows[0].joinedAt}`);
    }
    
    // Update user's maritime rank to match the group
    const updateRankResult = await client.query(`
      UPDATE users 
      SET maritime_rank = '4e'
      WHERE id = $1
      RETURNING first_name, last_name, maritime_rank
    `, [userId]);
    
    if (updateRankResult.rows.length > 0) {
      const user = updateRankResult.rows[0];
      console.log(`🎖️ Updated maritime rank: ${user.first_name} ${user.last_name} -> ${user.maritime_rank}`);
    }
    
    // Update member counts
    await client.query(`
      UPDATE rank_groups 
      SET member_count = (
        SELECT COUNT(*) FROM rank_group_members 
        WHERE "groupId" = rank_groups.id
      )
    `);
    
    console.log('📊 Updated group member counts');
    
    client.release();
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

moveUserToCorrectGroup();