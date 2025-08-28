import { exactReplicaBackup } from './exact-replica-backup';

async function runReplicaBackup() {
  console.log('🚀 Starting exact replica backup...');
  console.log('This will create identical table structures in your local database\n');
  
  try {
    await exactReplicaBackup.performFullBackup();
    
    console.log('\n✅ Backup process completed!');
    console.log('Your local database now has tables with exact same names as parent database.');
    console.log('You can switch DATABASE_URL without any application issues.');
    
  } catch (error) {
    console.error('❌ Backup failed:', error instanceof Error ? error.message : 'Unknown error');
  }
  
  process.exit(0);
}

runReplicaBackup();