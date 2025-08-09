#!/usr/bin/env tsx

import { pool } from './db';

interface QuestionAttachment {
  id: string;
  questionId: number;
  attachmentUrl: string;
  fileName: string;
  mimeType: string;
}

async function downloadAndStoreImages() {
  console.log('🖼️ Starting to download and store 18 authentic maritime question images...');

  try {
    // Get all question attachments that need image data
    const result = await pool.query(`
      SELECT id, question_id, attachment_url, file_name, mime_type
      FROM question_attachments
      WHERE attachment_type = 'image' 
        AND is_processed = true
        AND attachment_data IS NULL
      ORDER BY created_at DESC
      LIMIT 18
    `);

    const attachments: QuestionAttachment[] = result.rows.map(row => ({
      id: row.id,
      questionId: row.question_id,
      attachmentUrl: row.attachment_url,
      fileName: row.file_name,
      mimeType: row.mime_type
    }));

    console.log(`📊 Found ${attachments.length} attachments to process`);

    let successCount = 0;
    let failCount = 0;

    for (const attachment of attachments) {
      try {
        console.log(`⬇️ Downloading ${attachment.fileName}...`);
        
        // Construct Google Cloud Storage URL
        const cloudUrl = attachment.attachmentUrl.startsWith('/uploads/') 
          ? `https://storage.googleapis.com/repl-objstore-b2ad59ef-ca8b-42b8-bc12-f53a0b9ec0ee/.private${attachment.attachmentUrl}`
          : attachment.attachmentUrl;

        console.log(`   URL: ${cloudUrl}`);

        // Try to download the image
        const response = await fetch(cloudUrl);
        
        if (!response.ok) {
          console.log(`   ❌ Failed to download: ${response.status} ${response.statusText}`);
          failCount++;
          continue;
        }

        // Convert to base64
        const buffer = await response.buffer();
        const base64Data = buffer.toString('base64');
        
        console.log(`   📦 Downloaded ${buffer.length} bytes, converted to base64`);

        // Store in database
        await pool.query(`
          UPDATE question_attachments 
          SET attachment_data = $1
          WHERE id = $2
        `, [base64Data, attachment.id]);

        console.log(`   ✅ Stored in database for question ${attachment.questionId}`);
        successCount++;

      } catch (error) {
        console.error(`   ❌ Error processing ${attachment.fileName}:`, error.message);
        failCount++;
      }
    }

    console.log('\n📈 Download Summary:');
    console.log(`✅ Successfully downloaded and stored: ${successCount} images`);
    console.log(`❌ Failed to process: ${failCount} images`);
    console.log(`📊 Total processed: ${successCount + failCount} of ${attachments.length}`);

    if (successCount > 0) {
      console.log('\n🎉 Authentic maritime question images are now stored in the database!');
    }

  } catch (error) {
    console.error('❌ Error in download process:', error);
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  downloadAndStoreImages();
}

export { downloadAndStoreImages };