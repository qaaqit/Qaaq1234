import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

async function simpleBackup() {
  const parentUrl = process.env.PARENT_DATABASE_URL || 
    'postgresql://neondb_owner:npg_rTOn7VZkYAb3@ep-autumn-hat-a27gd1cd.eu-central-1.aws.neon.tech/neondb?sslmode=require';
  const localUrl = process.env.DATABASE_URL;
  
  console.log('🔄 Performing simplified backup...\n');
  
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
    
    // 1. Create simplified users table
    console.log('📋 Creating simplified backup tables...');
    
    await localClient.query(`DROP TABLE IF EXISTS backup_users CASCADE`);
    await localClient.query(`
      CREATE TABLE backup_users (
        id VARCHAR PRIMARY KEY,
        user_id TEXT,
        full_name TEXT,
        email TEXT,
        maritime_rank TEXT,
        ship_name TEXT,
        country TEXT,
        city TEXT,
        is_premium BOOLEAN,
        created_at TIMESTAMP
      )
    `);
    
    await localClient.query(`DROP TABLE IF EXISTS backup_questions CASCADE`);
    await localClient.query(`
      CREATE TABLE backup_questions (
        id VARCHAR PRIMARY KEY,
        question_text TEXT,
        user_id VARCHAR,
        created_at TIMESTAMP
      )
    `);
    
    await localClient.query(`DROP TABLE IF EXISTS backup_sessions CASCADE`);
    await localClient.query(`
      CREATE TABLE backup_sessions (
        sid VARCHAR PRIMARY KEY,
        sess JSONB,
        expire TIMESTAMP
      )
    `);
    
    console.log('✅ Backup tables created\n');
    
    // 2. Copy users data (simplified)
    console.log('📦 Backing up users...');
    const usersResult = await parentClient.query(`
      SELECT 
        id, user_id, full_name, email, maritime_rank, 
        ship_name, country, city, is_premium, created_at
      FROM users 
      LIMIT 5000
    `);
    
    if (usersResult.rows.length > 0) {
      for (const user of usersResult.rows) {
        await localClient.query(
          `INSERT INTO backup_users VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT DO NOTHING`,
          [user.id, user.user_id, user.full_name, user.email, user.maritime_rank, 
           user.ship_name, user.country, user.city, user.is_premium, user.created_at]
        );
      }
      console.log(`✅ Backed up ${usersResult.rows.length} users`);
    }
    
    // 3. Copy questions data
    console.log('📦 Backing up questions...');
    const questionsResult = await parentClient.query(`
      SELECT id, question_text, user_id, created_at 
      FROM questions 
      LIMIT 5000
    `);
    
    if (questionsResult.rows.length > 0) {
      for (const q of questionsResult.rows) {
        await localClient.query(
          `INSERT INTO backup_questions VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [q.id, q.question_text, q.user_id, q.created_at]
        );
      }
      console.log(`✅ Backed up ${questionsResult.rows.length} questions`);
    }
    
    // 4. Copy recent sessions
    console.log('📦 Backing up sessions...');
    const sessionsResult = await parentClient.query(`
      SELECT sid, sess, expire 
      FROM sessions 
      WHERE expire > NOW()
      LIMIT 1000
    `);
    
    if (sessionsResult.rows.length > 0) {
      for (const s of sessionsResult.rows) {
        await localClient.query(
          `INSERT INTO backup_sessions VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [s.sid, s.sess, s.expire]
        );
      }
      console.log(`✅ Backed up ${sessionsResult.rows.length} active sessions`);
    }
    
    // 5. Show summary
    console.log('\n📊 Backup Summary:');
    const userCount = await localClient.query('SELECT COUNT(*) FROM backup_users');
    const questionCount = await localClient.query('SELECT COUNT(*) FROM backup_questions');
    const sessionCount = await localClient.query('SELECT COUNT(*) FROM backup_sessions');
    
    console.log(`  backup_users: ${userCount.rows[0].count} records`);
    console.log(`  backup_questions: ${questionCount.rows[0].count} records`);
    console.log(`  backup_sessions: ${sessionCount.rows[0].count} records`);
    
    console.log('\n✅ Simplified backup completed successfully!');
    console.log('📝 Data is now available in your local database with "backup_" prefix');
    
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

simpleBackup();