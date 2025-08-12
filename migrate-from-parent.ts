import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import { db as localDb } from "./server/db";
import * as schema from "./shared/schema";

neonConfig.webSocketConstructor = ws;

// Parent database (Neon) connection
const parentDbUrl = 'postgresql://neondb_owner:npg_rTOn7VZkYAb3@ep-autumn-hat-a27gd1cd.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const parentPool = new Pool({ 
  connectionString: parentDbUrl,
  ssl: { rejectUnauthorized: false }
});
const parentDb = drizzle({ client: parentPool, schema });

async function migrateParentData() {
  console.log('🚀 Starting migration from parent database to local PostgreSQL...');
  
  try {
    // Test parent connection
    console.log('Testing parent database connection...');
    const parentClient = await parentPool.connect();
    console.log('✅ Parent database connected successfully');
    parentClient.release();
    
    // Migrate users table
    console.log('\n📊 Migrating users...');
    const parentUsers = await parentDb.select().from(schema.users);
    console.log(`Found ${parentUsers.length} users in parent database`);
    
    let userCount = 0;
    for (const user of parentUsers) {
      try {
        // Clean and validate user data before insertion
        const cleanUser = {
          ...user,
          fullName: user.fullName || user.whatsAppDisplayName || user.googleDisplayName || 'Maritime Professional',
          email: user.email || `${user.id}@qaaq.temp`,
          userType: user.userType || 'sailor'
        };
        
        await localDb.insert(schema.users).values(cleanUser).onConflictDoNothing();
        userCount++;
      } catch (error) {
        console.log(`⚠️ Failed to insert user ${user.id}:`, error.message);
      }
    }
    console.log(`✅ Migrated ${userCount}/${parentUsers.length} users`);
    
    // Migrate questions table  
    console.log('\n📊 Migrating questions...');
    try {
      const parentQuestions = await parentPool.query('SELECT * FROM questions ORDER BY id');
      console.log(`Found ${parentQuestions.rows.length} questions in parent database`);
      
      let questionCount = 0;
      for (const question of parentQuestions.rows) {
        try {
          await localDb.insert(schema.questions).values({
            id: question.id,
            content: question.content,
            machineId: question.machine_id,
            authorId: question.author_id || question.user_id || 'unknown',
            tags: question.tags || [],
            attachments: question.attachments || [],
            imageUrls: question.image_urls || [],
            views: question.views || 0,
            isResolved: question.is_resolved || false,
            acceptedAnswerId: question.accepted_answer_id,
            createdAt: question.created_at,
            updatedAt: question.updated_at,
            fileSizeMb: question.file_size_mb || 0,
            isArchived: question.is_archived || false,
            engagementScore: question.engagement_score || 0,
            categoryId: question.category_id,
            isFromWhatsapp: question.is_from_whatsapp || false,
            whatsappGroupId: question.whatsapp_group_id,
            isHidden: question.is_hidden || false,
            hiddenReason: question.hidden_reason,
            hiddenAt: question.hidden_at,
            hiddenBy: question.hidden_by,
            flagCount: question.flag_count || 0,
            visibility: question.visibility || 'public',
            allowComments: question.allow_comments !== false,
            allowAnswers: question.allow_answers !== false,
            equipmentName: question.equipment_name,
            isOpenToAll: question.is_open_to_all !== false
          }).onConflictDoNothing();
          questionCount++;
        } catch (error) {
          console.log(`⚠️ Failed to insert question ${question.id}:`, error.message);
        }
      }
      console.log(`✅ Migrated ${questionCount}/${parentQuestions.rows.length} questions`);
    } catch (error) {
      console.log(`❌ Failed to migrate questions:`, error.message);
    }
    
    // Migrate answers table
    console.log('\n📊 Migrating answers...');
    try {
      const parentAnswers = await parentPool.query('SELECT * FROM answers ORDER BY id');
      console.log(`Found ${parentAnswers.rows.length} answers in parent database`);
      
      let answerCount = 0;
      for (const answer of parentAnswers.rows) {
        try {
          await localDb.insert(schema.answers).values({
            id: answer.id,
            content: answer.content,
            questionId: answer.question_id,
            userId: answer.user_id,
            userName: answer.user_name,
            isAccepted: answer.is_accepted || false,
            voteCount: answer.vote_count || 0,
            createdAt: answer.created_at,
            updatedAt: answer.updated_at,
            sourceType: answer.source_type || 'user',
            aiConfidence: answer.ai_confidence,
            isFromWhatsapp: answer.is_from_whatsapp || false
          }).onConflictDoNothing();
          answerCount++;
        } catch (error) {
          console.log(`⚠️ Failed to insert answer ${answer.id}:`, error.message);
        }
      }
      console.log(`✅ Migrated ${answerCount}/${parentAnswers.rows.length} answers`);
    } catch (error) {
      console.log(`❌ Failed to migrate answers:`, error.message);
    }
    
    // Migrate question_attachments table
    console.log('\n📊 Migrating question attachments...');
    try {
      const parentAttachments = await parentPool.query('SELECT * FROM question_attachments ORDER BY uploaded_at');
      console.log(`Found ${parentAttachments.rows.length} question attachments in parent database`);
      
      let attachmentCount = 0;
      for (const attachment of parentAttachments.rows) {
        try {
          await localDb.insert(schema.questionAttachments).values({
            id: attachment.id,
            questionId: attachment.question_id,
            fileName: attachment.file_name,
            filePath: attachment.file_path,
            fileSize: attachment.file_size,
            fileType: attachment.file_type,
            uploadedAt: attachment.uploaded_at,
            uploadedBy: attachment.uploaded_by,
            description: attachment.description,
            isPrimary: attachment.is_primary || false,
            sourceType: attachment.source_type || 'upload'
          }).onConflictDoNothing();
          attachmentCount++;
        } catch (error) {
          console.log(`⚠️ Failed to insert attachment ${attachment.id}:`, error.message);
        }
      }
      console.log(`✅ Migrated ${attachmentCount}/${parentAttachments.rows.length} question attachments`);
    } catch (error) {
      console.log(`❌ Failed to migrate question attachments:`, error.message);
    }
    
    // Migrate chat connections
    console.log('\n📊 Migrating chat connections...');
    try {
      const parentConnections = await parentDb.select().from(schema.chatConnections);
      console.log(`Found ${parentConnections.length} chat connections in parent database`);
      
      let connectionCount = 0;
      for (const connection of parentConnections) {
        try {
          await localDb.insert(schema.chatConnections).values(connection).onConflictDoNothing();
          connectionCount++;
        } catch (error) {
          console.log(`⚠️ Failed to insert connection ${connection.id}:`, error.message);
        }
      }
      console.log(`✅ Migrated ${connectionCount}/${parentConnections.length} chat connections`);
    } catch (error) {
      console.log(`❌ Failed to migrate chat connections:`, error.message);
    }
    
    // Migrate chat messages
    console.log('\n📊 Migrating chat messages...');
    try {
      const parentMessages = await parentDb.select().from(schema.chatMessages);
      console.log(`Found ${parentMessages.length} chat messages in parent database`);
      
      let messageCount = 0;
      for (const message of parentMessages) {
        try {
          await localDb.insert(schema.chatMessages).values(message).onConflictDoNothing();
          messageCount++;
        } catch (error) {
          console.log(`⚠️ Failed to insert message ${message.id}:`, error.message);
        }
      }
      console.log(`✅ Migrated ${messageCount}/${parentMessages.length} chat messages`);
    } catch (error) {
      console.log(`❌ Failed to migrate chat messages:`, error.message);
    }
    
    // Migrate shared_qa table
    console.log('\n📊 Migrating shared Q&A...');
    try {
      const parentSharedQA = await parentDb.select().from(schema.sharedQa);
      console.log(`Found ${parentSharedQA.length} shared Q&A records in parent database`);
      
      let sharedQACount = 0;
      for (const qa of parentSharedQA) {
        try {
          await localDb.insert(schema.sharedQa).values(qa).onConflictDoNothing();
          sharedQACount++;
        } catch (error) {
          console.log(`⚠️ Failed to insert shared Q&A ${qa.id}:`, error.message);
        }
      }
      console.log(`✅ Migrated ${sharedQACount}/${parentSharedQA.length} shared Q&A records`);
    } catch (error) {
      console.log(`❌ Failed to migrate shared Q&A:`, error.message);
    }
    
    // Migrate other tables that exist
    const otherTables = [
      { schema: schema.verificationCodes, name: 'verification_codes' },
      { schema: schema.posts, name: 'posts' },
      { schema: schema.likes, name: 'likes' },
      { schema: schema.botDocumentation, name: 'bot_documentation' },
      { schema: schema.emailVerificationTokens, name: 'email_verification_tokens' }
    ];
    
    for (const table of otherTables) {
      try {
        console.log(`\n📊 Migrating ${table.name}...`);
        const parentData = await parentDb.select().from(table.schema);
        console.log(`Found ${parentData.length} records in ${table.name}`);
        
        let count = 0;
        for (const record of parentData) {
          try {
            await localDb.insert(table.schema).values(record).onConflictDoNothing();
            count++;
          } catch (error) {
            console.log(`⚠️ Failed to insert ${table.name} record:`, error.message);
          }
        }
        console.log(`✅ Migrated ${count}/${parentData.length} ${table.name} records`);
      } catch (error) {
        console.log(`❌ Failed to migrate ${table.name}:`, error.message);
      }
    }
    
    // Get final counts from local database
    console.log('\n📈 Local Database Summary:');
    try {
      const localUsers = await localDb.select().from(schema.users);
      console.log(`Users: ${localUsers.length} records`);
      
      const localQuestions = await localDb.select().from(schema.questions);
      console.log(`Questions: ${localQuestions.length} records`);
      
      const localAnswers = await localDb.select().from(schema.answers);
      console.log(`Answers: ${localAnswers.length} records`);
      
      const localAttachments = await localDb.select().from(schema.questionAttachments);
      console.log(`Question Attachments: ${localAttachments.length} records`);
      
      const localConnections = await localDb.select().from(schema.chatConnections);
      console.log(`Chat Connections: ${localConnections.length} records`);
      
      const localMessages = await localDb.select().from(schema.chatMessages);
      console.log(`Chat Messages: ${localMessages.length} records`);
      
      const localSharedQA = await localDb.select().from(schema.sharedQa);
      console.log(`Shared Q&A: ${localSharedQA.length} records`);
      
    } catch (error) {
      console.log('❌ Failed to get local database summary:', error.message);
    }
    
    console.log('\n🎉 Database migration completed successfully!');
    console.log('🚀 Local database is now ready for fast loading without hibernation delays');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    // Close parent connection
    await parentPool.end();
  }
}

// Run migration
migrateParentData()
  .then(() => {
    console.log('✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });