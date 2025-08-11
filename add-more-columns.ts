import { pool } from './server/db';

async function addMoreColumns() {
  try {
    console.log('🔧 Adding more missing columns to users table...');
    
    const moreColumns = [
      'user_type TEXT DEFAULT \'local\'',
      'is_admin BOOLEAN DEFAULT FALSE',
      'nickname TEXT',
      'rank TEXT',
      'maritime_rank TEXT',
      'ship_name TEXT',
      'current_ship_name TEXT',
      'imo_number TEXT',
      'current_ship_imo TEXT',
      'port TEXT',
      'visit_window TEXT',
      'city TEXT',
      'country TEXT',
      'nationality TEXT',
      'experience_level TEXT',
      'last_company TEXT',
      'last_ship TEXT',
      'onboard_since TEXT',
      'onboard_status TEXT',
      'date_of_birth TEXT',
      'gender TEXT',
      'whatsapp_number TEXT',
      'whatsapp_profile_picture_url TEXT',
      'whatsapp_display_name TEXT',
      'google_id TEXT',
      'google_email TEXT',
      'google_profile_picture_url TEXT',
      'google_display_name TEXT',
      'auth_provider TEXT DEFAULT \'qaaq\'',
      'has_completed_onboarding BOOLEAN DEFAULT FALSE',
      'is_platform_admin BOOLEAN DEFAULT FALSE',
      'is_blocked BOOLEAN DEFAULT FALSE',
      'latitude REAL',
      'longitude REAL',
      'current_latitude REAL',
      'current_longitude REAL',
      'device_latitude REAL',
      'device_longitude REAL',
      'location_source TEXT DEFAULT \'city\'',
      'location_updated_at TIMESTAMP',
      'question_count INTEGER DEFAULT 0',
      'answer_count INTEGER DEFAULT 0',
      'last_chat_clear_at TIMESTAMP',
      'last_updated TIMESTAMP',
      'created_at TIMESTAMP DEFAULT NOW()'
    ];
    
    for (const column of moreColumns) {
      try {
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${column};`);
        console.log(`✅ Added column: ${column.split(' ')[0]}`);
      } catch (error) {
        console.log(`⚠️ Column ${column.split(' ')[0]} might already exist:`, error.message);
      }
    }
    
    console.log('🎉 All columns added!');
    
  } catch (error) {
    console.error('❌ Error during column addition:', error);
  } finally {
    process.exit(0);
  }
}

addMoreColumns();