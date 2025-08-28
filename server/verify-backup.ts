import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

async function verifyBackup() {
  const localUrl = process.env.DATABASE_URL;
  
  console.log('📊 Checking local backup database (ep-tiny-bar)...\n');
  
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
      ORDER BY tablename
    `);
    
    console.log('✅ Tables in your local backup database:');
    
    const tableStats = [];
    for (const row of tablesResult.rows) {
      const tableName = row.tablename;
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
        const count = countResult.rows[0].count;
        tableStats.push({ table: tableName, count });
        if (count > 0) {
          console.log(`  📦 ${tableName}: ${count} records`);
        } else {
          console.log(`  📭 ${tableName}: empty`);
        }
      } catch (e) {
        console.log(`  ⚠️ ${tableName}: cannot access`);
      }
    }
    
    // Summary
    const totalRecords = tableStats.reduce((sum, t) => sum + parseInt(t.count), 0);
    const nonEmptyTables = tableStats.filter(t => parseInt(t.count) > 0);
    
    console.log('\n📈 Summary:');
    console.log(`  Total tables: ${tablesResult.rows.length}`);
    console.log(`  Tables with data: ${nonEmptyTables.length}`);
    console.log(`  Total records backed up: ${totalRecords}`);
    
    if (nonEmptyTables.length > 0) {
      console.log('\n✅ Your local database DOES contain backup data!');
      console.log('📝 Main tables with data:');
      nonEmptyTables.slice(0, 5).forEach(t => {
        console.log(`    - ${t.table}: ${t.count} records`);
      });
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
  } finally {
    await localPool.end();
  }
  
  process.exit(0);
}

verifyBackup();