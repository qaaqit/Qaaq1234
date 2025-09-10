import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface BusinessCardData {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  designation?: string;
  company?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  address?: string;
  confidence: number;
  rawText: string;
}

export interface OCRResult {
  success: boolean;
  data?: BusinessCardData;
  error?: string;
  processingTime: number;
}

export class BusinessCardOCR {
  private static readonly MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly SUPPORTED_FORMATS = ['jpeg', 'jpg', 'png', 'webp'];
  
  /**
   * Preprocess and validate business card image
   */
  async preprocessImage(imageBuffer: Buffer): Promise<{ processedBuffer: Buffer; format: string }> {
    try {
      // Check file size
      if (imageBuffer.length > BusinessCardOCR.MAX_IMAGE_SIZE) {
        throw new Error('Image size too large. Maximum size is 5MB');
      }

      // Basic validation - check if it's a valid image by checking headers
      const isPNG = imageBuffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));
      const isJPEG = imageBuffer.slice(0, 3).equals(Buffer.from([0xFF, 0xD8, 0xFF]));
      const isWebP = imageBuffer.slice(0, 4).toString() === 'RIFF' && imageBuffer.slice(8, 12).toString() === 'WEBP';

      if (!isPNG && !isJPEG && !isWebP) {
        throw new Error('Unsupported image format. Please upload a JPEG, PNG, or WebP image');
      }

      // For now, return the original buffer (we can add image processing later)
      return {
        processedBuffer: imageBuffer,
        format: isJPEG ? 'jpeg' : isPNG ? 'png' : 'webp'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Image preprocessing failed: ${errorMessage}`);
    }
  }

  /**
   * Extract text from business card using OpenAI Vision API
   */
  async extractTextFromCard(imageBuffer: Buffer): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      // Preprocess image
      const { processedBuffer, format } = await this.preprocessImage(imageBuffer);
      
      // Convert to base64
      const base64Image = processedBuffer.toString('base64');
      const dataUrl = `data:image/${format};base64,${base64Image}`;

      // Use OpenAI Vision API for OCR
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Using the latest vision model
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are an OCR expert specialized in extracting information from business cards. 
                
Analyze this business card image and extract ALL text content. Then parse the information into structured data.

Please respond in JSON format with the following structure:
{
  "rawText": "All extracted text from the card",
  "fullName": "Complete name",
  "firstName": "First name only", 
  "lastName": "Last name only",
  "designation": "Job title/position",
  "company": "Company/organization name",
  "email": "Email address",
  "phone": "Phone number",
  "whatsapp": "WhatsApp number (if different from phone)",
  "website": "Website URL",
  "address": "Complete address",
  "confidence": 0.95
}

Rules:
- Extract EVERYTHING visible on the card in rawText
- Parse individual fields carefully
- Use null for fields not found
- Set confidence based on text clarity (0.0-1.0)
- For maritime professionals, pay attention to ship/port/maritime context
- Clean up phone numbers to international format if possible
- Identify email addresses accurately
- Separate personal names from company names`
              },
              {
                type: "image_url",
                image_url: {
                  url: dataUrl
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });

      const extractedData = JSON.parse(response.choices[0].message.content || '{}');
      
      // Validate and structure the response
      const businessCardData: BusinessCardData = {
        fullName: extractedData.fullName || undefined,
        firstName: extractedData.firstName || undefined,
        lastName: extractedData.lastName || undefined,
        designation: extractedData.designation || undefined,
        company: extractedData.company || undefined,
        email: this.validateEmail(extractedData.email) ? extractedData.email : undefined,
        phone: this.cleanPhoneNumber(extractedData.phone) || undefined,
        whatsapp: this.cleanPhoneNumber(extractedData.whatsapp) || undefined,
        website: this.validateUrl(extractedData.website) ? extractedData.website : undefined,
        address: extractedData.address || undefined,
        confidence: Math.min(Math.max(extractedData.confidence || 0.5, 0), 1),
        rawText: extractedData.rawText || ""
      };

      return {
        success: true,
        data: businessCardData,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('OCR extraction failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        error: errorMessage,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Validate email format
   */
  private validateEmail(email: any): boolean {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Clean and format phone numbers
   */
  private cleanPhoneNumber(phone: any): string | null {
    if (!phone || typeof phone !== 'string') return null;
    
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Must have at least 7 digits
    if (cleaned.replace(/\+/g, '').length < 7) return null;
    
    return cleaned;
  }

  /**
   * Validate URL format
   */
  private validateUrl(url: any): boolean {
    if (!url || typeof url !== 'string') return false;
    try {
      new URL(url);
      return true;
    } catch {
      // Try with https:// prefix
      try {
        new URL(`https://${url}`);
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Enhance extracted data with maritime industry context
   */
  enhanceMaritimeContext(data: BusinessCardData): BusinessCardData {
    if (!data) return data;

    // Maritime rank detection patterns
    const maritimeRanks = [
      'Captain', 'Cap', 'Chief Officer', 'CO', 'Chief Engineer', 'CE',
      'Second Officer', '2O', 'Third Officer', '3O', 'Second Engineer', '2E',
      'Third Engineer', '3E', 'Fourth Engineer', '4E', 'Marine Engineer',
      'Port Captain', 'Fleet Manager', 'Marine Superintendent', 'Technical Superintendent',
      'Ship Manager', 'Vessel Manager', 'Marine Surveyor', 'Naval Architect',
      'Maritime Lawyer', 'Port Agent', 'Ship Agent', 'Bunker Trader'
    ];

    // Check if designation matches maritime ranks
    if (data.designation) {
      const lowerDesignation = data.designation.toLowerCase();
      for (const rank of maritimeRanks) {
        if (lowerDesignation.includes(rank.toLowerCase())) {
          // This is likely a maritime professional
          data.designation = rank; // Standardize the rank name
          break;
        }
      }
    }

    // Maritime company indicators
    const maritimeCompanyKeywords = [
      'shipping', 'maritime', 'marine', 'vessel', 'ship', 'port', 'logistics',
      'cargo', 'container', 'offshore', 'naval', 'fleet', 'tanker', 'liner'
    ];

    if (data.company) {
      const lowerCompany = data.company.toLowerCase();
      const isMaritimeCompany = maritimeCompanyKeywords.some(keyword => 
        lowerCompany.includes(keyword)
      );
      
      if (isMaritimeCompany) {
        // Increase confidence for maritime companies
        data.confidence = Math.min(data.confidence + 0.1, 1.0);
      }
    }

    return data;
  }
}