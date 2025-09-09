#!/usr/bin/env tsx
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import ws from "ws";
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

interface WorkshopUser {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  password: string;
  user_type: string;
  is_workshop_provider: boolean;
  [key: string]: any;
}

async function crossDatabaseMigration() {
  console.log('🚀 CROSS-DATABASE WORKSHOP MIGRATION');
  console.log('=====================================');
  
  // Database connection strings
  const parentDbUrl = 'postgresql://neondb_owner:npg_rTOn7VZkYAb3@ep-autumn-hat-a27gd1cd.eu-central-1.aws.neon.tech/neondb?sslmode=require';
  const sourceDbUrl = 'postgresql://neondb_owner:npg_KfYM8gudSiX7@ep-tiny-bar-ae4px79c.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';
  
  // Create connection pools
  const parentPool = new Pool({ 
    connectionString: parentDbUrl,
    ssl: { rejectUnauthorized: false },
    max: 5
  });
  
  const sourcePool = new Pool({ 
    connectionString: sourceDbUrl,
    ssl: { rejectUnauthorized: false },
    max: 5
  });
  
  const parentDb = drizzle({ client: parentPool });
  const sourceDb = drizzle({ client: sourcePool });
  
  try {
    // Step 1: Test connections
    console.log('\n📋 Step 1: Testing database connections...');
    
    const parentTest = await parentDb.execute(sql`SELECT COUNT(*) as count FROM users`);
    const parentCount = Number(parentTest.rows[0]?.count || 0);
    console.log(`✅ Parent DB connected - ${parentCount} users`);
    
    const sourceTest = await sourceDb.execute(sql`SELECT COUNT(*) as count FROM users WHERE user_type = 'workshop_provider'`);
    const sourceWorkshops = Number(sourceTest.rows[0]?.count || 0);
    console.log(`✅ Source DB connected - ${sourceWorkshops} workshop users`);
    
    if (sourceWorkshops === 0) {
      throw new Error('No workshop users found in source database');
    }
    
    // Step 2: Extract workshop users from source
    console.log('\n📋 Step 2: Extracting workshop users from source...');
    const workshopResult = await sourceDb.execute(sql`
      SELECT * FROM users WHERE user_type = 'workshop_provider' AND is_workshop_provider = true
    `);
    
    const workshopUsers = workshopResult.rows as WorkshopUser[];
    console.log(`📦 Extracted ${workshopUsers.length} workshop users`);
    
    // Show sample data
    if (workshopUsers.length > 0) {
      console.log(`📊 Sample: ${workshopUsers[0].full_name} (${workshopUsers[0].email})`);
    }
    
    // Step 3: Check for conflicts in parent database
    console.log('\n📋 Step 3: Checking for conflicts in parent database...');
    
    const emailsToCheck = workshopUsers.map(u => u.email).filter(email => email);
    let conflicts = 0;
    
    for (const email of emailsToCheck) {
      const existingResult = await parentDb.execute(sql`
        SELECT id, email, user_type FROM users WHERE email = ${email}
      `);
      
      if (existingResult.rows.length > 0) {
        conflicts++;
        console.log(`⚠️  Conflict: ${email} already exists in parent`);
      }
    }
    
    if (conflicts > 0) {
      console.log(`⚠️ Found ${conflicts} email conflicts - will skip duplicates`);
    } else {
      console.log(`✅ No conflicts found - safe to proceed`);
    }
    
    // Step 4: Insert workshop users into parent database
    console.log('\n📋 Step 4: Inserting workshop users into parent database...');
    
    let insertedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];
    
    for (const user of workshopUsers) {
      try {
        // Check for existing user
        if (user.email) {
          const existing = await parentDb.execute(sql`
            SELECT id FROM users WHERE email = ${user.email}
          `);
          
          if (existing.rows.length > 0) {
            console.log(`⏭️ Skipping duplicate: ${user.email}`);
            skippedCount++;
            continue;
          }
        }
        
        // Insert user with all required fields
        await parentDb.execute(sql`
          INSERT INTO users (
            id, user_id, full_name, email, password, user_type, 
            is_workshop_provider, has_set_custom_password, needs_password_change,
            must_create_password, primary_auth_provider, auth_providers,
            is_admin, is_intern, is_verified, verification_status,
            visibility_setting, privacy_mode, notification_preferences,
            dark_mode, language_preference, timezone, subscription_status,
            failed_login_attempts, login_count, questions_asked_count,
            answers_given_count, likes_received_count, location_source,
            question_count, trial_used, payment_failures, premium_welcome_sent,
            created_at, updated_at, last_activity_at, has_confirmed_maritime_rank
          ) VALUES (
            ${user.id}, ${user.user_id || user.email}, ${user.full_name}, ${user.email}, 
            ${user.password || 'Repair123'}, 'workshop_provider', true, 
            false, true, true, 'qaaq', '[]'::jsonb,
            false, false, false, 'unverified', 'public', false,
            '{"push": true, "email": true}'::jsonb, false, 'en', 'UTC', 'free',
            0, 0, 0, 0, 0, 'unknown', 0, false, 0, false,
            NOW(), NOW(), NOW(), false
          )
        `);
        
        insertedCount++;
        
        if (insertedCount % 10 === 0) {
          console.log(`   Progress: ${insertedCount}/${workshopUsers.length} inserted`);
        }
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${user.full_name}: ${errorMsg}`);
        console.error(`❌ Failed to insert ${user.full_name}: ${errorMsg}`);
      }
    }
    
    // Step 5: Verify final state
    console.log('\n📋 Step 5: Verifying migration results...');
    
    const finalResult = await parentDb.execute(sql`SELECT COUNT(*) as count FROM users`);
    const finalCount = Number(finalResult.rows[0]?.count || 0);
    
    const finalWorkshopsResult = await parentDb.execute(sql`
      SELECT COUNT(*) as count FROM users WHERE user_type = 'workshop_provider'
    `);
    const finalWorkshops = Number(finalWorkshopsResult.rows[0]?.count || 0);
    
    // Final summary
    console.log('\n🎉 MIGRATION COMPLETE!');
    console.log('======================');
    console.log(`📊 Workshop users inserted: ${insertedCount}`);
    console.log(`📊 Workshop users skipped: ${skippedCount} (duplicates)`);
    console.log(`📊 Errors: ${errors.length}`);
    console.log(`📊 Final total users: ${finalCount}`);
    console.log(`📊 Final workshop users: ${finalWorkshops}`);
    console.log(`📊 Maritime professionals: ${finalCount - finalWorkshops}`);
    
    const expectedTotal = parentCount + insertedCount;
    const success = finalCount === expectedTotal && finalWorkshops === insertedCount;
    console.log(`✅ Migration Status: ${success ? 'SUCCESS' : 'PARTIAL SUCCESS'}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Migration Errors:');
      errors.slice(0, 5).forEach(error => console.log(`   - ${error}`));
      if (errors.length > 5) {
        console.log(`   ... and ${errors.length - 5} more errors`);
      }
    }
    
    return {
      success: insertedCount > 0,
      inserted: insertedCount,
      skipped: skippedCount,
      errors: errors.length,
      finalCount,
      finalWorkshops
    };
    
  } catch (error) {
    console.error('\n💥 MIGRATION FAILED:', error);
    throw error;
  } finally {
    // Close connections
    await parentPool.end();
    await sourcePool.end();
    console.log('\n🔒 Database connections closed');
  }
}

// Execute migration
crossDatabaseMigration().then((result) => {
  console.log('\n✅ Cross-database migration completed successfully!');
  console.log(`Final result: ${result.inserted} users migrated`);
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Cross-database migration failed:', error);
  process.exit(1);
});