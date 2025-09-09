#!/usr/bin/env tsx
import { db } from './db';
import { sql } from 'drizzle-orm';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

async function finalWorkshopMigration() {
  console.log('🚀 FINAL WORKSHOP MIGRATION TO PARENT DATABASE');
  console.log('==============================================');
  
  // Source database connection (tiny bar)
  const sourceDbUrl = 'postgresql://neondb_owner:npg_KfYM8gudSiX7@ep-tiny-bar-ae4px79c.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';
  const sourcePool = new Pool({ connectionString: sourceDbUrl, ssl: { rejectUnauthorized: false }, max: 5 });
  const sourceDb = drizzle({ client: sourcePool });
  
  try {
    // Step 1: Get current parent database state
    console.log('\n📋 Step 1: Checking parent database state...');
    const parentResult = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
    const parentCount = Number(parentResult.rows[0]?.count || 0);
    console.log(`📊 Parent database users: ${parentCount}`);
    
    // Step 2: Extract workshop users from source
    console.log('\n📋 Step 2: Extracting workshop users from source database...');
    const workshopsResult = await sourceDb.execute(sql`
      SELECT id, user_id, full_name, email, password, user_type, 
             is_workshop_provider, created_at, updated_at, last_activity_at
      FROM users WHERE user_type = 'workshop_provider' AND is_workshop_provider = true
    `);
    
    const workshopUsers = workshopsResult.rows;
    console.log(`📦 Found ${workshopUsers.length} workshop users to migrate`);
    
    if (workshopUsers.length === 0) {
      throw new Error('No workshop users found in source database');
    }
    
    // Show sample
    if (workshopUsers.length > 0) {
      console.log(`📊 Sample: ${workshopUsers[0].full_name} (${workshopUsers[0].email})`);
    }
    
    // Step 3: Migrate each workshop user
    console.log('\n📋 Step 3: Migrating workshop users...');
    
    let insertedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];
    
    for (const user of workshopUsers) {
      try {
        // Check for existing user by email
        if (user.email) {
          const existingResult = await db.execute(sql`
            SELECT id FROM users WHERE email = ${user.email}
          `);
          
          if (existingResult.rows.length > 0) {
            console.log(`⏭️ Skipping duplicate: ${user.email}`);
            skippedCount++;
            continue;
          }
        }
        
        // Insert using minimal required fields
        await db.execute(sql`
          INSERT INTO users (
            id, user_id, full_name, email, password, user_type, is_workshop_provider,
            has_set_custom_password, needs_password_change, must_create_password,
            primary_auth_provider, auth_providers, is_admin, is_verified,
            verification_status, visibility_setting, privacy_mode,
            notification_preferences, dark_mode, language_preference, timezone,
            subscription_status, failed_login_attempts, login_count,
            questions_asked_count, answers_given_count, likes_received_count,
            location_source, question_count, trial_used, payment_failures,
            premium_welcome_sent, created_at, updated_at, last_activity_at,
            has_confirmed_maritime_rank
          ) VALUES (
            ${user.id}, ${user.user_id || user.email}, ${user.full_name}, ${user.email}, 
            ${user.password || 'Repair123'}, 'workshop_provider', true,
            false, true, true, 'qaaq', '[]'::jsonb, false, false,
            'unverified', 'public', false, '{"push": true, "email": true}'::jsonb,
            false, 'en', 'UTC', 'free', 0, 0, 0, 0, 0, 'unknown',
            0, false, 0, false, 
            COALESCE(${user.created_at}, NOW()),
            COALESCE(${user.updated_at}, NOW()),
            COALESCE(${user.last_activity_at}, NOW()),
            false
          )
        `);
        
        insertedCount++;
        
        if (insertedCount % 10 === 0) {
          console.log(`   ✅ Progress: ${insertedCount}/${workshopUsers.length} migrated`);
        }
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${user.full_name}: ${errorMsg}`);
        console.error(`❌ Failed: ${user.full_name} - ${errorMsg}`);
        
        // Stop on too many errors
        if (errors.length > 5) {
          console.log('❌ Too many errors - stopping migration');
          break;
        }
      }
    }
    
    // Step 4: Verify final state
    console.log('\n📋 Step 4: Verifying migration results...');
    
    const finalResult = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
    const finalCount = Number(finalResult.rows[0]?.count || 0);
    
    const workshopResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM users WHERE is_workshop_provider = true
    `);
    const finalWorkshops = Number(workshopResult.rows[0]?.count || 0);
    
    // Final summary
    console.log('\n🎉 MIGRATION COMPLETE!');
    console.log('======================');
    console.log(`📊 Workshop users migrated: ${insertedCount}`);
    console.log(`📊 Workshop users skipped: ${skippedCount} (duplicates)`);
    console.log(`📊 Migration errors: ${errors.length}`);
    console.log(`📊 Final total users: ${finalCount}`);
    console.log(`📊 Final workshop providers: ${finalWorkshops}`);
    console.log(`📊 Maritime professionals: ${finalCount - finalWorkshops}`);
    console.log(`📊 Expected total: ${parentCount + insertedCount}`);
    
    const success = insertedCount > 0;
    console.log(`✅ Status: ${success ? 'SUCCESS' : 'FAILED'}`);
    
    if (success) {
      console.log(`🎯 Successfully added ${insertedCount} workshop users to parent database!`);
      console.log(`🏢 Total users increased from ${parentCount} to ${finalCount}`);
    }
    
    if (errors.length > 0) {
      console.log('\n⚠️ Migration Errors:');
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    return { success, insertedCount, skippedCount, errors: errors.length, finalCount, finalWorkshops };
    
  } catch (error) {
    console.error('\n💥 MIGRATION FAILED:', error);
    throw error;
  } finally {
    await sourcePool.end();
    console.log('\n🔒 Source database connection closed');
  }
}

// Execute migration
finalWorkshopMigration().then((result) => {
  console.log(`\n🎉 Migration completed! ${result.insertedCount} workshop users added to parent database.`);
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Migration failed:', error);
  process.exit(1);
});