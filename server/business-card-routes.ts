import express from 'express';
import { BusinessCardOCR } from './business-card-ocr.js';

const router = express.Router();

// Initialize OCR service
const ocrService = new BusinessCardOCR();

/**
 * POST /api/business-card/scan
 * Process business card image from base64 data
 */
router.post('/scan', async (req: express.Request, res: express.Response) => {
  try {
    const { imageData, fileName } = req.body;

    if (!imageData) {
      return res.status(400).json({
        success: false,
        error: 'No image data provided'
      });
    }

    console.log(`📷 Processing business card image: ${fileName || 'unknown'}`);

    // Convert base64 to buffer
    let imageBuffer: Buffer;
    try {
      // Remove data URL prefix if present (data:image/jpeg;base64,)
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image data format'
      });
    }

    // Extract data from business card
    const result = await ocrService.extractTextFromCard(imageBuffer);

    if (result.success && result.data) {
      // Enhance with maritime context
      const enhancedData = ocrService.enhanceMaritimeContext(result.data);
      
      console.log(`✅ Business card processed successfully in ${result.processingTime}ms`);
      console.log(`📋 Extracted data: ${JSON.stringify(enhancedData, null, 2)}`);

      return res.json({
        success: true,
        data: enhancedData,
        processingTime: result.processingTime
      });
    } else {
      console.error(`❌ Business card processing failed: ${result.error}`);
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to process business card',
        processingTime: result.processingTime
      });
    }

  } catch (error) {
    console.error('❌ Business card scan error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

/**
 * POST /api/business-card/test
 * Test endpoint to verify OCR functionality
 */
router.post('/test', async (req: express.Request, res: express.Response) => {
  try {
    const { testData } = req.body;

    if (!testData) {
      return res.status(400).json({
        success: false,
        error: 'No test data provided'
      });
    }

    // Create a mock business card data response
    const mockData = {
      fullName: testData.fullName || 'John Smith',
      firstName: testData.firstName || 'John',
      lastName: testData.lastName || 'Smith',
      designation: testData.designation || 'Marine Engineer',
      company: testData.company || 'Maritime Solutions Ltd',
      email: testData.email || 'john.smith@maritime.com',
      phone: testData.phone || '+1234567890',
      confidence: 0.95,
      rawText: 'Mock business card data for testing'
    };

    console.log('🧪 Business card test endpoint called with mock data');

    return res.json({
      success: true,
      data: mockData,
      processingTime: 100
    });

  } catch (error) {
    console.error('❌ Business card test error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

export default router;