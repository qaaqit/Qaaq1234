#!/usr/bin/env tsx
import { WorkshopMigration } from './workshop-migration-script';
import { db } from './db';
import { sql } from 'drizzle-orm';

async function runMigration() {
  console.log('🚀 WORKSHOP MIGRATION TO PARENT DATABASE');
  console.log('=====================================');
  
  try {
    // Step 1: Check current state of parent database
    console.log('\n📋 Step 1: Checking parent database state...');
    const parentState = await WorkshopMigration.checkParentDatabaseState();
    
    console.log(`📊 Parent Database has ${parentState.totalCount} maritime professionals`);
    console.log(`🎯 Target after migration: ${parentState.totalCount + 93} users total`);
    
    if (parentState.totalCount < 1300) {
      console.log(`⚠️ WARNING: Expected ~1350+ users, found only ${parentState.totalCount}`);
      console.log('This seems too low for production database. Check connection.');
      return;
    }
    
    if (parentState.existingWorkshops > 0) {
      console.log(`⚠️ Found ${parentState.existingWorkshops} existing workshops in parent DB`);
      console.log('Workshop users may already be migrated. Check manually.');
      return;
    }
    
    // Step 2: Get workshop users from current database (this should be local/dev)
    console.log('\n📋 Step 2: Extracting workshop users from source...');
    const workshopResult = await db.execute(sql`
      SELECT * FROM users WHERE user_type = 'workshop_provider'
    `);
    
    const workshopUsers = workshopResult.rows;
    console.log(`✅ Found ${workshopUsers.length} workshop users to migrate`);
    
    if (workshopUsers.length !== 93) {
      console.log(`⚠️ WARNING: Expected 93 workshops, found ${workshopUsers.length}`);
    }
    
    // Step 3: Check for conflicts
    console.log('\n📋 Step 3: Checking for conflicts...');
    const conflicts = await WorkshopMigration.checkForConflicts(workshopUsers as any);
    
    if (conflicts.length > 0) {
      console.log(`❌ Found ${conflicts.length} conflicts. Cannot proceed safely.`);
      return;
    }
    
    // Step 4: Proceed with migration
    console.log('\n📋 Step 4: Migrating workshop users...');
    console.log('🔄 Starting safe insertion to parent database...');
    
    const migrationResult = await WorkshopMigration.insertWorkshopUsers(workshopUsers as any);
    
    // Step 5: Verify results
    console.log('\n📋 Step 5: Verifying migration...');
    const verification = await WorkshopMigration.verifyMigration();
    
    // Final summary
    console.log('\n🎉 MIGRATION COMPLETE!');
    console.log('====================');
    console.log(`📊 Workshop users migrated: ${migrationResult.insertedCount}`);
    console.log(`📊 Final user count: ${verification.finalCount}`);
    console.log(`📊 Workshop providers: ${verification.workshopCount}`);
    console.log(`✅ Success: ${verification.finalCount === 1440 ? 'YES' : 'CHECK NEEDED'}`);
    
  } catch (error) {
    console.error('💥 MIGRATION FAILED:', error);
    console.error('Database state may be inconsistent. Check manually.');
  }
}

// Run migration
runMigration().then(() => {
  console.log('Migration script completed');
}).catch(error => {
  console.error('Migration script error:', error);
});