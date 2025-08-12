import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as neonDrizzle } from 'drizzle-orm/neon-serverless';
import { Pool as PgPool } from 'pg';
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "./shared/schema";

neonConfig.webSocketConstructor = ws;

// Parent database (Neon) connection
const parentDbUrl = 'postgresql://neondb_owner:npg_rTOn7VZkYAb3@ep-autumn-hat-a27gd1cd.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const parentPool = new NeonPool({ 
  connectionString: parentDbUrl,
  ssl: { rejectUnauthorized: false }
});
const parentDb = neonDrizzle({ client: parentPool, schema });

// Local database connection
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const localPool = new PgPool({ 
  connectionString: process.env.DATABASE_URL
});
const localDb = pgDrizzle(localPool, { schema });

async function migrateDatabase() {
  console.log('🚀 Starting database migration from parent to local PostgreSQL...');
  
  try {
    // Test connections
    console.log('Testing parent database connection...');
    const parentClient = await parentPool.connect();
    console.log('✅ Parent database connected successfully');
    parentClient.release();
    
    console.log('Testing local database connection...');
    const localClient = await localPool.connect();
    console.log('✅ Local database connected successfully');
    localClient.release();
    
    // Create tables in local database
    console.log('🔨 Creating tables in local database...');
    await localPool.query(`
      -- Drop existing tables (if any)
      DROP TABLE IF EXISTS chat_messages CASCADE;
      DROP TABLE IF EXISTS chat_connections CASCADE;
      DROP TABLE IF EXISTS likes CASCADE;
      DROP TABLE IF EXISTS posts CASCADE;
      DROP TABLE IF EXISTS verification_codes CASCADE;
      DROP TABLE IF EXISTS user_tokens CASCADE;
      DROP TABLE IF EXISTS shared_qa CASCADE;
      DROP TABLE IF EXISTS answers CASCADE;
      DROP TABLE IF EXISTS questions CASCADE;
      DROP TABLE IF EXISTS question_attachments CASCADE;
      DROP TABLE IF EXISTS email_verification_tokens CASCADE;
      DROP TABLE IF EXISTS subscriptions CASCADE;
      DROP TABLE IF EXISTS payments CASCADE;
      DROP TABLE IF EXISTS bot_documentation CASCADE;
      DROP TABLE IF EXISTS ai_feedback CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      
      -- Create users table
      CREATE TABLE users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT UNIQUE,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT,
        has_set_custom_password BOOLEAN DEFAULT false NOT NULL,
        liberal_login_count INTEGER DEFAULT 0 NOT NULL,
        needs_password_change BOOLEAN DEFAULT true,
        password_created_at TIMESTAMP,
        password_renewal_due TIMESTAMP,
        must_create_password BOOLEAN DEFAULT true NOT NULL,
        user_type TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT false,
        nickname TEXT,
        rank TEXT,
        maritime_rank TEXT,
        ship_name TEXT,
        current_ship_name TEXT,
        imo_number TEXT,
        current_ship_imo TEXT,
        port TEXT,
        visit_window TEXT,
        city TEXT,
        country TEXT,
        nationality TEXT,
        experience_level TEXT,
        last_company TEXT,
        last_ship TEXT,
        onboard_since TEXT,
        onboard_status TEXT,
        date_of_birth TEXT,
        gender TEXT,
        whatsapp_number TEXT,
        whatsapp_profile_picture_url TEXT,
        whatsapp_display_name TEXT,
        google_id TEXT,
        google_email TEXT,
        google_profile_picture_url TEXT,
        google_display_name TEXT,
        auth_provider TEXT DEFAULT 'qaaq',
        has_completed_onboarding BOOLEAN DEFAULT false,
        is_platform_admin BOOLEAN DEFAULT false,
        is_blocked BOOLEAN DEFAULT false,
        latitude REAL,
        longitude REAL,
        current_latitude REAL,
        current_longitude REAL,
        device_latitude REAL,
        device_longitude REAL,
        location_source TEXT DEFAULT 'city',
        location_updated_at TIMESTAMP,
        question_count INTEGER DEFAULT 0,
        answer_count INTEGER DEFAULT 0,
        last_chat_clear_at TIMESTAMP,
        is_verified BOOLEAN DEFAULT false,
        login_count INTEGER DEFAULT 0,
        last_login TIMESTAMP,
        last_updated TIMESTAMP DEFAULT now(),
        created_at TIMESTAMP DEFAULT now()
      );
      
      -- Create questions table
      CREATE TABLE questions (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        user_id TEXT,
        user_name TEXT,
        is_qa_mode BOOLEAN DEFAULT false,
        answered BOOLEAN DEFAULT false,
        tags TEXT[] DEFAULT '{}',
        accepted_answer_id INTEGER,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now(),
        image_urls TEXT[] DEFAULT '{}',
        is_open_to_all BOOLEAN DEFAULT true,
        file_size_mb REAL DEFAULT 0,
        is_archived BOOLEAN DEFAULT false,
        engagement_score INTEGER DEFAULT 0,
        category_id INTEGER,
        is_from_whatsapp BOOLEAN DEFAULT false,
        whatsapp_group_id TEXT,
        is_hidden BOOLEAN DEFAULT false,
        hidden_reason TEXT,
        hidden_at TIMESTAMP,
        hidden_by TEXT,
        flag_count INTEGER DEFAULT 0,
        visibility TEXT DEFAULT 'public',
        allow_comments BOOLEAN DEFAULT true,
        allow_answers BOOLEAN DEFAULT true,
        equipment_name TEXT
      );
      
      -- Create answers table
      CREATE TABLE answers (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        question_id INTEGER REFERENCES questions(id),
        user_id TEXT,
        user_name TEXT,
        is_accepted BOOLEAN DEFAULT false,
        vote_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now(),
        source_type TEXT DEFAULT 'user',
        ai_confidence REAL,
        is_from_whatsapp BOOLEAN DEFAULT false
      );
      
      -- Create question_attachments table
      CREATE TABLE question_attachments (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        question_id INTEGER,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        file_type TEXT,
        uploaded_at TIMESTAMP DEFAULT now(),
        uploaded_by TEXT,
        description TEXT,
        is_primary BOOLEAN DEFAULT false,
        source_type TEXT DEFAULT 'upload'
      );
      
      -- Create other supporting tables
      CREATE TABLE verification_codes (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        code TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT now()
      );
      
      CREATE TABLE posts (
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
      
      CREATE TABLE likes (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        post_id VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT now()
      );
      
      CREATE TABLE chat_connections (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id VARCHAR NOT NULL,
        receiver_id VARCHAR NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT now(),
        accepted_at TIMESTAMP
      );
      
      CREATE TABLE chat_messages (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id VARCHAR NOT NULL,
        receiver_id VARCHAR NOT NULL,
        content TEXT NOT NULL,
        sent_at TIMESTAMP DEFAULT now(),
        read_at TIMESTAMP,
        message_type TEXT DEFAULT 'text',
        file_url TEXT,
        file_name TEXT,
        file_size INTEGER
      );
      
      CREATE TABLE shared_qa (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        question_text TEXT NOT NULL,
        answer_text TEXT NOT NULL,
        context TEXT,
        created_at TIMESTAMP DEFAULT now(),
        is_public BOOLEAN DEFAULT true,
        tags TEXT[] DEFAULT '{}',
        category TEXT,
        source TEXT DEFAULT 'qbot'
      );
      
      CREATE TABLE bot_documentation (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        rule_category TEXT NOT NULL,
        rule_name TEXT NOT NULL,
        rule_content TEXT NOT NULL,
        rule_priority INTEGER DEFAULT 1,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      );
      
      CREATE TABLE email_verification_tokens (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        token VARCHAR NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT now(),
        used BOOLEAN DEFAULT false
      );
      
      CREATE TABLE ai_feedback (
        id SERIAL PRIMARY KEY,
        question_id INTEGER REFERENCES questions(id),
        answer_id INTEGER REFERENCES answers(id),
        feedback_type TEXT NOT NULL,
        admin_id VARCHAR NOT NULL,
        feedback_text TEXT,
        created_at TIMESTAMP DEFAULT now()
      );
      
      -- Create indexes for better performance
      CREATE INDEX idx_users_user_id ON users(user_id);
      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_questions_user_id ON questions(user_id);
      CREATE INDEX idx_questions_created_at ON questions(created_at);
      CREATE INDEX idx_answers_question_id ON answers(question_id);
      CREATE INDEX idx_answers_user_id ON answers(user_id);
      CREATE INDEX idx_question_attachments_question_id ON question_attachments(question_id);
      CREATE INDEX idx_chat_connections_sender_id ON chat_connections(sender_id);
      CREATE INDEX idx_chat_connections_receiver_id ON chat_connections(receiver_id);
      CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
      CREATE INDEX idx_chat_messages_receiver_id ON chat_messages(receiver_id);
    `);
    
    console.log('✅ Tables created successfully');
    
    // Migrate data from each table
    const tables = [
      'users',
      'questions', 
      'answers',
      'question_attachments',
      'verification_codes',
      'posts',
      'likes',
      'chat_connections',
      'chat_messages',
      'shared_qa',
      'bot_documentation',
      'email_verification_tokens',
      'ai_feedback'
    ];
    
    for (const tableName of tables) {
      try {
        console.log(`\n📊 Migrating ${tableName} table...`);
        
        // Get data from parent database
        const result = await parentPool.query(`SELECT * FROM ${tableName}`);
        const rows = result.rows;
        
        console.log(`Found ${rows.length} records in ${tableName}`);
        
        if (rows.length === 0) {
          console.log(`⚠️ No data found in ${tableName}, skipping...`);
          continue;
        }
        
        // Insert data into local database
        let inserted = 0;
        const batchSize = 100;
        
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          
          for (const row of batch) {
            try {
              const columns = Object.keys(row);
              const values = Object.values(row);
              const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
              
              const insertQuery = `
                INSERT INTO ${tableName} (${columns.join(', ')})
                VALUES (${placeholders})
                ON CONFLICT DO NOTHING
              `;
              
              await localPool.query(insertQuery, values);
              inserted++;
            } catch (rowError) {
              console.log(`⚠️ Failed to insert row in ${tableName}:`, rowError.message);
            }
          }
        }
        
        console.log(`✅ Migrated ${inserted}/${rows.length} records for ${tableName}`);
        
      } catch (tableError) {
        console.log(`❌ Failed to migrate ${tableName}:`, tableError.message);
      }
    }
    
    // Update sequences for auto-increment columns
    console.log('\n🔧 Updating sequences...');
    await localPool.query(`
      SELECT setval('questions_id_seq', (SELECT COALESCE(MAX(id), 1) FROM questions));
      SELECT setval('answers_id_seq', (SELECT COALESCE(MAX(id), 1) FROM answers));
      SELECT setval('ai_feedback_id_seq', (SELECT COALESCE(MAX(id), 1) FROM ai_feedback));
    `);
    
    console.log('✅ Sequences updated');
    
    // Get final counts
    console.log('\n📈 Migration Summary:');
    for (const tableName of tables) {
      try {
        const result = await localPool.query(`SELECT COUNT(*) FROM ${tableName}`);
        console.log(`${tableName}: ${result.rows[0].count} records`);
      } catch (error) {
        console.log(`${tableName}: Error getting count`);
      }
    }
    
    console.log('\n🎉 Database migration completed successfully!');
    console.log('🚀 Local database is now ready for use without hibernation delays');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    // Close connections
    await parentPool.end();
    await localPool.end();
  }
}

// Run migration
migrateDatabase()
  .then(() => {
    console.log('✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });