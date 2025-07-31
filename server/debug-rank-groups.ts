import { db, pool } from './db';
import { sql } from 'drizzle-orm';

async function debugRankGroups() {
  try {
    console.log('=== DEBUGGING RANK GROUPS ===');
    
    // Check rank_groups table
    console.log('\n1. Checking rank_groups table...');
    const groupsResult = await pool.query('SELECT * FROM rank_groups ORDER BY name');
    console.log(`Found ${groupsResult.rows.length} groups:`);
    groupsResult.rows.forEach(group => {
      console.log(`  - ${group.name}: ${group.description} (Active: ${group.isActive})`);
    });
    
    // Check rank_group_members table
    console.log('\n2. Checking rank_group_members table...');
    const membersResult = await pool.query(`
      SELECT rg.name, COUNT(rgm."userId") as member_count 
      FROM rank_groups rg 
      LEFT JOIN rank_group_members rgm ON rg.id = rgm."groupId" 
      GROUP BY rg.id, rg.name 
      ORDER BY rg.name
    `);
    console.log('Group member counts:');
    membersResult.rows.forEach(row => {
      console.log(`  - ${row.name}: ${row.member_count} members`);
    });
    
    // Test the exact query used in getAllRankGroups
    console.log('\n3. Testing getAllRankGroups query...');
    const apiResult = await db.execute(sql`
      SELECT 
        rg.id,
        rg.name,
        rg.description,
        rg."groupType",
        rg."isActive",
        rg."createdAt",
        (SELECT COUNT(*)::int FROM rank_group_members rgm WHERE rgm."groupId" = rg.id) as "memberCount"
      FROM rank_groups rg
      WHERE rg."isActive" = true
      ORDER BY rg.name
    `);
    console.log(`API query returned ${apiResult.rows.length} groups:`);
    apiResult.rows.forEach(group => {
      console.log(`  - ${group.name}: ${group.memberCount} members (Type: ${group.groupType})`);
    });
    
    // Check admin user
    console.log('\n4. Checking admin user...');
    const adminResult = await pool.query('SELECT id, first_name, last_name, is_platform_admin FROM users WHERE is_platform_admin = true LIMIT 5');
    console.log(`Found ${adminResult.rows.length} admin users:`);
    adminResult.rows.forEach(user => {
      console.log(`  - ${user.id}: ${user.first_name} ${user.last_name} (Admin: ${user.is_platform_admin})`);
    });
    
    console.log('\n=== DEBUG COMPLETE ===');
    
  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    await pool.end();
  }
}

// Run the debug
debugRankGroups();