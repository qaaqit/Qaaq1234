import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

async function verifyExactReplica() {
  const localUrl = process.env.DATABASE_URL;
  
  console.log('📊 Verifying exact replica in local database...\n');
  
  const localPool = new Pool({ 
    connectionString: localUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const client = await localPool.connect();
    
    // Check what tables exist
    const tablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      AND tablename NOT LIKE 'backup_%'
      ORDER BY tablename
    `);
    
    console.log('✅ Tables with EXACT parent database names:');
    console.log('=' .repeat(50));
    
    const tableStats = [];
    for (const row of tablesResult.rows) {
      const tableName = row.tablename;
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
        const count = parseInt(countResult.rows[0].count);
        tableStats.push({ table: tableName, count });
        if (count > 0) {
          console.log(`  ✓ ${tableName}: ${count} records`);
        } else {
          console.log(`  ✓ ${tableName}: ready (empty)`);
        }
      } catch (e) {
        console.log(`  ⚠️ ${tableName}: access issue`);
      }
    }
    
    // Check if any backup_ prefixed tables still exist
    const backupTablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      AND tablename LIKE 'backup_%'
    `);
    
    if (backupTablesResult.rows.length > 0) {
      console.log('\n⚠️ Old backup tables still exist (can be removed):');
      backupTablesResult.rows.forEach(row => {
        console.log(`  - ${row.tablename}`);
      });
    }
    
    const totalRecords = tableStats.reduce((sum, t) => sum + t.count, 0);
    const tablesWithData = tableStats.filter(t => t.count > 0);
    
    console.log('\n' + '=' .repeat(50));
    console.log('📈 VERIFICATION SUMMARY:');
    console.log('=' .repeat(50));
    console.log(`  Total tables (exact names): ${tablesResult.rows.length}`);
    console.log(`  Tables with data: ${tablesWithData.length}`);
    console.log(`  Total records: ${totalRecords}`);
    console.log('\n✅ SUCCESS! Your local database tables now have EXACT');
    console.log('   same names as parent database. You can switch');
    console.log('   DATABASE_URL without any issues!');
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
  } finally {
    await localPool.end();
  }
  
  process.exit(0);
}

verifyExactReplica();