#!/usr/bin/env tsx

import { pool } from './db';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

async function downloadAllAuthenticImages() {
  console.log('⬇️ Downloading all authentic maritime images from URLs...');

  try {
    // Create uploads directories
    mkdirSync('./server/uploads', { recursive: true });
    mkdirSync('./uploads', { recursive: true });
    
    // Get all image records from database
    const result = await pool.query(`
      SELECT attachment_url, file_name, id
      FROM question_attachments 
      WHERE attachment_type = 'image'
      ORDER BY created_at DESC
    `);

    console.log(`📊 Found ${result.rows.length} image records to download`);

    let downloadedCount = 0;
    let failedCount = 0;
    const baseUrl = 'https://ae593ff5-1a4d-4129-8a7a-84788dd6900e-00-3cfncjt0ai8yg.worf.replit.dev';

    for (const row of result.rows) {
      const fileName = row.file_name;
      const imageUrl = `${baseUrl}${row.attachment_url}`;
      
      try {
        console.log(`📥 Downloading: ${fileName}`);
        console.log(`   URL: ${imageUrl}`);

        const response = await fetch(imageUrl);
        
        if (!response.ok) {
          console.log(`   ❌ Failed: ${response.status} ${response.statusText}`);
          failedCount++;
          continue;
        }

        // Get image data
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        console.log(`   📦 Downloaded ${Math.round(buffer.length/1024)}KB`);

        // Save to both locations for redundancy
        const serverPath = join('./server/uploads', fileName);
        const rootPath = join('./uploads', fileName);
        
        writeFileSync(serverPath, buffer);
        writeFileSync(rootPath, buffer);

        // Update database to reflect local storage
        await pool.query(`
          UPDATE question_attachments 
          SET file_size = $1
          WHERE id = $2
        `, [buffer.length, row.id]);

        console.log(`   ✅ Saved locally: ${fileName}`);
        downloadedCount++;

      } catch (error) {
        console.error(`   ❌ Error downloading ${fileName}:`, error.message);
        failedCount++;
      }
    }

    console.log('\n📈 Download Summary:');
    console.log(`✅ Successfully downloaded: ${downloadedCount} images`);
    console.log(`❌ Failed downloads: ${failedCount} images`);
    console.log(`📊 Total processed: ${downloadedCount + failedCount} of ${result.rows.length}`);

    if (downloadedCount > 0) {
      console.log('\n🎉 All authentic maritime images are now stored locally!');
      console.log('📁 Images saved to both ./uploads/ and ./server/uploads/ directories');
    }

  } catch (error) {
    console.error('❌ Error in download process:', error);
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  downloadAllAuthenticImages();
}

export { downloadAllAuthenticImages };