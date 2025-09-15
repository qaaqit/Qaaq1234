// No need to import fetch in Node.js 18+

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
  private baseUrl: string = 'https://api.screenshotone.com/take';
  private cache: Map<string, { url: string; timestamp: number }> = new Map();
  private cacheTimeout: number = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.apiKey = process.env.SCREENSHOTONE_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️  SCREENSHOTONE_API_KEY not found - dynamic website previews will not work');
    }
  }

  /**
   * Generate a screenshot URL for a given website
   */
  async generateScreenshotUrl(options: ScreenshotOptions): Promise<string | null> {
    if (!this.apiKey) {
      console.warn('ScreenshotOne API key not configured');
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

      // Build screenshot URL
      const screenshotUrl = this.buildScreenshotUrl(targetUrl, options);
      
      // Cache the result
      this.cache.set(cacheKey, {
        url: screenshotUrl,
        timestamp: Date.now()
      });

      return screenshotUrl;

    } catch (error) {
      console.error('Error generating screenshot URL:', error);
      return null;
    }
  }

  /**
   * Generate screenshot URLs for multiple websites
   */
  async generateBulkScreenshots(urls: string[], options: Partial<ScreenshotOptions> = {}): Promise<Array<{ url: string; screenshot: string | null }>> {
    const promises = urls.map(async (url) => ({
      url,
      screenshot: await this.generateScreenshotUrl({ ...options, url })
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
   * Build ScreenshotOne API URL with parameters
   */
  private buildScreenshotUrl(url: string, options: ScreenshotOptions): string {
    const params = new URLSearchParams({
      access_key: this.apiKey,
      url: url,
      viewport_width: (options.width || 1200).toString(),
      viewport_height: (options.height || 800).toString(),
      device_scale_factor: '2', // High DPI for crisp images
      format: options.format || 'png',
      full_page: (options.fullPage !== false).toString(), // Default to true
      block_ads: (options.blockAds !== false).toString(), // Default to true
      block_cookie_banners: 'true',
      block_chats: 'true',
      response_type: 'image',
      cache: 'true',
      cache_ttl: '86400' // 24 hours cache
    });

    if (options.quality && options.format === 'jpg') {
      params.set('quality', options.quality.toString());
    }

    if (options.timeout) {
      params.set('timeout', options.timeout.toString());
    }

    return `${this.baseUrl}?${params.toString()}`;
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