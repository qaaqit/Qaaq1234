#!/usr/bin/env tsx
import { db } from './db';
import { sql } from 'drizzle-orm';

// Workshop users data from the backup (sample data)
const workshopUsers = [
  {
    id: '060d7b49-f75f-413b-b39a-0b0660ad8e79',
    full_name: 'SARA',
    email: 'sales@sarashipequipments.com',
    user_id: 'sales@sarashipequipments.com'
  },
  {
    id: 'e6f84bc2-fef5-42f9-8cf9-cb84bcc7a2cc',
    full_name: 'Rahmat Ibrahim', 
    email: 'Rahamathullah.ibrahim@goltens.com',
    user_id: 'Rahamathullah.ibrahim@goltens.com'
  },
  {
    id: '0dc5424a-4f5d-4a57-8b8e-31032557669f',
    full_name: 'MARINE HYDRAULIC SOLUTIONS [INDIA]',
    email: 'info@mhshydraulic.com', 
    user_id: 'info@mhshydraulic.com'
  }
];

async function testWorkshopInsert() {
  console.log('🧪 TESTING WORKSHOP INSERT TO PARENT DATABASE');
  console.log('===============================================');
  
  try {
    // Test 1: Check column exists
    console.log('📋 Test 1: Verifying column exists...');
    const columnCheck = await db.execute(sql`
      SELECT COUNT(*) as count FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'is_workshop_provider'
    `);
    const hasColumn = Number(columnCheck.rows[0]?.count || 0) > 0;
    console.log(`✅ is_workshop_provider column exists: ${hasColumn}`);
    
    if (!hasColumn) {
      console.log('❌ Column missing - adding it...');
      await db.execute(sql`ALTER TABLE users ADD COLUMN is_workshop_provider boolean DEFAULT false`);
      console.log('✅ Column added successfully');
    }
    
    // Test 2: Try simple insert
    console.log('\n📋 Test 2: Attempting simple workshop user insert...');
    const testUser = workshopUsers[0];
    
    // Check if user already exists
    const existingResult = await db.execute(sql`
      SELECT id FROM users WHERE email = ${testUser.email}
    `);
    
    if (existingResult.rows.length > 0) {
      console.log(`⚠️ User already exists: ${testUser.email}`);
      return;
    }
    
    // Insert test user
    await db.execute(sql`
      INSERT INTO users (
        id, user_id, full_name, email, password, user_type, 
        is_workshop_provider, has_set_custom_password, needs_password_change,
        must_create_password, primary_auth_provider, auth_providers,
        is_admin, is_verified, verification_status, visibility_setting,
        privacy_mode, notification_preferences, dark_mode, 
        language_preference, timezone, subscription_status,
        failed_login_attempts, login_count, questions_asked_count,
        answers_given_count, likes_received_count, location_source,
        question_count, trial_used, payment_failures, premium_welcome_sent,
        created_at, updated_at, last_activity_at, has_confirmed_maritime_rank
      ) VALUES (
        ${testUser.id}, ${testUser.user_id}, ${testUser.full_name}, ${testUser.email}, 
        'Repair123', 'workshop_provider', true, false, true, true,
        'qaaq', '[]'::jsonb, false, false, 'unverified', 'public',
        false, '{"push": true, "email": true}'::jsonb, false,
        'en', 'UTC', 'free', 0, 0, 0, 0, 0, 'unknown',
        0, false, 0, false, NOW(), NOW(), NOW(), false
      )
    `);
    
    console.log(`✅ Successfully inserted: ${testUser.full_name}`);
    
    // Verify insertion
    const verifyResult = await db.execute(sql`
      SELECT id, full_name, email, user_type, is_workshop_provider 
      FROM users WHERE email = ${testUser.email}
    `);
    
    if (verifyResult.rows.length > 0) {
      const insertedUser = verifyResult.rows[0];
      console.log(`✅ Verification successful:`);
      console.log(`   Name: ${insertedUser.full_name}`);
      console.log(`   Type: ${insertedUser.user_type}`);
      console.log(`   Workshop: ${insertedUser.is_workshop_provider}`);
    }
    
    // Get final counts
    const totalResult = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
    const workshopResult = await db.execute(sql`SELECT COUNT(*) as count FROM users WHERE is_workshop_provider = true`);
    
    console.log(`\n📊 Final Database State:`);
    console.log(`   Total Users: ${totalResult.rows[0]?.count || 0}`);
    console.log(`   Workshop Providers: ${workshopResult.rows[0]?.count || 0}`);
    
    console.log('\n🎉 Workshop insert test SUCCESSFUL!');
    
  } catch (error) {
    console.error('❌ Workshop insert test FAILED:', error);
    throw error;
  }
}

testWorkshopInsert().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});