import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

// Parent database (Neon) connection
const parentDbUrl = 'postgresql://neondb_owner:npg_rTOn7VZkYAb3@ep-autumn-hat-a27gd1cd.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const parentPool = new Pool({ 
  connectionString: parentDbUrl,
  ssl: { rejectUnauthorized: false }
});

// Local database connection
const localPool = new Pool({ 
  connectionString: process.env.DATABASE_URL!
});

async function migrateRemainingQuestions() {
  console.log('🚀 Starting remaining questions migration...');
  
  try {
    // Test parent connection
    const parentClient = await parentPool.connect();
    console.log('✅ Parent database connected');
    parentClient.release();
    
    // Get current count in local database
    const localCountResult = await localPool.query('SELECT COUNT(*) as count FROM questions');
    const localCount = parseInt(localCountResult.rows[0].count);
    console.log(`📊 Local database currently has ${localCount} questions`);
    
    // Get all questions from parent database that we don't have yet
    console.log('📊 Fetching remaining questions from parent database...');
    const questionsResult = await parentPool.query(`
      SELECT * FROM questions 
      WHERE id NOT IN (
        SELECT unnest($1::int[])
      )
      ORDER BY id
    `, [[]]);  // We'll get all questions and filter locally
    
    // Get existing question IDs from local database
    const existingIdsResult = await localPool.query('SELECT id FROM questions ORDER BY id');
    const existingIds = existingIdsResult.rows.map(row => row.id);
    
    // Filter questions not in local database
    const questionsToMigrate = questionsResult.rows.filter(q => !existingIds.includes(q.id));
    
    console.log(`Found ${questionsToMigrate.length} questions to migrate (out of ${questionsResult.rows.length} total in parent)`);
    
    if (questionsToMigrate.length === 0) {
      console.log('✅ All questions already migrated');
      return;
    }
    
    // Migrate questions in batches
    let successCount = 0;
    const batchSize = 50;
    
    for (let i = 0; i < questionsToMigrate.length; i += batchSize) {
      const batch = questionsToMigrate.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(questionsToMigrate.length/batchSize)} (${batch.length} records)...`);
      
      for (const question of batch) {
        try {
          // Insert question with proper column mapping using raw SQL
          await localPool.query(`
            INSERT INTO questions (
              id, content, machine_id, author_id, tags, attachments, image_urls,
              views, is_resolved, accepted_answer_id, created_at, updated_at,
              file_size_mb, is_archived, engagement_score, category_id,
              is_from_whatsapp, whatsapp_group_id, is_hidden, hidden_reason,
              hidden_at, hidden_by, flag_count, visibility, allow_comments,
              allow_answers, equipment_name, is_open_to_all
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 
              $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
            ) ON CONFLICT (id) DO NOTHING
          `, [
            question.id,
            question.content,
            question.machine_id,
            question.author_id,
            question.tags || [],
            question.attachments || [],
            question.image_urls || [],
            question.views || 0,
            question.is_resolved || false,
            question.accepted_answer_id,
            question.created_at,
            question.updated_at,
            question.file_size_mb || 0,
            question.is_archived || false,
            question.engagement_score || 0,
            question.category_id,
            question.is_from_whatsapp || false,
            question.whatsapp_group_id,
            question.is_hidden || false,
            question.hidden_reason,
            question.hidden_at,
            question.hidden_by,
            question.flag_count || 0,
            question.visibility || 'public',
            question.allow_comments !== false,
            question.allow_answers !== false,
            question.equipment_name,
            question.is_open_to_all !== false
          ]);
          successCount++;
        } catch (error) {
          console.log(`⚠️ Failed to insert question ${question.id}:`, error.message);
        }
      }
      
      // Show progress
      console.log(`✅ Processed ${Math.min(i + batchSize, questionsToMigrate.length)}/${questionsToMigrate.length} questions`);
    }
    
    console.log(`\n🎉 Migration completed! Successfully migrated ${successCount}/${questionsToMigrate.length} new questions`);
    
    // Verify the migration
    const finalCountResult = await localPool.query('SELECT COUNT(*) as count FROM questions');
    console.log(`✅ Local database now has ${finalCountResult.rows[0].count} questions`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await parentPool.end();
    await localPool.end();
  }
}

// Run migration
migrateRemainingQuestions()
  .then(() => {
    console.log('✅ Questions migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Questions migration failed:', error);
    process.exit(1);
  });