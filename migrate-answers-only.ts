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

async function migrateAnswers() {
  console.log('🚀 Starting answers migration...');
  
  try {
    // Test parent connection
    const parentClient = await parentPool.connect();
    console.log('✅ Parent database connected');
    parentClient.release();
    
    // Get all answers from parent database
    console.log('📊 Fetching answers from parent database...');
    const answersResult = await parentPool.query('SELECT * FROM answers ORDER BY id');
    console.log(`Found ${answersResult.rows.length} answers in parent database`);
    
    if (answersResult.rows.length === 0) {
      console.log('⚠️ No answers found in parent database');
      return;
    }
    
    // Migrate answers in batches
    let successCount = 0;
    const batchSize = 50;
    
    for (let i = 0; i < answersResult.rows.length; i += batchSize) {
      const batch = answersResult.rows.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(answersResult.rows.length/batchSize)} (${batch.length} records)...`);
      
      for (const answer of batch) {
        try {
          // Insert answer with proper column mapping using raw SQL
          await localPool.query(`
            INSERT INTO answers (
              id, content, question_id, user_id, user_name, 
              is_accepted, vote_count, created_at, updated_at,
              source_type, ai_confidence, is_from_whatsapp
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
            ) ON CONFLICT (id) DO NOTHING
          `, [
            answer.id,
            answer.content,
            answer.question_id,
            answer.user_id,
            answer.user_name,
            answer.is_accepted || false,
            answer.vote_count || 0,
            answer.created_at,
            answer.updated_at,
            answer.source_type || 'user',
            answer.ai_confidence,
            answer.is_from_whatsapp || false
          ]);
          successCount++;
        } catch (error) {
          console.log(`⚠️ Failed to insert answer ${answer.id}:`, error.message);
        }
      }
      
      // Show progress
      console.log(`✅ Processed ${Math.min(i + batchSize, answersResult.rows.length)}/${answersResult.rows.length} answers`);
    }
    
    console.log(`\n🎉 Migration completed! Successfully migrated ${successCount}/${answersResult.rows.length} answers`);
    
    // Verify the migration
    const localCountResult = await localDb.execute({ sql: 'SELECT COUNT(*) as count FROM answers', args: [] });
    console.log(`✅ Local database now has ${localCountResult.rows[0].count} answers`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await parentPool.end();
  }
}

// Run migration
migrateAnswers()
  .then(() => {
    console.log('✅ Answers migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Answers migration failed:', error);
    process.exit(1);
  });