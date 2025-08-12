import { db } from './server/db';

async function mergeDuplicateUsers() {
  try {
    console.log('🔄 Starting safe merge of bhangar_users data into users table...');
    
    // Step 1: Update existing users with bhangar_users data where WhatsApp numbers match
    console.log('📝 Step 1: Updating existing users with bhangar data...');
    
    const updateResult = await db.execute(`
      UPDATE users 
      SET 
        full_name = COALESCE(NULLIF(users.full_name, ''), NULLIF(b.full_name, ''), users.full_name),
        maritime_rank = COALESCE(NULLIF(users.maritime_rank, ''), b.maritime_rank, users.maritime_rank),
        city = COALESCE(NULLIF(users.city, ''), NULLIF(b.current_city, ''), users.city),
        country = COALESCE(NULLIF(users.country, ''), NULLIF(b.current_country, ''), CASE 
          WHEN b.truecaller_location = 'India' THEN 'India'
          WHEN b.truecaller_location IS NOT NULL AND b.truecaller_location != '' THEN b.truecaller_location
          ELSE users.country
        END),
        nationality = COALESCE(NULLIF(users.nationality, ''), NULLIF(b.nationality, ''), users.nationality),
        question_count = COALESCE(b.question_count, users.question_count, 0),
        answer_count = COALESCE(b.answer_count, users.answer_count, 0),
        experience_level = COALESCE(b.experience_level, users.experience_level, 1)
      FROM bhangar_users b
      WHERE users.whats_app_number = b.whatsapp_number
        AND b.whatsapp_number IS NOT NULL
        AND b.whatsapp_number != ''
    `);
    
    console.log('✅ Updated existing users with bhangar data');
    
    // Step 2: Insert missing users from bhangar_users that don't exist in users table
    console.log('📝 Step 2: Inserting missing users from bhangar_users...');
    
    const insertResult = await db.execute(`
      INSERT INTO users (
        id, user_id, full_name, email, password, whats_app_number, 
        maritime_rank, city, country, nationality, 
        question_count, answer_count, experience_level,
        auth_provider, has_completed_onboarding, user_type,
        created_at
      )
      SELECT 
        b.whatsapp_number as id,
        b.whatsapp_number as user_id,
        COALESCE(NULLIF(b.full_name, ''), 'Maritime Professional') as full_name,
        b.email,
        COALESCE(b.password, '4321koihai') as password,
        b.whatsapp_number,
        b.maritime_rank,
        b.current_city as city,
        CASE 
          WHEN b.current_country IS NOT NULL AND b.current_country != '' THEN b.current_country
          WHEN b.truecaller_location = 'India' THEN 'India'
          WHEN b.truecaller_location IS NOT NULL AND b.truecaller_location != '' THEN b.truecaller_location
          ELSE NULL
        END as country,
        b.nationality,
        COALESCE(b.question_count, 0) as question_count,
        COALESCE(b.answer_count, 0) as answer_count,
        COALESCE(b.experience_level, 1) as experience_level,
        'qaaq' as auth_provider,
        true as has_completed_onboarding,
        'Free' as user_type,
        COALESCE(b.created_at, NOW()) as created_at
      FROM bhangar_users b
      WHERE b.whatsapp_number IS NOT NULL 
        AND b.whatsapp_number != ''
        AND b.whatsapp_number NOT IN (SELECT whats_app_number FROM users WHERE whats_app_number IS NOT NULL)
    `);
    
    console.log('✅ Inserted missing users from bhangar_users');
    
    // Step 3: Verify the merge results
    console.log('📊 Step 3: Verifying merge results...');
    
    const finalStats = await db.execute(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN city IS NOT NULL AND city != '' THEN 1 END) as users_with_city,
        COUNT(CASE WHEN country IS NOT NULL AND country != '' THEN 1 END) as users_with_country,
        COUNT(CASE WHEN maritime_rank IS NOT NULL THEN 1 END) as users_with_rank,
        COUNT(CASE WHEN question_count > 0 THEN 1 END) as users_with_questions
      FROM users
    `);
    
    console.log('📈 Final statistics:', finalStats.rows[0]);
    
    // Sample of users with location data after merge
    const sampleUsers = await db.execute(`
      SELECT full_name, city, country, maritime_rank, question_count, whats_app_number
      FROM users 
      WHERE (city IS NOT NULL AND city != '') OR (country IS NOT NULL AND country != '')
      ORDER BY question_count DESC
      LIMIT 15
    `);
    
    console.log('\n🌍 Sample users with location data:');
    sampleUsers.rows.forEach((user, i) => {
      console.log(`${i+1}. ${user.full_name} [${user.whats_app_number}]`);
      console.log(`   Location: ${user.city || 'No city'}, ${user.country || 'No country'}`);
      console.log(`   Rank: ${user.maritime_rank || 'No rank'} | Questions: ${user.question_count || 0}\n`);
    });
    
  } catch (error) {
    console.error('❌ Error during merge:', error);
  }
}

mergeDuplicateUsers().then(() => process.exit(0));