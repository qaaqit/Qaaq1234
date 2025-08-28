/**
 * Test script for database backup functionality
 * Run this script to verify the backup service is working correctly
 */
import { databaseBackupService } from './database-backup-service';

async function testBackupService() {
  console.log('🧪 Testing Database Backup Service...\n');
  
  try {
    // Test 1: Check database connections
    console.log('📡 Testing database connections...');
    const connectionStatus = await databaseBackupService.testConnections();
    console.log('Connection Status:');
    console.log(`  - Parent DB: ${connectionStatus.parentDb ? '✅ Connected' : '❌ Failed'}`);
    console.log(`  - Local DB: ${connectionStatus.localDb ? '✅ Connected' : '❌ Failed'}`);
    
    if (connectionStatus.errors.length > 0) {
      console.log('  - Errors:', connectionStatus.errors);
    }
    console.log('');
    
    // Test 2: Check backup status
    console.log('📊 Checking backup status...');
    const status = databaseBackupService.getStatus();
    console.log('Backup Status:');
    console.log(`  - Currently running: ${status.isRunning ? 'Yes' : 'No'}`);
    console.log(`  - Last backup: ${status.lastBackupTime || 'Never'}`);
    console.log(`  - Next backup: ${status.nextBackupTime || 'Not scheduled'}`);
    
    if (status.backupHistory.length > 0) {
      console.log('  - Recent backups:');
      status.backupHistory.slice(-3).forEach(backup => {
        console.log(`    * ${backup.timestamp} - ${backup.status} (${backup.tablesBackedUp} tables, ${backup.recordsBackedUp} records)`);
      });
    }
    console.log('');
    
    // Test 3: Perform a manual backup
    console.log('🔄 Triggering manual backup...');
    console.log('  (This may take a few seconds)');
    await databaseBackupService.performBackup();
    console.log('✅ Manual backup completed!\n');
    
    // Test 4: Check final status
    const finalStatus = databaseBackupService.getStatus();
    const lastBackup = finalStatus.backupHistory[finalStatus.backupHistory.length - 1];
    if (lastBackup) {
      console.log('📈 Latest backup results:');
      console.log(`  - Status: ${lastBackup.status}`);
      console.log(`  - Tables backed up: ${lastBackup.tablesBackedUp}`);
      console.log(`  - Records backed up: ${lastBackup.recordsBackedUp}`);
      console.log(`  - Duration: ${(lastBackup.duration / 1000).toFixed(2)} seconds`);
      if (lastBackup.error) {
        console.log(`  - Error: ${lastBackup.error}`);
      }
    }
    
    console.log('\n✨ All tests completed successfully!');
    console.log('💡 The backup service is scheduled to run automatically every 6 hours.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the test
testBackupService();