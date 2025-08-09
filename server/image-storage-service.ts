#!/usr/bin/env tsx

import { pool } from './db';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { nanoid } from 'nanoid';

export class ImageStorageService {
  private readonly SERVER_UPLOADS_DIR = './server/uploads';
  private readonly BACKUP_UPLOADS_DIR = './uploads';

  constructor() {
    // Ensure directories exist
    mkdirSync(this.SERVER_UPLOADS_DIR, { recursive: true });
    mkdirSync(this.BACKUP_UPLOADS_DIR, { recursive: true });
  }

  /**
   * Store a new image from buffer data
   * @param buffer Image buffer data
   * @param originalName Original filename
   * @param mimeType MIME type (image/jpeg, image/png, etc.)
   * @param questionId Associated question ID
   * @returns Promise<string> Returns the attachment ID
   */
  async storeImage(buffer: Buffer, originalName: string, mimeType: string, questionId: number): Promise<string> {
    const fileExtension = this.getFileExtension(mimeType, originalName);
    const fileName = `qaaq_${Date.now()}_${nanoid(8)}.${fileExtension}`;
    const attachmentId = `img_${Date.now()}_${nanoid(12)}`;

    // Save to both locations for redundancy
    const serverPath = join(this.SERVER_UPLOADS_DIR, fileName);
    const backupPath = join(this.BACKUP_UPLOADS_DIR, fileName);
    
    writeFileSync(serverPath, buffer);
    writeFileSync(backupPath, buffer);

    // Store metadata in database
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
      buffer.length,
      true
    ]);

    return attachmentId;
  }

  /**
   * Store a WhatsApp image with proper naming convention
   */
  async storeWhatsAppImage(buffer: Buffer, phoneNumber: string, mimeType: string, questionId: number): Promise<string> {
    const fileExtension = this.getFileExtension(mimeType);
    const timestamp = Date.now();
    const fileName = `whatsapp_${phoneNumber}_${timestamp}.${fileExtension}`;
    const attachmentId = `whatsapp_${timestamp}_${nanoid(8)}`;

    const serverPath = join(this.SERVER_UPLOADS_DIR, fileName);
    const backupPath = join(this.BACKUP_UPLOADS_DIR, fileName);
    
    writeFileSync(serverPath, buffer);
    writeFileSync(backupPath, buffer);

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
      buffer.length,
      true
    ]);

    return attachmentId;
  }

  /**
   * Download and store an image from URL
   */
  async storeImageFromUrl(imageUrl: string, questionId: number): Promise<string> {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const fileName = imageUrl.split('/').pop() || 'unknown';
    
    return this.storeImage(buffer, fileName, contentType, questionId);
  }

  /**
   * Check if an image exists locally
   */
  imageExists(fileName: string): boolean {
    const serverPath = join(this.SERVER_UPLOADS_DIR, fileName);
    return existsSync(serverPath);
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalImages: number;
    totalSize: number;
    whatsappImages: number;
    qaaqImages: number;
  }> {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_images,
        SUM(file_size) as total_size,
        COUNT(CASE WHEN file_name LIKE 'whatsapp_%' THEN 1 END) as whatsapp_images,
        COUNT(CASE WHEN file_name LIKE 'qaaq_%' THEN 1 END) as qaaq_images
      FROM question_attachments 
      WHERE attachment_type = 'image'
    `);

    return {
      totalImages: parseInt(result.rows[0].total_images),
      totalSize: parseInt(result.rows[0].total_size || 0),
      whatsappImages: parseInt(result.rows[0].whatsapp_images),
      qaaqImages: parseInt(result.rows[0].qaaq_images)
    };
  }

  private getFileExtension(mimeType: string, originalName?: string): string {
    if (originalName && originalName.includes('.')) {
      return originalName.split('.').pop()!.toLowerCase();
    }
    
    switch (mimeType) {
      case 'image/jpeg':
      case 'image/jpg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/gif':
        return 'gif';
      case 'image/webp':
        return 'webp';
      default:
        return 'jpg';
    }
  }
}

export const imageStorage = new ImageStorageService();