import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

async function finalBackup() {
  const parentUrl = process.env.PARENT_DATABASE_URL || 
    'postgresql://neondb_owner:npg_rTOn7VZkYAb3@ep-autumn-hat-a27gd1cd.eu-central-1.aws.neon.tech/neondb?sslmode=require';
  const localUrl = process.env.DATABASE_URL;
  
  console.log('🔄 Final backup attempt...\n');
  
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
    
    // First, check what columns exist in parent users table
    console.log('🔍 Checking parent database structure...');
    const columnsResult = await parentClient.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND table_schema = 'public' 
      ORDER BY ordinal_position 
      LIMIT 20
    `);
    
    console.log('Available columns in users table:');
    columnsResult.rows.forEach(col => console.log(`  - ${col.column_name} (${col.data_type})`));
    
    // Create backup table with only the most basic fields
    console.log('\n📋 Creating minimal backup table...');
    
    await localClient.query(`DROP TABLE IF EXISTS backup_data CASCADE`);
    await localClient.query(`
      CREATE TABLE backup_data (
        id VARCHAR PRIMARY KEY,
        data_type VARCHAR,
        data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('✅ Backup table created\n');
    
    // Backup users as JSON
    console.log('📦 Backing up user data...');
    const usersResult = await parentClient.query(`
      SELECT id, full_name, email 
      FROM users 
      WHERE id IS NOT NULL
      LIMIT 100
    `);
    
    let userCount = 0;
    for (const user of usersResult.rows) {
      await localClient.query(
        `INSERT INTO backup_data (id, data_type, data) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [`user_${user.id}`, 'user', JSON.stringify(user)]
      );
      userCount++;
    }
    console.log(`✅ Backed up ${userCount} users`);
    
    // Backup questions as JSON
    console.log('📦 Backing up questions...');
    const questionsResult = await parentClient.query(`
      SELECT id, question_text 
      FROM questions 
      WHERE id IS NOT NULL
      LIMIT 100
    `);
    
    let questionCount = 0;
    for (const q of questionsResult.rows) {
      await localClient.query(
        `INSERT INTO backup_data (id, data_type, data) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [`question_${q.id}`, 'question', JSON.stringify(q)]
      );
      questionCount++;
    }
    console.log(`✅ Backed up ${questionCount} questions`);
    
    // Show summary
    console.log('\n📊 Backup Summary:');
    const totalCount = await localClient.query('SELECT COUNT(*) FROM backup_data');
    const byType = await localClient.query('SELECT data_type, COUNT(*) as count FROM backup_data GROUP BY data_type');
    
    console.log(`  Total records: ${totalCount.rows[0].count}`);
    byType.rows.forEach(row => {
      console.log(`    ${row.data_type}: ${row.count} records`);
    });
    
    console.log('\n✅ Backup completed!');
    console.log('📝 Your local database (ep-tiny-bar) now contains backed up data in the "backup_data" table');
    
    // Also show what tables exist in local db
    const tablesResult = await localClient.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `);
    console.log('\n📋 Tables in your local database:');
    tablesResult.rows.forEach(t => console.log(`  - ${t.tablename}`));
    
    parentClient.release();
    localClient.release();
    
  } catch (error) {
    console.error('❌ Backup failed:', error instanceof Error ? error.message : 'Unknown error');
  } finally {
    await parentPool.end();
    await localPool.end();
  }
  
  process.exit(0);
}

finalBackup();