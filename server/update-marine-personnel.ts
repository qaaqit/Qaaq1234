#!/usr/bin/env tsx

import { pool } from "./db";

async function updateMarinePersonnelGroup() {
  console.log('🔄 Updating Marine Personnel group name...');
  
  try {
    // Update the Marine Personnel group to ETO & Elec Supdts
    await pool.query(`
      UPDATE rank_groups 
      SET name = 'ETO & Elec Supdts', 
          description = 'Electrical Technical Officer & Electrical Superintendents - Maritime electrical specialists'
      WHERE name = 'Marine Personnel'
    `);
    
    console.log('✅ Successfully renamed "Marine Personnel" to "ETO & Elec Supdts"');
    
    // List all groups to confirm the change
    const result = await pool.query('SELECT name, description FROM rank_groups ORDER BY name');
    console.log('\n📋 Updated Rank Groups:');
    result.rows.forEach(group => {
      console.log(`  - ${group.name}: ${group.description}`);
    });
    
  } catch (error) {
    console.error('❌ Error updating group name:', error);
  } finally {
    await pool.end();
  }
}

updateMarinePersonnelGroup();