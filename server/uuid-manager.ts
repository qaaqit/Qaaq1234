import { randomUUID } from 'crypto';

/**
 * Centralized UUID Management System
 * Provides consistent UUID generation and validation across the application
 */
export class UUIDManager {
  private static instance: UUIDManager;
  
  // UUID v4 pattern for validation
  private static readonly UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  private constructor() {}
  
  public static getInstance(): UUIDManager {
    if (!UUIDManager.instance) {
      UUIDManager.instance = new UUIDManager();
    }
    return UUIDManager.instance;
  }
  
  /**
   * Generate a standard v4 UUID
   * Uses crypto.randomUUID() for better performance and security
   */
  public generateUUID(): string {
    try {
      return randomUUID();
    } catch (error) {
      // Fallback to manual UUID generation if crypto module fails
      console.warn('⚠️  crypto.randomUUID() failed, using manual fallback:', error);
      return this.generateManualUUID();
    }
  }
  
  /**
   * Manual UUID v4 generation as fallback
   */
  private generateManualUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  /**
   * Validate UUID format
   */
  public isValidUUID(uuid: string): boolean {
    if (!uuid || typeof uuid !== 'string') {
      return false;
    }
    return UUIDManager.UUID_PATTERN.test(uuid);
  }
  
  /**
   * Normalize UUID format (remove dashes, lowercase)
   */
  public normalizeUUID(uuid: string): string {
    if (!this.isValidUUID(uuid)) {
      throw new Error(`Invalid UUID format: ${uuid}`);
    }
    return uuid.toLowerCase().replace(/-/g, '');
  }
  
  /**
   * Format UUID with dashes (standard format)
   */
  public formatUUID(uuid: string): string {
    const normalized = uuid.replace(/-/g, '').toLowerCase();
    if (normalized.length !== 32) {
      throw new Error(`Invalid UUID length: ${uuid}`);
    }
    return [
      normalized.slice(0, 8),
      normalized.slice(8, 12),
      normalized.slice(12, 16),
      normalized.slice(16, 20),
      normalized.slice(20, 32)
    ].join('-');
  }
  
  /**
   * Generate stable user ID based on external provider
   * For cases where we need deterministic IDs
   */
  public generateStableUserID(provider: string, externalId: string): string {
    // Create a consistent hash for the same provider + externalId combination
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256')
      .update(`${provider}:${externalId}`)
      .digest('hex');
    
    // Convert first 32 chars of hash to UUID format
    return this.formatUUID(hash.slice(0, 32));
  }
  
  /**
   * Validate and ensure UUID consistency
   */
  public ensureValidUUID(input: string | undefined | null): string | null {
    if (!input) return null;
    
    try {
      // Check if it's already a valid UUID
      if (this.isValidUUID(input)) {
        return input;
      }
      
      // Try to format it if it's a valid hex string
      if (/^[0-9a-f]{32}$/i.test(input)) {
        return this.formatUUID(input);
      }
      
      // If it's not a valid UUID format, return null
      return null;
    } catch (error) {
      console.warn('⚠️  UUID validation failed:', input, error);
      return null;
    }
  }
  
  /**
   * Generate batch of UUIDs efficiently
   */
  public generateBatch(count: number): string[] {
    const uuids: string[] = [];
    for (let i = 0; i < count; i++) {
      uuids.push(this.generateUUID());
    }
    return uuids;
  }
}

// Export singleton instance
export const uuidManager = UUIDManager.getInstance();

// Export convenience functions
export const generateUUID = () => uuidManager.generateUUID();
export const isValidUUID = (uuid: string) => uuidManager.isValidUUID(uuid);
export const ensureValidUUID = (input: string | undefined | null) => uuidManager.ensureValidUUID(input);