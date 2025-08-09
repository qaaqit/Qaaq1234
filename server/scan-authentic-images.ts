#!/usr/bin/env tsx

import { pool } from './db';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

async function scanAndStoreAuthenticImages() {
  console.log('🔍 Scanning for authentic maritime images in uploads directory...');

  try {
    // Clear synthetic images
    await pool.query('DELETE FROM question_attachments');
    console.log('🗑️ Cleared synthetic images');

    // Scan uploads directory for authentic images
    const uploadsDir = './uploads';
    const files = readdirSync(uploadsDir);
    
    const imageFiles = files.filter(file => 
      file.toLowerCase().match(/\.(jpg|jpeg|png|gif|svg)$/)
    );

    console.log(`📁 Found ${imageFiles.length} image files in uploads directory`);

    let insertedCount = 0;

    for (let i = 0; i < imageFiles.length && i < 18; i++) {
      const fileName = imageFiles[i];
      const filePath = join(uploadsDir, fileName);
      const stats = statSync(filePath);
      
      const attachmentId = `authentic_${Date.now()}_${i}`;
      const questionId = 2000 + i; // Different range for authentic images
      
      // Determine MIME type
      let mimeType = 'image/jpeg';
      if (fileName.toLowerCase().endsWith('.png')) mimeType = 'image/png';
      else if (fileName.toLowerCase().endsWith('.gif')) mimeType = 'image/gif';
      else if (fileName.toLowerCase().endsWith('.svg')) mimeType = 'image/svg+xml';

      await pool.query(`
        INSERT INTO question_attachments (
          id, question_id, attachment_type, attachment_url, 
          file_name, mime_type, file_size, is_processed, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `, [
        attachmentId,
        questionId,
        'image',
        `/uploads/${fileName}`,
        fileName,
        mimeType,
        stats.size,
        true
      ]);

      console.log(`✅ Added authentic image: ${fileName} (${Math.round(stats.size/1024)}KB)`);
      insertedCount++;
    }

    console.log(`\n🎉 Successfully registered ${insertedCount} authentic maritime images!`);
    console.log('📊 These are the real images from your uploads directory');

  } catch (error) {
    console.error('❌ Error scanning authentic images:', error);
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  scanAndStoreAuthenticImages();
}

export { scanAndStoreAuthenticImages };