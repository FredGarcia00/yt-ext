/**
 * Security utilities for the extension
 */

export class SecurityUtils {
  /**
   * Sanitize user input to prevent XSS attacks
   */
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()
      .slice(0, 1000); // Limit length
  }

  /**
   * Validate URL to ensure it's safe
   */
  static isValidYouTubeUrl(url: string): boolean {
    if (typeof url !== 'string') return false;
    
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'www.youtube.com' || 
             urlObj.hostname === 'youtube.com' ||
             urlObj.hostname === 'youtu.be';
    } catch {
      return false;
    }
  }

  /**
   * Rate limiting for API calls
   */
  private static rateLimits = new Map<string, number[]>();
  
  static checkRateLimit(key: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now();
    const requests = this.rateLimits.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return false; // Rate limit exceeded
    }
    
    validRequests.push(now);
    this.rateLimits.set(key, validRequests);
    return true;
  }

  /**
   * Validate extension context to prevent unauthorized access
   */
  static validateExtensionContext(): boolean {
    try {
      return !!(chrome && chrome.runtime && chrome.runtime.id);
    } catch {
      return false;
    }
  }

  /**
   * Clean storage data to prevent injection
   */
  static sanitizeStorageData(data: any): any {
    if (typeof data === 'string') {
      return this.sanitizeInput(data);
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeStorageData(item));
    }
    
    if (data && typeof data === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(data)) {
        const cleanKey = this.sanitizeInput(key);
        cleaned[cleanKey] = this.sanitizeStorageData(value);
      }
      return cleaned;
    }
    
    return data;
  }
}