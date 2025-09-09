#!/usr/bin/env tsx
import { WorkshopCSVImportService } from './workshop-csv-import';
import { db } from './db';
import { sql } from 'drizzle-orm';
import path from 'path';

async function importWorkshopsToParent() {
  console.log('🚀 WORKSHOP CSV IMPORT TO PARENT DATABASE');
  console.log('=========================================');
  
  try {
    // Step 1: Check current database state
    console.log('\n📋 Step 1: Checking current database state...');
    const currentResult = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
    const currentCount = Number(currentResult.rows[0]?.count || 0);
    console.log(`📊 Current user count: ${currentCount}`);
    
    const workshopResult = await db.execute(sql`SELECT COUNT(*) as count FROM users WHERE user_type = 'workshop_provider'`);
    const existingWorkshops = Number(workshopResult.rows[0]?.count || 0);
    console.log(`📊 Existing workshop providers: ${existingWorkshops}`);
    
    if (existingWorkshops > 0) {
      console.log('⚠️  Workshop providers already exist. This may create duplicates.');
      console.log('Proceeding anyway - duplicates will be handled by email checks.');
    }
    
    // Step 2: Locate CSV file
    console.log('\n📋 Step 2: Locating workshop CSV file...');
    const csvFileName = 'Marine Repairs Workshop Database (Responses) - Form Responses 1_1757340763699.csv';
    const csvPath = path.join(process.cwd(), '..', 'attached_assets', csvFileName);
    
    // Verify file exists
    try {
      const fs = await import('fs/promises');
      await fs.access(csvPath);
      console.log('✅ CSV file found successfully');
    } catch (error) {
      console.log('❌ CSV file not found, trying alternative paths...');
      const altPath = path.join(process.cwd(), 'attached_assets', csvFileName);
      try {
        await fs.access(altPath);
        console.log('✅ CSV file found at alternative path');
        return await workshopService.importFromFile(altPath, adminUserId);
      } catch {
        throw new Error(`CSV file not found at: ${csvPath} or ${altPath}`);
      }
    }
    console.log(`🔍 CSV file path: ${csvPath}`);
    
    // Step 3: Import workshops from CSV
    console.log('\n📋 Step 3: Importing workshops from CSV...');
    const workshopService = new WorkshopCSVImportService();
    
    // Use a system admin user ID for import tracking
    const adminUserId = 'system_admin_workshop_migration_2025';
    
    const importResult = await workshopService.importFromFile(csvPath, adminUserId);
    
    console.log('\n✅ Import Results:');
    console.log(`   Success: ${importResult.success}`);
    console.log(`   Imported: ${importResult.imported} new workshops`);
    console.log(`   Updated: ${importResult.updated} existing workshops`);
    console.log(`   Errors: ${importResult.errors.length}`);
    
    if (importResult.errors.length > 0) {
      console.log('\n❌ Import Errors:');
      importResult.errors.slice(0, 5).forEach(error => {
        console.log(`   - ${error}`);
      });
      if (importResult.errors.length > 5) {
        console.log(`   ... and ${importResult.errors.length - 5} more errors`);
      }
    }
    
    // Step 4: Verify final state
    console.log('\n📋 Step 4: Verifying final database state...');
    const finalResult = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
    const finalCount = Number(finalResult.rows[0]?.count || 0);
    
    const finalWorkshopsResult = await db.execute(sql`SELECT COUNT(*) as count FROM users WHERE user_type = 'workshop_provider'`);
    const finalWorkshops = Number(finalWorkshopsResult.rows[0]?.count || 0);
    
    console.log('\n🎉 FINAL DATABASE STATE:');
    console.log('========================');
    console.log(`📊 Total users: ${finalCount}`);
    console.log(`📊 Workshop providers: ${finalWorkshops}`);
    console.log(`📊 Maritime professionals: ${finalCount - finalWorkshops}`);
    console.log(`📊 Expected total: ~1446 users`);
    
    const success = finalWorkshops > existingWorkshops;
    console.log(`✅ Import Status: ${success ? 'SUCCESS' : 'CHECK NEEDED'}`);
    
    if (success) {
      console.log(`🎯 Added ${finalWorkshops - existingWorkshops} workshop users to parent database!`);
    }
    
  } catch (error) {
    console.error('\n💥 IMPORT FAILED:', error);
    console.error('Check CSV file path and permissions.');
    throw error;
  }
}

// Execute import
importWorkshopsToParent().then(() => {
  console.log('\nWorkshop CSV import completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('\nWorkshop CSV import failed:', error);
  process.exit(1);
});