import { pool } from "./db";
import path from 'path';
import fs from 'fs/promises';
import { uuidManager } from './uuid-manager';

/**
 * Stable Image Management System for QaaqConnect
 * Handles all image uploads from web and WhatsApp with consistent processing
 */

export interface ImageUploadResult {
  id: string;
  questionId: number;
  attachmentUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export class ImageManagementService {
  private uploadsDir = path.join(process.cwd(), 'server', 'uploads');

  constructor() {
    this.ensureUploadsDirectory();
  }

  private async ensureUploadsDirectory() {
    try {
      await fs.access(this.uploadsDir);
    } catch {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Process and store image attachment for a question
   */
  async processImageAttachment(
    questionId: number,
    imageBuffer: Buffer,
    originalFileName: string,
    mimeType: string,
    source: 'web' | 'whatsapp' = 'web'
  ): Promise<ImageUploadResult> {
    try {
      // Generate unique filename with source prefix
      const timestamp = Date.now();
      const extension = path.extname(originalFileName) || '.jpg';
      const uniqueId = uuidManager.generateUUID();
      
      let fileName: string;
      if (source === 'whatsapp') {
        // WhatsApp format: whatsapp_[timestamp]_[uniqueId].ext
        fileName = `whatsapp_${timestamp}_${uniqueId}${extension}`;
      } else {
        // Web format: images-[timestamp]-[uniqueId].ext
        fileName = `images-${timestamp}-${uniqueId}${extension}`;
      }

      const filePath = path.join(this.uploadsDir, fileName);
      
      // Save file to uploads directory
      await fs.writeFile(filePath, imageBuffer);
      
      // Store attachment record in database
      const attachmentUrl = `/uploads/${fileName}`;
      const fileSize = imageBuffer.length;
      
      const result = await pool.query(`
        INSERT INTO question_attachments (
          id, question_id, attachment_type, attachment_url, 
          file_name, mime_type, file_size_bytes, 
          is_processed, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *
      `, [
        uniqueId,
        questionId,
        'image',
        attachmentUrl,
        fileName,
        mimeType,
        fileSize,
        true
      ]);

      console.log(`Processed ${source} image: ${fileName} for question ${questionId}`);

      return {
        id: uniqueId,
        questionId,
        attachmentUrl,
        fileName,
        mimeType,
        fileSize
      };

    } catch (error) {
      console.error('Error processing image attachment:', error);
      throw new Error('Failed to process image attachment');
    }
  }

  /**
   * Get all processed image attachments
   */
  async getProcessedImages(limit: number = 50): Promise<any[]> {
    try {
      const result = await pool.query(`
        SELECT 
          qa.id,
          qa.question_id,
          qa.attachment_url,
          qa.file_name,
          qa.mime_type,
          qa.file_size_bytes,
          qa.created_at,
          q.content as question_content,
          q.author_id
        FROM question_attachments qa
        LEFT JOIN questions q ON q.id = qa.question_id
        WHERE qa.attachment_type = 'image' 
          AND qa.is_processed = true
        ORDER BY qa.created_at DESC
        LIMIT $1
      `, [limit]);

      return result.rows.map(row => ({
        id: row.id,
        questionId: row.question_id,
        attachmentType: 'image',
        attachmentUrl: row.attachment_url,
        fileName: row.file_name,
        mimeType: row.mime_type,
        fileSize: row.file_size_bytes,
        createdAt: row.created_at,
        question: {
          id: row.question_id,
          content: row.question_content,
          authorId: row.author_id
        }
      }));
    } catch (error) {
      console.error('Error fetching processed images:', error);
      throw new Error('Failed to fetch processed images');
    }
  }

  /**
   * Validate image file
   */
  validateImageFile(buffer: Buffer, mimeType: string): { isValid: boolean; error?: string } {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml'
    ];

    if (!allowedTypes.includes(mimeType.toLowerCase())) {
      return {
        isValid: false,
        error: 'Invalid file type. Only JPEG, PNG, GIF, WebP, and SVG images are allowed.'
      };
    }

    const maxSize = 50 * 1024 * 1024; // 50MB limit
    if (buffer.length > maxSize) {
      return {
        isValid: false,
        error: 'File too large. Maximum size is 50MB.'
      };
    }

    return { isValid: true };
  }

  /**
   * Clean up old unused images (called periodically)
   */
  async cleanupUnusedImages(daysOld: number = 30): Promise<number> {
    try {
      const result = await pool.query(`
        DELETE FROM question_attachments 
        WHERE attachment_type = 'image' 
          AND created_at < NOW() - INTERVAL '${daysOld} days'
          AND question_id NOT IN (SELECT id FROM questions)
        RETURNING file_name
      `);

      // Remove physical files
      let cleanedCount = 0;
      for (const row of result.rows) {
        try {
          const filePath = path.join(this.uploadsDir, row.file_name);
          await fs.unlink(filePath);
          cleanedCount++;
        } catch (err) {
          console.warn(`Could not delete file ${row.file_name}:`, err);
        }
      }

      console.log(`Cleaned up ${cleanedCount} unused image attachments`);
      return cleanedCount;
    } catch (error) {
      console.error('Error during image cleanup:', error);
      throw new Error('Failed to cleanup unused images');
    }
  }
}

export const imageManagementService = new ImageManagementService();