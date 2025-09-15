// No need to import fetch in Node.js 18+
import crypto from 'crypto';

export interface ScreenshotOptions {
  url: string;
  width?: number;
  height?: number;
  fullPage?: boolean;
  format?: 'png' | 'jpg' | 'webp';
  quality?: number;
  blockAds?: boolean;
  timeout?: number;
}

export class ScreenshotService {
  private apiKey: string;
  private secretKey: string;
  private baseUrl: string = 'https://api.screenshotone.com/take';
  private cache: Map<string, { url: string; timestamp: number }> = new Map();
  private cacheTimeout: number = 15 * 60 * 1000; // 15 minutes
  private ipThrottle: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly THROTTLE_LIMIT = 10; // 10 screenshots per 5 minutes per IP
  private readonly THROTTLE_WINDOW = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.apiKey = process.env.SCREENSHOTONE_API_KEY || '';
    this.secretKey = process.env.SCREENSHOTONE_SECRET_KEY || '';
    
    if (!this.apiKey) {
      console.warn('⚠️  SCREENSHOTONE_API_KEY not found - dynamic website previews will not work');
    }
    
    if (!this.secretKey) {
      console.warn('⚠️  SCREENSHOTONE_SECRET_KEY not found - signed URLs will not work');
    }
  }

  /**
   * Check IP throttling for screenshot generation
   */
  private checkIPThrottle(ip: string): boolean {
    const now = Date.now();
    const throttleData = this.ipThrottle.get(ip);
    
    if (!throttleData || now > throttleData.resetTime) {
      // Reset or initialize throttle
      this.ipThrottle.set(ip, {
        count: 1,
        resetTime: now + this.THROTTLE_WINDOW
      });
      return true;
    }
    
    if (throttleData.count >= this.THROTTLE_LIMIT) {
      console.warn(`🚫 IP throttle limit exceeded for ${ip}`);
      return false;
    }
    
    throttleData.count++;
    return true;
  }

  /**
   * Generate ScreenshotOne signed URL using their native HMAC mechanism
   */
  private generateSignedUrl(url: string, options: ScreenshotOptions): string {
    // Build query parameters
    const params = new URLSearchParams({
      access_key: this.apiKey,
      url: url,
      viewport_width: (options.width || 1200).toString(),
      viewport_height: (options.height || 800).toString(),
      device_scale_factor: '2', // High DPI for crisp images
      format: options.format || 'png',
      full_page: (options.fullPage !== false).toString(),
      block_ads: (options.blockAds !== false).toString(),
      block_cookie_banners: 'true',
      block_chats: 'true',
      response_type: 'by_format',
      cache: 'true',
      cache_ttl: '86400' // 24 hours cache
    });

    if (options.quality && options.format === 'jpg') {
      params.set('quality', options.quality.toString());
    }

    if (options.timeout) {
      params.set('timeout', options.timeout.toString());
    }

    // Create the query string for signing
    const queryString = params.toString();
    
    // Generate HMAC-SHA256 signature using ScreenshotOne's method
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(queryString)
      .digest('hex');
    
    // Return the signed URL
    return `${this.baseUrl}?${queryString}&signature=${signature}`;
  }

  /**
   * Generate a signed screenshot URL using ScreenshotOne's native signing
   */
  async generateSignedScreenshotUrl(options: ScreenshotOptions, clientIP?: string): Promise<string | null> {
    if (!this.apiKey || !this.secretKey) {
      console.warn('ScreenshotOne API key or secret key not configured');
      return null;
    }
    
    // Check IP throttling if IP provided
    if (clientIP && !this.checkIPThrottle(clientIP)) {
      return null;
    }

    try {
      // Clean and validate URL
      const targetUrl = this.cleanUrl(options.url);
      if (!targetUrl) {
        console.warn('Invalid URL provided for screenshot:', options.url);
        return null;
      }

      // Check cache first
      const cacheKey = this.getCacheKey(targetUrl, options);
      const cached = this.cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        return cached.url;
      }

      // Generate signed URL using ScreenshotOne's native method
      const signedUrl = this.generateSignedUrl(targetUrl, options);
      
      // Cache the result
      this.cache.set(cacheKey, {
        url: signedUrl,
        timestamp: Date.now()
      });

      console.log(`🔒 Generated signed screenshot URL for ${targetUrl}`);
      return signedUrl;

    } catch (error) {
      console.error('Error generating signed screenshot URL:', error);
      return null;
    }
  }

  /**
   * DEPRECATED: Use generateSignedScreenshotUrl() instead
   */
  async generateScreenshotUrl(options: ScreenshotOptions): Promise<string | null> {
    console.warn('⚠️ generateScreenshotUrl is deprecated. Use generateSignedScreenshotUrl() instead');
    return this.generateSignedScreenshotUrl(options);
  }
  
  /**
   * DEPRECATED: Legacy method for backward compatibility
   */
  async generateScreenshotToken(options: ScreenshotOptions, clientIP?: string): Promise<string | null> {
    console.warn('⚠️ generateScreenshotToken is deprecated. Use generateSignedScreenshotUrl() instead');
    return this.generateSignedScreenshotUrl(options, clientIP);
  }

  /**
   * Generate signed screenshot URLs for multiple websites
   */
  async generateBulkScreenshots(urls: string[], options: Partial<ScreenshotOptions> = {}): Promise<Array<{ url: string; screenshot: string | null }>> {
    const promises = urls.map(async (url) => ({
      url,
      screenshot: await this.generateSignedScreenshotUrl({ ...options, url })
    }));

    return Promise.all(promises);
  }

  /**
   * Clean and validate URL
   */
  private cleanUrl(url: string): string | null {
    if (!url || typeof url !== 'string') return null;

    try {
      // Add protocol if missing
      let cleanUrl = url.trim();
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = `https://${cleanUrl}`;
      }

      // Validate URL
      const urlObj = new URL(cleanUrl);
      return urlObj.href;
    } catch {
      return null;
    }
  }

  /**
   * Generate cache key for URL and options
   */
  private getCacheKey(url: string, options: ScreenshotOptions): string {
    const optionsString = JSON.stringify({
      width: options.width || 1200,
      height: options.height || 800,
      format: options.format || 'png',
      fullPage: options.fullPage !== false,
      blockAds: options.blockAds !== false
    });
    return `${url}:${optionsString}`;
  }

  /**
   * Clear old cache entries
   */
  clearOldCache(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (const [key, value] of entries) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; oldEntries: number } {
    const now = Date.now();
    let oldEntries = 0;
    
    const entries = Array.from(this.cache.entries());
    for (const [, value] of entries) {
      if (now - value.timestamp > this.cacheTimeout) {
        oldEntries++;
      }
    }

    return {
      size: this.cache.size,
      oldEntries
    };
  }
}

// Export singleton instance
export const screenshotService = new ScreenshotService();

// Clean cache every hour
setInterval(() => {
  screenshotService.clearOldCache();
}, 60 * 60 * 1000);