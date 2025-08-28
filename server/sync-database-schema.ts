import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

async function syncDatabaseSchema() {
  const parentUrl = process.env.PARENT_DATABASE_URL || 
    'postgresql://neondb_owner:npg_rTOn7VZkYAb3@ep-autumn-hat-a27gd1cd.eu-central-1.aws.neon.tech/neondb?sslmode=require';
  const localUrl = process.env.DATABASE_URL;
  
  console.log('🔄 Syncing database schema from parent to local...\n');
  
  const parentPool = new Pool({ 
    connectionString: parentUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  const localPool = new Pool({ 
    connectionString: localUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const parentClient = await parentPool.connect();
    const localClient = await localPool.connect();
    
    // List of critical tables to sync
    const tablesToSync = ['users', 'questions', 'user_answers', 'sessions'];
    
    for (const tableName of tablesToSync) {
      console.log(`📋 Syncing table: ${tableName}`);
      
      try {
        // Drop existing table in local database
        await localClient.query(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
        console.log(`  ↳ Dropped existing table`);
        
        // Get table structure from parent database
        const structureResult = await parentClient.query(`
          SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = $1 AND table_schema = 'public'
          ORDER BY ordinal_position
        `, [tableName]);
        
        if (structureResult.rows.length === 0) {
          console.log(`  ⚠️ Table ${tableName} doesn't exist in parent database`);
          continue;
        }
        
        // Build CREATE TABLE statement
        let createStatement = `CREATE TABLE ${tableName} (`;
        const columns = structureResult.rows.map(col => {
          let colDef = `"${col.column_name}" ${col.data_type}`;
          
          // Add length for varchar/char types
          if (col.character_maximum_length) {
            colDef += `(${col.character_maximum_length})`;
          }
          
          // Add NOT NULL constraint
          if (col.is_nullable === 'NO') {
            colDef += ' NOT NULL';
          }
          
          // Add default value
          if (col.column_default) {
            colDef += ` DEFAULT ${col.column_default}`;
          }
          
          return colDef;
        });
        
        createStatement += columns.join(', ');
        
        // Get primary key
        const pkResult = await parentClient.query(`
          SELECT column_name
          FROM information_schema.key_column_usage
          WHERE table_name = $1 AND constraint_name LIKE '%_pkey'
        `, [tableName]);
        
        if (pkResult.rows.length > 0) {
          const pkColumns = pkResult.rows.map(r => `"${r.column_name}"`).join(', ');
          createStatement += `, PRIMARY KEY (${pkColumns})`;
        }
        
        createStatement += ')';
        
        // Create table in local database
        await localClient.query(createStatement);
        console.log(`  ✅ Table structure replicated`);
        
        // Copy data from parent to local
        const dataResult = await parentClient.query(`SELECT * FROM ${tableName}`);
        
        if (dataResult.rows.length > 0) {
          console.log(`  📦 Copying ${dataResult.rows.length} records...`);
          
          // Insert data in batches
          const batchSize = 100;
          for (let i = 0; i < dataResult.rows.length; i += batchSize) {
            const batch = dataResult.rows.slice(i, i + batchSize);
            
            for (const row of batch) {
              const columns = Object.keys(row).map(k => `"${k}"`).join(', ');
              const values = Object.values(row);
              const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');
              
              try {
                await localClient.query(
                  `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
                  values
                );
              } catch (insertError) {
                // Skip individual insert errors
              }
            }
          }
          
          // Verify count
          const countResult = await localClient.query(`SELECT COUNT(*) FROM ${tableName}`);
          console.log(`  ✅ Copied ${countResult.rows[0].count} records successfully`);
        } else {
          console.log(`  ℹ️ No data to copy`);
        }
        
      } catch (error) {
        console.error(`  ❌ Failed to sync ${tableName}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }
    
    parentClient.release();
    localClient.release();
    
    // Show final status
    console.log('\n📊 Final status of local database:');
    const finalClient = await localPool.connect();
    for (const tableName of tablesToSync) {
      try {
        const countResult = await finalClient.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`  ${tableName}: ${countResult.rows[0].count} records`);
      } catch (error) {
        console.log(`  ${tableName}: table not found`);
      }
    }
    finalClient.release();
    
  } catch (error) {
    console.error('❌ Sync failed:', error instanceof Error ? error.message : 'Unknown error');
  } finally {
    await parentPool.end();
    await localPool.end();
  }
  
  process.exit(0);
}

syncDatabaseSchema();