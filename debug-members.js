// Debug script to check members API
import { pool } from './server/db.js';

async function debugMembers() {
  try {
    // Find all groups
    const groupsResult = await pool.query('SELECT id, name, member_count FROM rank_groups ORDER BY name');
    console.log('All groups:');
    groupsResult.rows.forEach(group => {
      console.log(`- ${group.name}: ID=${group.id}, Members=${group.member_count}`);
    });
    
    // Find the group currently being accessed
    const currentGroupId = '877032c6-10ac-4f1f-8a32-4d62e6d643bf';
    const currentGroup = await pool.query('SELECT name FROM rank_groups WHERE id = $1', [currentGroupId]);
    console.log(`\nCurrently viewing group: ${currentGroup.rows[0]?.name || 'Unknown'}`);
    
    // Check members in that group
    const membersResult = await pool.query(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.maritime_rank,
        u.city,
        rgm.role,
        rgm."joinedAt"
      FROM rank_group_members rgm
      JOIN users u ON rgm."userId" = u.id
      WHERE rgm."groupId" = $1
      ORDER BY rgm."joinedAt" ASC
      LIMIT 5
    `, [currentGroupId]);
    
    console.log(`\nMembers in this group: ${membersResult.rows.length}`);
    membersResult.rows.forEach(member => {
      console.log(`- ${member.first_name} ${member.last_name} (${member.maritime_rank}) from ${member.city}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

debugMembers();