import { db } from "./db";
import { users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

interface WorkshopUser {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  password: string;
  user_type: string;
  is_workshop_provider: boolean;
  // ... other fields
}

export class WorkshopMigration {
  
  // Step 1: Check parent database current state
  static async checkParentDatabaseState() {
    console.log('🔍 PHASE 2: Checking parent database state...');
    
    try {
      // Count total users in parent
      const totalResult = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
      const totalCount = totalResult.rows[0]?.count || 0;
      
      // Count by user types
      const typesResult = await db.execute(sql`
        SELECT user_type, COUNT(*) as count 
        FROM users 
        WHERE user_type IS NOT NULL 
        GROUP BY user_type
      `);
      
      // Check for existing workshop providers
      const workshopResult = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE user_type = 'workshop_provider'
      `);
      const existingWorkshops = workshopResult.rows[0]?.count || 0;
      
      console.log(`📊 Parent Database State:`);
      console.log(`   Total Users: ${totalCount}`);
      console.log(`   Existing Workshops: ${existingWorkshops}`);
      console.log(`   User Types:`, typesResult.rows);
      
      return {
        totalCount: Number(totalCount),
        existingWorkshops: Number(existingWorkshops),
        userTypes: typesResult.rows
      };
    } catch (error) {
      console.error('❌ Failed to check parent database:', error);
      throw error;
    }
  }
  
  // Step 2: Check for conflicts before insertion
  static async checkForConflicts(workshopUsers: WorkshopUser[]) {
    console.log('🔍 Checking for email conflicts...');
    
    const emails = workshopUsers.map(u => u.email).filter(email => email);
    const conflicts = [];
    
    for (const email of emails) {
      const existing = await db.execute(sql`
        SELECT id, email, full_name, user_type 
        FROM users 
        WHERE email = ${email}
      `);
      
      if (existing.rows.length > 0) {
        conflicts.push({
          email,
          existing: existing.rows[0],
          workshop: workshopUsers.find(u => u.email === email)
        });
      }
    }
    
    if (conflicts.length > 0) {
      console.log(`⚠️ Found ${conflicts.length} email conflicts:`);
      conflicts.forEach(c => {
        console.log(`   ${c.email}: Existing(${c.existing.user_type}) vs Workshop`);
      });
    } else {
      console.log('✅ No email conflicts found');
    }
    
    return conflicts;
  }
  
  // Step 3: Safe insertion with conflict resolution
  static async insertWorkshopUsers(workshopUsers: WorkshopUser[]) {
    console.log('🚀 Starting workshop user insertion...');
    
    let insertedCount = 0;
    let skippedCount = 0;
    const errors = [];
    
    for (const user of workshopUsers) {
      try {
        // Check for existing user with same email
        if (user.email) {
          const existing = await db.execute(sql`
            SELECT id FROM users WHERE email = ${user.email}
          `);
          
          if (existing.rows.length > 0) {
            console.log(`⏭️ Skipping duplicate email: ${user.email}`);
            skippedCount++;
            continue;
          }
        }
        
        // Insert workshop user with all fields
        await db.execute(sql`
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
            created_at, updated_at, last_activity_at,
            has_confirmed_maritime_rank
          ) VALUES (
            ${user.id}, ${user.user_id}, ${user.full_name}, ${user.email}, 
            ${user.password}, 'workshop_provider', true, false, true, true,
            'qaaq', '[]', false, false, false, 'unverified', 'public', false,
            '{"push": true, "email": true}', false, 'en', 'UTC', 'free',
            0, 0, 0, 0, 0, 'unknown', 0, false, 0, false,
            NOW(), NOW(), NOW(), false
          )
        `);
        
        insertedCount++;
        if (insertedCount % 10 === 0) {
          console.log(`   Progress: ${insertedCount}/${workshopUsers.length} users inserted`);
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ user: user.full_name, error: errorMessage });
        console.error(`❌ Failed to insert ${user.full_name}:`, errorMessage);
      }
    }
    
    console.log(`✅ Migration Summary:`);
    console.log(`   Inserted: ${insertedCount} users`);
    console.log(`   Skipped: ${skippedCount} users (duplicates)`);
    console.log(`   Errors: ${errors.length} users`);
    
    return { insertedCount, skippedCount, errors };
  }
  
  // Step 4: Verify final state
  static async verifyMigration() {
    console.log('🔍 Verifying migration results...');
    
    const finalResult = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
    const finalCount = Number(finalResult.rows[0]?.count || 0);
    
    const workshopResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM users WHERE user_type = 'workshop_provider'
    `);
    const workshopCount = Number(workshopResult.rows[0]?.count || 0);
    
    console.log(`📊 Final Database State:`);
    console.log(`   Total Users: ${finalCount}`);
    console.log(`   Workshop Providers: ${workshopCount}`);
    console.log(`   Expected: 1440 total users`);
    console.log(`   Status: ${finalCount === 1440 ? '✅ SUCCESS' : '⚠️ CHECK NEEDED'}`);
    
    return { finalCount, workshopCount };
  }
}