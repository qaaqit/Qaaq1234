import { Express, Request, Response } from 'express';
import { imageManagementService } from './image-management-service';

/**
 * Stable Image Upload System for QaaqConnect
 * Handles image uploads from both web interface and WhatsApp bot
 */

export interface ImageUploadRequest {
  questionId: number;
  imageBuffer: Buffer;
  originalFileName: string;
  mimeType: string;
  source: 'web' | 'whatsapp';
}

export class StableImageUploadService {
  
  /**
   * Process image upload from web interface
   */
  async processWebImageUpload(req: Request, res: Response): Promise<void> {
    try {
      const questionId = parseInt(req.params.questionId);
      if (isNaN(questionId)) {
        res.status(400).json({ error: 'Invalid question ID' });
        return;
      }

      // For now, we'll implement a basic upload handler
      // This will be enhanced when proper file upload middleware is available
      const uploadData = req.body as ImageUploadRequest;
      
      if (!uploadData.imageBuffer || !uploadData.originalFileName) {
        res.status(400).json({ error: 'Missing image data' });
        return;
      }

      const result = await imageManagementService.processImageAttachment(
        questionId,
        Buffer.from(uploadData.imageBuffer),
        uploadData.originalFileName,
        uploadData.mimeType || 'image/jpeg',
        'web'
      );

      console.log(`Successfully processed web image upload for question ${questionId}`);
      res.json({
        success: true,
        message: 'Image uploaded successfully',
        upload: result
      });

    } catch (error) {
      console.error('Error in web image upload:', error);
      res.status(500).json({ 
        error: 'Failed to upload image',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Process image upload from WhatsApp bot
   */
  async processWhatsAppImageUpload(uploadData: ImageUploadRequest): Promise<any> {
    try {
      const validation = imageManagementService.validateImageFile(
        uploadData.imageBuffer, 
        uploadData.mimeType
      );
      
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      const result = await imageManagementService.processImageAttachment(
        uploadData.questionId,
        uploadData.imageBuffer,
        uploadData.originalFileName,
        uploadData.mimeType,
        'whatsapp'
      );

      console.log(`Successfully processed WhatsApp image upload for question ${uploadData.questionId}`);
      return {
        success: true,
        message: 'WhatsApp image uploaded successfully',
        upload: result
      };

    } catch (error) {
      console.error('Error in WhatsApp image upload:', error);
      throw new Error(`Failed to process WhatsApp image upload: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get upload status and manage carousel display
   */
  async getUploadStatus(questionId: number): Promise<any> {
    try {
      const images = await imageManagementService.getProcessedImages(50);
      const questionImages = images.filter(img => img.questionId === questionId);
      
      return {
        questionId,
        imageCount: questionImages.length,
        images: questionImages,
        carouselReady: questionImages.length > 0
      };
    } catch (error) {
      console.error('Error getting upload status:', error);
      throw new Error('Failed to get upload status');
    }
  }
}

export const stableImageUploadService = new StableImageUploadService();

/**
 * Setup image upload routes
 */
export function setupStableImageRoutes(app: Express): void {
  
  // Web image upload endpoint (basic implementation)
  app.post('/api/questions/:questionId/upload-image', async (req, res) => {
    await stableImageUploadService.processWebImageUpload(req, res);
  });

  // Get upload status for question
  app.get('/api/questions/:questionId/upload-status', async (req, res) => {
    try {
      const questionId = parseInt(req.params.questionId);
      if (isNaN(questionId)) {
        return res.status(400).json({ error: 'Invalid question ID' });
      }

      const status = await stableImageUploadService.getUploadStatus(questionId);
      res.json(status);
    } catch (error) {
      console.error('Error getting upload status:', error);
      res.status(500).json({ error: 'Failed to get upload status' });
    }
  });

  console.log('Stable image upload routes configured successfully');
}