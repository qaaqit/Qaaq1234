import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

async function checkTables() {
  // Parent database
  const parentUrl = process.env.PARENT_DATABASE_URL || 
    'postgresql://neondb_owner:npg_rTOn7VZkYAb3@ep-autumn-hat-a27gd1cd.eu-central-1.aws.neon.tech/neondb?sslmode=require';
  
  // Local database
  const localUrl = process.env.DATABASE_URL;
  
  console.log('🔍 Checking tables in both databases...\n');
  
  // Check parent database tables
  const parentPool = new Pool({ 
    connectionString: parentUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const parentClient = await parentPool.connect();
    const parentResult = await parentClient.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    parentClient.release();
    
    console.log('📦 Parent Database Tables (ep-autumn-hat):');
    if (parentResult.rows.length > 0) {
      parentResult.rows.forEach(row => console.log(`  - ${row.tablename}`));
    } else {
      console.log('  No tables found');
    }
    
    // Count records in parent database
    const countResult = await parentClient.query(`
      SELECT 'users' as table_name, COUNT(*) as count FROM users
      UNION ALL
      SELECT 'questions' as table_name, COUNT(*) as count FROM questions
      UNION ALL  
      SELECT 'user_answers' as table_name, COUNT(*) as count FROM user_answers
    `).catch(() => ({ rows: [] }));
    
    if (countResult.rows.length > 0) {
      console.log('\n  Record counts:');
      countResult.rows.forEach(row => console.log(`    ${row.table_name}: ${row.count} records`));
    }
    
  } catch (error) {
    console.error('❌ Error checking parent database:', error instanceof Error ? error.message : 'Unknown error');
  } finally {
    await parentPool.end();
  }
  
  console.log('\n');
  
  // Check local database tables
  const localPool = new Pool({ 
    connectionString: localUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const localClient = await localPool.connect();
    
    // First, let's create the tables if they don't exist
    console.log('💾 Local Database (ep-tiny-bar):\n');
    console.log('📋 Creating tables in local database if they don\'t exist...');
    
    // Create users table
    await localClient.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT UNIQUE,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE,
        password TEXT,
        has_set_custom_password BOOLEAN DEFAULT false NOT NULL,
        needs_password_change BOOLEAN DEFAULT true,
        password_created_at TIMESTAMP,
        password_renewal_due TIMESTAMP,
        must_create_password BOOLEAN DEFAULT true NOT NULL,
        user_type TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT false,
        nickname TEXT,
        primary_auth_provider TEXT NOT NULL DEFAULT 'qaaq',
        auth_providers JSONB DEFAULT '[]',
        rank TEXT,
        maritime_rank TEXT,
        ship_name TEXT,
        current_ship_name TEXT,
        current_lastShip TEXT,
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
        country_code TEXT,
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
        is_premium BOOLEAN DEFAULT false,
        premium_expires_at TIMESTAMP,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        subscription_status TEXT DEFAULT 'inactive',
        premium_activated_at TIMESTAMP,
        welcome_email_sent BOOLEAN DEFAULT false,
        replit_id TEXT,
        replit_email TEXT,
        replit_display_name TEXT,
        replit_profile_picture_url TEXT,
        linkedin_id TEXT,
        linkedin_email TEXT,
        linkedin_display_name TEXT,
        linkedin_profile_picture_url TEXT,
        apple_id TEXT,
        apple_email TEXT,
        apple_display_name TEXT,
        ai_token_count INTEGER DEFAULT 0,
        ai_token_limit INTEGER DEFAULT 10,
        last_ai_token_reset TIMESTAMP,
        login_count INTEGER DEFAULT 0,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('  ✅ Users table ready');
    
    // Create questions table
    await localClient.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id VARCHAR PRIMARY KEY,
        question_text TEXT NOT NULL,
        user_id VARCHAR,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('  ✅ Questions table ready');
    
    // Create user_answers table
    await localClient.query(`
      CREATE TABLE IF NOT EXISTS user_answers (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        question_id VARCHAR NOT NULL,
        answer_text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('  ✅ User_answers table ready');
    
    // Now check what tables exist
    const localResult = await localClient.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    console.log('\n📊 Tables in local database:');
    if (localResult.rows.length > 0) {
      localResult.rows.forEach(row => console.log(`  - ${row.tablename}`));
    } else {
      console.log('  No tables found');
    }
    
    localClient.release();
  } catch (error) {
    console.error('❌ Error with local database:', error instanceof Error ? error.message : 'Unknown error');
  } finally {
    await localPool.end();
  }
  
  process.exit(0);
}

checkTables();