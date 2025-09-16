import { pool } from "./db";
import { sql } from "drizzle-orm";

/**
 * RFQ Slug Generation and Resolution Utilities
 * 
 * This module provides utilities for generating and resolving human-readable
 * slug-based URLs for RFQ requests in the format:
 * /rfq/{portSlug}/{date}/{userPublicId}/{serial}
 * 
 * Example: /rfq/singapore/2025-01-15/cap123/1
 */

/**
 * Normalizes a location string into a URL-safe slug
 * Examples:
 * - "Singapore" -> "singapore"
 * - "Mumbai, India" -> "mumbai-india"
 * - "Port Said (Egypt)" -> "port-said-egypt"
 * - "New York, NY" -> "new-york-ny"
 */
export function normalizePortSlug(location: string): string {
  if (!location || typeof location !== 'string') {
    return 'unknown-port';
  }

  return location
    .toLowerCase()
    .trim()
    // Remove special characters and brackets
    .replace(/[()[\]{}]/g, '')
    // Replace multiple spaces and punctuation with single space
    .replace(/[,;:&\-_\s]+/g, ' ')
    .trim()
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove any remaining special characters except hyphens
    .replace(/[^a-z0-9-]/g, '')
    // Remove multiple consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Fallback for empty results
    || 'unknown-port';
}

/**
 * Generates a stable public ID for a user if they don't have one
 * Uses their rank prefix + a portion of their user ID
 */
export async function ensureUserPublicId(userId: string): Promise<string> {
  try {
    // Just verify the user exists and return their existing ID
    const existingUser = await pool.query(
      'SELECT id, maritime_rank, rank, full_name FROM users WHERE id = $1',
      [userId]
    );

    if (!existingUser.rows.length) {
      throw new Error(`User ${userId} not found`);
    }

    // Return the user's existing ID - no need for separate public_id column
    return existingUser.rows[0].id;

  } catch (error) {
    console.error('Error ensuring user publicId:', error);
    throw error;
  }
}

/**
 * Generates the next available serial number for a given scope
 * Scope: (portSlug, postedDate, userPublicId)
 * Returns the next sequential integer starting from 1
 */
export async function generateSerial(
  portSlug: string, 
  postedDate: string, 
  userPublicId: string,
  maxRetries: number = 3
): Promise<number> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await pool.query(`
        SELECT COALESCE(MAX(serial), 0) + 1 as next_serial
        FROM rfq_requests 
        WHERE port_slug = $1 AND posted_date = $2 AND user_public_id = $3
      `, [portSlug, postedDate, userPublicId]);

      const nextSerial = parseInt(result.rows[0]?.next_serial) || 1;
      console.log(`🔢 Generated serial ${nextSerial} for ${portSlug}/${postedDate}/${userPublicId} (attempt ${attempt})`);
      
      return nextSerial;

    } catch (error) {
      console.error(`Error generating serial (attempt ${attempt}/${maxRetries}):`, error);
      
      if (attempt === maxRetries) {
        console.warn('⚠️ Max retries reached for serial generation, using fallback');
        // Fallback to timestamp-based serial to avoid conflicts
        const now = new Date();
        const timestampSerial = parseInt(now.getTime().toString().slice(-4)); // Last 4 digits of timestamp
        return Math.max(timestampSerial, 1);
      }
      
      // Wait briefly before retry
      await new Promise(resolve => setTimeout(resolve, 100 * attempt));
    }
  }
  
  // This shouldn't be reached, but TypeScript requires it
  return 1;
}

/**
 * Generates all slug components for a new RFQ
 * Returns an object with portSlug, postedDate, userPublicId, and serial
 */
export async function generateRfqSlugComponents(
  userId: string,
  location: string,
  createdAt: Date = new Date()
): Promise<{
  portSlug: string;
  postedDate: string;
  userPublicId: string;
  serial: number;
}> {
  // Generate components
  const portSlug = normalizePortSlug(location);
  const postedDate = createdAt.toISOString().split('T')[0]; // YYYY-MM-DD format
  const userPublicId = await ensureUserPublicId(userId);
  const serial = await generateSerial(portSlug, postedDate, userPublicId);

  return {
    portSlug,
    postedDate,
    userPublicId,
    serial
  };
}

/**
 * Resolves slug components to find an RFQ
 * Returns the RFQ record or null if not found
 */
export async function resolveRfqBySlug(
  portSlug: string,
  postedDate: string,
  userPublicId: string,
  serial: number
): Promise<any | null> {
  try {
    const result = await pool.query(`
      SELECT r.*, u.full_name as user_full_name, u.maritime_rank as user_rank
      FROM rfq_requests r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.port_slug = $1 
        AND r.posted_date = $2 
        AND r.user_public_id = $3 
        AND r.serial = $4
    `, [portSlug, postedDate, userPublicId, serial]);

    return result.rows[0] || null;

  } catch (error) {
    console.error('Error resolving RFQ by slug:', error);
    return null;
  }
}

/**
 * Builds a canonical slug URL for an RFQ
 */
export function buildSlugUrl(
  portSlug: string,
  postedDate: string,
  userPublicId: string,
  serial: number,
  baseUrl?: string
): string {
  const path = `/rfq/${portSlug}/${postedDate}/${userPublicId}/${serial}`;
  return baseUrl ? `${baseUrl}${path}` : path;
}

/**
 * Validates slug components
 */
export function validateSlugComponents(
  portSlug: string,
  postedDate: string,
  userPublicId: string,
  serial: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate portSlug
  if (!portSlug || !/^[a-z0-9-]+$/.test(portSlug)) {
    errors.push('Invalid port slug format');
  }

  // Validate postedDate (YYYY-MM-DD format)
  if (!postedDate || !/^\d{4}-\d{2}-\d{2}$/.test(postedDate)) {
    errors.push('Invalid posted date format (expected YYYY-MM-DD)');
  } else {
    const date = new Date(postedDate);
    if (isNaN(date.getTime())) {
      errors.push('Invalid posted date value');
    }
  }

  // Validate userPublicId
  if (!userPublicId || !/^[a-z0-9]+$/.test(userPublicId)) {
    errors.push('Invalid user public ID format');
  }

  // Validate serial
  const serialNum = parseInt(serial);
  if (!serial || isNaN(serialNum) || serialNum < 1) {
    errors.push('Invalid serial number');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}