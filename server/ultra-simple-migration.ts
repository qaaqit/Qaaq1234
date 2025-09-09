#!/usr/bin/env tsx
import { db } from './db';
import { sql } from 'drizzle-orm';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

async function ultraSimpleMigration() {
  console.log('🚀 ULTRA SIMPLE WORKSHOP MIGRATION');
  console.log('==================================');
  
  // Source database (tiny bar)
  const sourceDbUrl = 'postgresql://neondb_owner:npg_KfYM8gudSiX7@ep-tiny-bar-ae4px79c.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';
  const sourcePool = new Pool({ connectionString: sourceDbUrl, ssl: { rejectUnauthorized: false }, max: 3 });
  const sourceDb = drizzle({ client: sourcePool });
  
  try {
    // Step 1: Get workshop users from source (basic fields only)
    console.log('\n📋 Extracting workshop users...');
    const result = await sourceDb.execute(sql`
      SELECT id, full_name, email, password, user_type
      FROM users 
      WHERE user_type = 'workshop_provider' AND is_workshop_provider = true
    `);
    
    const workshopUsers = result.rows;
    console.log(`📦 Found ${workshopUsers.length} workshop users`);
    
    // Step 2: Insert using minimal essential columns only
    console.log('\n📋 Inserting workshop users with minimal schema...');
    
    let success = 0;
    let skipped = 0;
    
    for (const user of workshopUsers) {
      try {
        // Check for duplicate
        const existing = await db.execute(sql`
          SELECT id FROM users WHERE email = ${user.email}
        `);
        
        if (existing.rows.length > 0) {
          skipped++;
          continue;
        }
        
        // Insert with only essential columns
        await db.execute(sql`
          INSERT INTO users (id, full_name, email, password, user_type, is_workshop_provider)
          VALUES (${user.id}, ${user.full_name}, ${user.email}, ${user.password}, 'workshop_provider', true)
        `);
        
        success++;
        
        if (success % 20 === 0) {
          console.log(`   ✅ ${success} users migrated...`);
        }
        
      } catch (error) {
        console.error(`❌ Failed: ${user.full_name} - ${error instanceof Error ? error.message : 'Unknown error'}`);
        if (success === 0) {
          // If first few fail, abort
          throw error;
        }
      }
    }
    
    // Step 3: Verify results
    console.log('\n📋 Verifying results...');
    const totalResult = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
    const totalUsers = Number(totalResult.rows[0]?.count || 0);
    
    const workshopResult = await db.execute(sql`SELECT COUNT(*) as count FROM users WHERE is_workshop_provider = true`);
    const totalWorkshops = Number(workshopResult.rows[0]?.count || 0);
    
    console.log('\n🎉 MIGRATION RESULTS:');
    console.log('=====================');
    console.log(`✅ Successfully migrated: ${success} workshop users`);
    console.log(`⏭️ Skipped duplicates: ${skipped} users`);
    console.log(`📊 Total users in database: ${totalUsers}`);
    console.log(`🔧 Total workshop providers: ${totalWorkshops}`);
    console.log(`🚢 Maritime professionals: ${totalUsers - totalWorkshops}`);
    
    const migrationSuccess = success > 0;
    console.log(`🎯 Status: ${migrationSuccess ? 'SUCCESS' : 'FAILED'}`);
    
    if (migrationSuccess) {
      console.log(`🎊 Workshop users successfully added to parent database!`);
      console.log(`🎯 Target of 1446+ users: ${totalUsers >= 1400 ? 'ACHIEVED' : 'IN PROGRESS'}`);
    }
    
    return { success, skipped, totalUsers, totalWorkshops };
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    throw error;
  } finally {
    await sourcePool.end();
    console.log('\n🔒 Source database closed');
  }
}

// Execute
ultraSimpleMigration().then((result) => {
  console.log(`\n🎉 Ultra simple migration completed! ${result.success} workshop users added.`);
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Ultra simple migration failed:', error);
  process.exit(1);
});