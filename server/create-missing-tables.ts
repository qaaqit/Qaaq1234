import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

const userProvidedUrl = 'postgresql://neondb_owner:npg_rTOn7VZkYAb3@ep-autumn-hat-a27gd1cd.eu-central-1.aws.neon.tech/neondb?sslmode=require';

async function createMissingTables() {
  const pool = new Pool({ 
    connectionString: userProvidedUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log('Creating missing tables for QaaqConnect...');
    
    // Create verification_codes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS verification_codes (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        code TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT now()
      );
    `);
    console.log('✓ Created verification_codes table');

    // Create posts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        content TEXT NOT NULL,
        location TEXT,
        category TEXT NOT NULL,
        author_type TEXT NOT NULL,
        author_name TEXT,
        images JSONB DEFAULT '[]',
        likes_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT now()
      );
    `);
    console.log('✓ Created posts table');

    // Create likes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS likes (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        post_id VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT now()
      );
    `);
    console.log('✓ Created likes table');

    // Create chat_connections table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_connections (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id VARCHAR NOT NULL,
        receiver_id VARCHAR NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT now(),
        accepted_at TIMESTAMP
      );
    `);
    console.log('✓ Created chat_connections table');

    // Create chat_messages table (Note: avoiding conflict with existing table)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS qaaq_chat_messages (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        connection_id VARCHAR NOT NULL,
        sender_id VARCHAR NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT now()
      );
    `);
    console.log('✓ Created qaaq_chat_messages table');

    // Create bot_documentation table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bot_documentation (
        doc_key VARCHAR PRIMARY KEY,
        doc_value TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      );
    `);
    console.log('✓ Created bot_documentation table');

    // Create CPSS groups tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cpss_groups (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        country TEXT NOT NULL,
        port TEXT,
        suburb TEXT,
        service TEXT,
        group_type TEXT NOT NULL,
        member_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT now()
      );
    `);
    console.log('✓ Created cpss_groups table');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS cpss_group_members (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id VARCHAR NOT NULL,
        user_id VARCHAR NOT NULL,
        joined_at TIMESTAMP DEFAULT now(),
        UNIQUE(group_id, user_id)
      );
    `);
    console.log('✓ Created cpss_group_members table');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS cpss_group_posts (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id VARCHAR NOT NULL,
        user_id VARCHAR NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT now()
      );
    `);
    console.log('✓ Created cpss_group_posts table');

    // Create shared Q&A tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS qaaq_questions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        question_text TEXT NOT NULL,
        category TEXT,
        tags TEXT[],
        source TEXT DEFAULT 'web',
        status TEXT DEFAULT 'open',
        created_at TIMESTAMP DEFAULT now()
      );
    `);
    console.log('✓ Created qaaq_questions table');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS qaaq_answers (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        question_id VARCHAR NOT NULL,
        user_id VARCHAR NOT NULL,
        answer_text TEXT NOT NULL,
        is_accepted BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT now()
      );
    `);
    console.log('✓ Created qaaq_answers table');

    // Create rank groups tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rank_groups (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        member_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT now()
      );
    `);
    console.log('✓ Created rank_groups table');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS rank_group_members (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id VARCHAR NOT NULL,
        user_id VARCHAR NOT NULL,
        joined_at TIMESTAMP DEFAULT now(),
        UNIQUE(group_id, user_id)
      );
    `);
    console.log('✓ Created rank_group_members table');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS rank_group_messages (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id VARCHAR NOT NULL,
        user_id VARCHAR NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT now()
      );
    `);
    console.log('✓ Created rank_group_messages table');

    console.log('\n🎉 All missing tables created successfully!');

    // Show current tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Current database tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  • ${row.table_name}`);
    });

  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    await pool.end();
  }
}

createMissingTables();