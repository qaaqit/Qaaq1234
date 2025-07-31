#!/usr/bin/env tsx

import { pool } from "./db";
import { initializeRankGroups } from "./rank-groups-service";

async function main() {
  console.log('🚀 Starting rank groups initialization...');
  
  try {
    // Create tables first
    console.log('📊 Creating rank groups tables...');
    
    // Create rank_groups table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rank_groups (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        "groupType" TEXT NOT NULL DEFAULT 'rank',
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      );
    `);
    
    // Create rank_group_members table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rank_group_members (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        "groupId" VARCHAR NOT NULL,
        "userId" VARCHAR NOT NULL,
        role TEXT DEFAULT 'member',
        "joinedAt" TIMESTAMP DEFAULT now()
      );
    `);
    
    // Create rank_group_messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rank_group_messages (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        "groupId" VARCHAR NOT NULL,
        "senderId" VARCHAR NOT NULL,
        message TEXT NOT NULL,
        "messageType" TEXT DEFAULT 'text',
        "isAnnouncement" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT now()
      );
    `);
    
    console.log('✅ Tables created successfully');
    
    // Initialize rank groups
    const result = await initializeRankGroups();
    console.log('📋 Result:', result);
    
    // List all groups
    const groupsResult = await pool.query('SELECT * FROM rank_groups ORDER BY name');
    console.log('\n📋 Available Rank Groups:');
    groupsResult.rows.forEach(group => {
      console.log(`  - ${group.name}: ${group.description}`);
    });
    
    console.log('\n🎉 Rank groups initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during initialization:', error);
  } finally {
    await pool.end();
  }
}

main();