import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

async function cleanupOldBackupTables() {
  const localUrl = process.env.DATABASE_URL;
  
  console.log('🧹 Cleaning up old backup tables...\n');
  
  const localPool = new Pool({ 
    connectionString: localUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const client = await localPool.connect();
    
    // Find all backup_ prefixed tables
    const backupTablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      AND tablename LIKE 'backup_%'
    `);
    
    if (backupTablesResult.rows.length === 0) {
      console.log('✅ No old backup tables found. Your database is clean!');
    } else {
      console.log(`Found ${backupTablesResult.rows.length} old backup tables to remove:`);
      
      for (const row of backupTablesResult.rows) {
        const tableName = row.tablename;
        console.log(`  🗑️ Dropping table: ${tableName}`);
        await client.query(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
      }
      
      console.log('\n✅ All old backup tables removed successfully!');
    }
    
    // Show final state
    const finalTablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    console.log('\n📋 Final database state - Tables with exact parent names:');
    console.log('=' .repeat(50));
    finalTablesResult.rows.forEach(row => {
      console.log(`  ✓ ${row.tablename}`);
    });
    
    console.log('\n✅ Cleanup complete! Your database is ready for seamless URL switching.');
    
    client.release();
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error instanceof Error ? error.message : 'Unknown error');
  } finally {
    await localPool.end();
  }
  
  process.exit(0);
}

cleanupOldBackupTables();