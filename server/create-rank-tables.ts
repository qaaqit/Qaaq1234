#!/usr/bin/env tsx

import { pool } from "./db";

async function createRankTables() {
  console.log('🚀 Creating rank groups tables...');
  
  try {
    // Drop existing tables if they exist
    await pool.query('DROP TABLE IF EXISTS rank_group_messages CASCADE;');
    await pool.query('DROP TABLE IF EXISTS rank_group_members CASCADE;');
    await pool.query('DROP TABLE IF EXISTS rank_groups CASCADE;');
    
    // Create rank_groups table with correct column names
    await pool.query(`
      CREATE TABLE rank_groups (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        "groupType" TEXT NOT NULL DEFAULT 'rank',
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      );
    `);
    console.log('✅ Created rank_groups table');
    
    // Create rank_group_members table
    await pool.query(`
      CREATE TABLE rank_group_members (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        "groupId" VARCHAR NOT NULL REFERENCES rank_groups(id) ON DELETE CASCADE,
        "userId" VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT DEFAULT 'member',
        "joinedAt" TIMESTAMP DEFAULT now(),
        UNIQUE("groupId", "userId")
      );
    `);
    console.log('✅ Created rank_group_members table');
    
    // Create rank_group_messages table
    await pool.query(`
      CREATE TABLE rank_group_messages (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        "groupId" VARCHAR NOT NULL REFERENCES rank_groups(id) ON DELETE CASCADE,
        "senderId" VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        "messageType" TEXT DEFAULT 'text',
        "isAnnouncement" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT now()
      );
    `);
    console.log('✅ Created rank_group_messages table');
    
    // Insert the 9 maritime rank groups
    const groups = [
      {
        name: "TSI",
        description: "Technical Superintendent Inspector - Senior maritime technical officers",
        groupType: "rank"
      },
      {
        name: "MSI", 
        description: "Marine Superintendent Inspector - Senior marine operations officers",
        groupType: "rank"
      },
      {
        name: "Mtr CO",
        description: "Master & Chief Officer - Ship command and navigation officers",
        groupType: "rank"
      },
      {
        name: "20 30",
        description: "2nd Officer & 3rd Officer - Deck officers and navigation watch keepers",
        groupType: "rank"
      },
      {
        name: "CE 2E",
        description: "Chief Engineer & 2nd Engineer - Senior engine room officers",
        groupType: "rank"
      },
      {
        name: "3E 4E",
        description: "3rd Engineer & 4th Engineer - Junior engine room officers",
        groupType: "rank"
      },
      {
        name: "Cadets",
        description: "Maritime Cadets - Trainees and maritime academy students",
        groupType: "rank"
      },
      {
        name: "Crew",
        description: "Ship Crew - Deck and engine room crew members",
        groupType: "rank"
      },
      {
        name: "Marine Personnel",
        description: "General Marine Personnel - All maritime professionals",
        groupType: "general"
      }
    ];

    for (const group of groups) {
      await pool.query(
        'INSERT INTO rank_groups (name, description, "groupType") VALUES ($1, $2, $3)',
        [group.name, group.description, group.groupType]
      );
      console.log(`✅ Created rank group: ${group.name}`);
    }
    
    // List all groups
    const result = await pool.query('SELECT * FROM rank_groups ORDER BY name');
    console.log('\n📋 Available Rank Groups:');
    result.rows.forEach(group => {
      console.log(`  - ${group.name}: ${group.description}`);
    });
    
    console.log('\n🎉 Maritime rank groups setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error creating rank tables:', error);
  } finally {
    await pool.end();
  }
}

createRankTables();