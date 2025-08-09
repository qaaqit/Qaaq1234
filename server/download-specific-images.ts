#!/usr/bin/env tsx

import { pool } from './db';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

async function downloadSpecificAuthenticImages() {
  console.log('⬇️ Downloading specific authentic maritime images...');

  try {
    // Create storage directories
    mkdirSync('./server/uploads', { recursive: true });
    mkdirSync('./uploads', { recursive: true });
    
    // Clear existing records
    await pool.query('DELETE FROM question_attachments');
    
    // Specific authentic images provided by user
    const authenticImages = [
      'https://ae593ff5-1a4d-4129-8a7a-84788dd6900e-00-3cfncjt0ai8yg.worf.replit.dev/uploads/whatsapp_919035283755_1753904961563.jpg',
      'https://ae593ff5-1a4d-4129-8a7a-84788dd6900e-00-3cfncjt0ai8yg.worf.replit.dev/uploads/whatsapp_919561895989_1753744471007.jpg',
      'https://ae593ff5-1a4d-4129-8a7a-84788dd6900e-00-3cfncjt0ai8yg.worf.replit.dev/uploads/images-1752533933841-833942914.png',
      'https://ae593ff5-1a4d-4129-8a7a-84788dd6900e-00-3cfncjt0ai8yg.worf.replit.dev/uploads/images-1752533775305-910429651.png'
    ];

    let successCount = 0;
    let questionId = 6000;

    for (const imageUrl of authenticImages) {
      try {
        const fileName = imageUrl.split('/').pop() || 'unknown.jpg';
        console.log(`📥 Downloading: ${fileName}`);
        
        const response = await fetch(imageUrl);
        
        if (!response.ok) {
          console.log(`   ❌ Failed: ${response.status} ${response.statusText}`);
          continue;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Save to both locations
        const serverPath = join('./server/uploads', fileName);
        const rootPath = join('./uploads', fileName);
        
        writeFileSync(serverPath, buffer);
        writeFileSync(rootPath, buffer);

        // Determine MIME type
        const mimeType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';

        // Add to database
        const attachmentId = `specific_${Date.now()}_${successCount}`;
        await pool.query(`
          INSERT INTO question_attachments (
            id, question_id, attachment_type, attachment_url, 
            file_name, mime_type, file_size, is_processed, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        `, [
          attachmentId,
          questionId++,
          'image',
          `/uploads/${fileName}`,
          fileName,
          mimeType,
          buffer.length,
          true
        ]);

        console.log(`   ✅ Saved: ${fileName} (${Math.round(buffer.length/1024)}KB)`);
        successCount++;

      } catch (error) {
        console.error(`   ❌ Error downloading image:`, error.message);
      }
    }

    console.log(`\n🎉 Successfully downloaded ${successCount} authentic maritime images!`);

  } catch (error) {
    console.error('❌ Error in download process:', error);
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  downloadSpecificAuthenticImages();
}

export { downloadSpecificAuthenticImages };