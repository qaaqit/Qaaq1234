import { pool } from './server/db';

async function findUserGroup() {
  try {
    const client = await pool.connect();
    
    // Search for users with the phone number pattern
    console.log('Searching for user with phone number containing 79729 11743...');
    
    const userResult = await client.query(`
      SELECT id, first_name, last_name, maritime_rank, city 
      FROM users 
      WHERE id LIKE '%79729%' OR id LIKE '%7972911743%'
      ORDER BY id
    `);
    
    if (userResult.rows.length === 0) {
      console.log('❌ User with number +91 79729 11743 not found in database');
      
      // Show some sample user IDs to help identify the correct format
      const sampleResult = await client.query(`
        SELECT id, first_name, last_name 
        FROM users 
        WHERE id LIKE '+91%'
        LIMIT 5
      `);
      
      console.log('\nSample user IDs in database:');
      sampleResult.rows.forEach(user => {
        console.log(`- ${user.id} (${user.first_name} ${user.last_name})`);
      });
      
      client.release();
      return;
    }
    
    console.log(`\n✅ Found ${userResult.rows.length} matching user(s):`);
    
    for (const user of userResult.rows) {
      console.log(`\n👤 User: ${user.first_name} ${user.last_name}`);
      console.log(`📱 Phone: ${user.id}`);
      console.log(`⚓ Rank: ${user.maritime_rank || 'Not specified'}`);
      console.log(`📍 City: ${user.city || 'Not specified'}`);
      
      // Find which rank groups this user is in
      const groupResult = await client.query(`
        SELECT 
          rg.name as group_name,
          rg.description,
          rgm.role,
          rgm."joinedAt"
        FROM rank_group_members rgm
        JOIN rank_groups rg ON rgm."groupId" = rg.id
        WHERE rgm."userId" = $1
        ORDER BY rgm."joinedAt" DESC
      `, [user.id]);
      
      if (groupResult.rows.length === 0) {
        console.log('🔍 Group Status: NOT assigned to any rank groups yet');
        
        // Suggest appropriate group based on maritime rank
        if (user.maritime_rank) {
          console.log(`💡 Suggested group based on rank "${user.maritime_rank}": Should be auto-assigned`);
        }
      } else {
        console.log('🏆 Assigned to the following groups:');
        groupResult.rows.forEach(group => {
          console.log(`  - ${group.group_name} (Role: ${group.role})`);
          console.log(`    Description: ${group.description}`);
          console.log(`    Joined: ${group.joinedAt}\n`);
        });
      }
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findUserGroup();