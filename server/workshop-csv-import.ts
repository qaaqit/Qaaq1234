import { db } from "./db";
import { workshopProfiles, insertWorkshopProfileSchema } from "@shared/schema";
import { eq, and, ilike, isNotNull, like } from "drizzle-orm";
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

interface CSVRow {
  [key: string]: string;
}

interface WorkshopImportResult {
  success: boolean;
  imported: number;
  updated: number;
  errors: string[];
  details?: any[];
}

export class WorkshopCSVImportService {
  private uploadsDir = path.join(process.cwd(), 'server', 'uploads', 'workshops');

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
   * Parse CSV content and convert to workshop profiles (Google Forms compatible)
   */
  private parseCSV(csvContent: string): CSVRow[] {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must contain at least a header row and one data row');
    }

    const headers = this.parseCSVLine(lines[0]);
    const rows: CSVRow[] = [];

    console.log(`Parsing CSV with ${headers.length} columns`);
    console.log('Headers:', headers.slice(0, 5).map(h => `"${h.substring(0, 50)}..."`));

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = this.parseCSVLine(lines[i]);
        
        // Create row object with all available values
        const row: CSVRow = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        // Check if row has essential data
        const email = row['2. Primary Email'] || '';
        const hasValidEmail = email && email.includes('@') && email.includes('.');
        
        if (hasValidEmail) {
          rows.push(row);
        } else {
          console.log(`Row ${i + 1}: Skipping - invalid email: "${email}"`);
        }
      } catch (error) {
        console.log(`Row ${i + 1}: Parse error - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`Successfully parsed ${rows.length} valid rows from CSV`);
    return rows;
  }

  /**
   * Properly parse CSV line handling quoted fields
   */
  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        values.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    // Add final field
    values.push(current.trim());
    return values;
  }

  /**
   * Map CSV row to workshop profile data - Google Forms format
   * CRITICAL: Only generates display ID if generateDisplayId is true (for new workshops)
   */
  private async mapCSVToWorkshopProfile(row: CSVRow, generateDisplayId: boolean = true): Promise<any> {
    // Google Forms CSV field mapping
    const getField = (possibleNames: string[]): string => {
      for (const name of possibleNames) {
        const value = row[name] || row[name.toLowerCase()] || row[name.toUpperCase()];
        if (value && value.trim()) return value.trim();
      }
      return '';
    };

    // Extract data from Google Forms columns
    const contactName = getField(['1.  Contact person Name (First Name, Last Name)', 'contact_name', 'name']);
    const email = getField(['2. Primary Email', 'primary_email', 'email']);
    const competency = getField(['3. Wshop Competency / Expertise  (Please select only 1)', 'competency', 'expertise']);
    const description = getField(['4.  Briefly describe area of your workshop\'s core expertise, number of staff & year of establishment. ', 'description', 'about']);
    const whatsapp = getField(['5. WhatsApp / WeChat/  Phone (with country code)', 'whatsapp', 'phone']);
    const port = getField(['6. Port where your branch is located? (Write only one city with pincode). Multiple city entry will get rejected.', 'port', 'location']);
    const visaStatus = getField(['7. Service Engineer Visa status', 'visa_status']);
    const companies = getField(['8. Companies worked for  (in last 1 year):', 'companies']);
    const website = getField(['Your workshop\'s official website', 'website']);

    // Normalize and clean website URL
    const normalizedWebsite = this.normalizeWebsiteUrl(website);

    // Clean port name
    const cleanPort = this.cleanPortName(port);
    
    // Base workshop data without display ID
    const baseData = {
      fullName: contactName || 'Workshop Provider',
      email: email,
      services: competency + (description ? `. ${description}` : ''),
      whatsappNumber: this.cleanPhoneNumber(whatsapp),
      homePort: cleanPort,
      businessCardPhoto: '',
      workshopFrontPhoto: '',
      officialWebsite: normalizedWebsite,
      location: port, // Keep original for reference
      description: `${description}${companies ? ` | Companies worked for: ${companies}` : ''}${visaStatus ? ` | Visa status: ${visaStatus}` : ''}`,
      anonymousMode: true,
      publicContactHidden: true,
      directContactDisabled: true,
      importSource: 'google_forms_bulk_2025',
      lastSyncAt: new Date(),
      isActive: true,
      isVerified: false
    };

    // Only generate display ID for new workshops
    if (generateDisplayId) {
      const displayId = await this.generateDisplayId(cleanPort);
      return {
        ...baseData,
        displayId: displayId
      };
    }

    return baseData;
  }

  /**
   * Clean port name for display ID generation - UNIFIED with backfill service
   * CRITICAL: DO NOT remove "port" or "city" words to maintain consistency
   * with existing display IDs like wMumbaiPort1, wDubai1, etc.
   */
  private cleanPortName(port: string): string {
    if (!port || port.trim() === '') {
      return 'Unknown';
    }
    
    // Match backfill service logic exactly
    return port
      .split(',')[0] // Take first part if comma-separated
      .split('-')[0] // Take first part if dash-separated
      .replace(/\s+/g, '') // Remove spaces
      .replace(/[^a-zA-Z]/g, '') // Keep only letters
      .substring(0, 20) // Limit length
      .toLowerCase()
      .replace(/^./, (str) => str.toUpperCase()) || 'Unknown'; // Capitalize first letter
  }

  /**
   * Normalize and clean website URLs for consistent storage and domain matching
   */
  private normalizeWebsiteUrl(url: string): string {
    if (!url || !url.trim()) return '';
    
    try {
      // Remove protocol and www prefix for normalization
      let cleanUrl = url.trim().toLowerCase();
      
      // Remove protocol if present
      cleanUrl = cleanUrl.replace(/^https?:\/\//, '');
      
      // Remove www prefix
      cleanUrl = cleanUrl.replace(/^www\./, '');
      
      // Remove trailing slash and paths (keep only domain)
      cleanUrl = cleanUrl.split('/')[0];
      
      // Validate domain format
      if (!cleanUrl.includes('.') || cleanUrl.length < 4) {
        console.warn(`Invalid website URL format: ${url}`);
        return '';
      }
      
      // Add back https protocol for storage
      return `https://${cleanUrl}`;
      
    } catch (error) {
      console.error(`Error normalizing website URL ${url}:`, error);
      return '';
    }
  }

  /**
   * Clean and standardize phone numbers
   */
  private cleanPhoneNumber(phone: string): string {
    if (!phone) return '';
    
    // Remove common prefixes and clean up
    return phone
      .replace(/^\+/g, '') // Remove leading +
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  /**
   * Get next available sequence number for a port - UNIFIED with backfill service
   */
  private async getNextSequenceForPort(cleanedPort: string): Promise<number> {
    const pattern = `w${cleanedPort}%`;
    
    const existingIds = await db
      .select({ displayId: workshopProfiles.displayId })
      .from(workshopProfiles)
      .where(
        and(
          eq(workshopProfiles.isActive, true),
          ilike(workshopProfiles.displayId, pattern)
        )
      );

    // Extract numeric suffixes and find max
    let maxSequence = 0;
    for (const row of existingIds) {
      if (row.displayId) {
        const match = row.displayId.match(/^w[A-Za-z]+(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxSequence) {
            maxSequence = num;
          }
        }
      }
    }
    
    return maxSequence + 1;
  }

  /**
   * Generate database-aware anonymous display ID per port
   * Matches the algorithm from WorkshopDisplayIdBackfillService exactly
   */
  private async generateDisplayId(cleanedPort: string): Promise<string> {
    try {
      const nextSequence = await this.getNextSequenceForPort(cleanedPort);
      const displayId = `w${cleanedPort}${nextSequence}`;
      
      console.log(`🏷️ Generated display ID for ${cleanedPort}: ${displayId} (sequence: ${nextSequence})`);
      return displayId;
      
    } catch (error) {
      console.error(`❌ Error generating display ID for port ${cleanedPort}:`, error);
      // Fallback to timestamp-based ID if database query fails
      return `w${cleanedPort}${Date.now() % 10000}`;
    }
  }

  /**
   * Validate workshop profile data
   */
  private validateWorkshopProfile(profile: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!profile.fullName || profile.fullName.length < 2) {
      errors.push('Full name is required and must be at least 2 characters');
    }

    if (!profile.email || !this.isValidEmail(profile.email)) {
      errors.push('Valid email address is required');
    }

    if (!profile.services || profile.services.length < 5) {
      errors.push('Services/expertise description is required and must be at least 5 characters');
    }

    if (!profile.homePort || profile.homePort.length < 2) {
      errors.push('Home port is required and must be at least 2 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Store CSV file and return file path
   */
  async storeCSVFile(fileBuffer: Buffer, originalFileName: string): Promise<string> {
    const timestamp = Date.now();
    const extension = path.extname(originalFileName) || '.csv';
    const uniqueId = randomUUID();
    const fileName = `workshops_${timestamp}_${uniqueId}${extension}`;
    const filePath = path.join(this.uploadsDir, fileName);
    
    await fs.writeFile(filePath, fileBuffer);
    console.log(`Stored CSV file: ${fileName}`);
    
    return filePath;
  }

  /**
   * Import workshop data from CSV content
   */
  async importFromCSV(csvContent: string, adminUserId: string): Promise<WorkshopImportResult> {
    const result: WorkshopImportResult = {
      success: false,
      imported: 0,
      updated: 0,
      errors: [],
      details: []
    };

    try {
      const csvRows = this.parseCSV(csvContent);
      console.log(`Parsed ${csvRows.length} rows from CSV`);

      for (let i = 0; i < csvRows.length; i++) {
        const row = csvRows[i];
        const rowNumber = i + 2; // +2 because we skip header and arrays are 0-indexed

        try {
          // First, check if this is a new or existing workshop to decide on display ID generation
          const tempEmail = row['2. Primary Email'] || row['primary_email'] || row['email'] || '';
          const existingCheck = tempEmail ? await db
            .select({ id: workshopProfiles.id, displayId: workshopProfiles.displayId })
            .from(workshopProfiles)
            .where(and(
              eq(workshopProfiles.email, tempEmail),
              eq(workshopProfiles.isActive, true)
            ))
            .limit(1) : [];
          
          const isNewWorkshop = existingCheck.length === 0;
          const workshopData = await this.mapCSVToWorkshopProfile(row, isNewWorkshop);
          const validation = this.validateWorkshopProfile(workshopData);

          if (!validation.isValid) {
            result.errors.push(`Row ${rowNumber}: ${validation.errors.join(', ')}`);
            continue;
          }

          // Check if workshop already exists (by email)
          const existingWorkshop = await db
            .select()
            .from(workshopProfiles)
            .where(and(
              eq(workshopProfiles.email, workshopData.email),
              eq(workshopProfiles.isActive, true)
            ))
            .limit(1);

          if (existingWorkshop.length > 0) {
            // CRITICAL: Preserve existing display ID when updating, or generate new one if missing
            const existingDisplayId = existingWorkshop[0].displayId;
            const hasExistingDisplayId = existingDisplayId && existingDisplayId.trim() !== '';
            
            let finalDisplayId: string;
            
            if (hasExistingDisplayId) {
              // Preserve existing display ID
              finalDisplayId = existingDisplayId;
              console.log(`🔄 Updating existing workshop: ${workshopData.email}, preserving display ID: ${existingDisplayId}`);
            } else {
              // Generate new display ID for existing workshop that lacks one
              const cleanPort = this.cleanPortName(workshopData.location || '');
              finalDisplayId = await this.generateDisplayId(cleanPort);
              console.log(`🔄 Updating existing workshop: ${workshopData.email}, generating new display ID: ${finalDisplayId} (was null/empty)`);
            }
            
            // Update existing workshop with proper display ID
            const updateData = { 
              ...workshopData, 
              displayId: finalDisplayId, 
              updatedAt: new Date() 
            };
            
            await db
              .update(workshopProfiles)
              .set(updateData)
              .where(eq(workshopProfiles.email, workshopData.email));

            result.updated++;
            result.details?.push({ 
              row: rowNumber, 
              action: 'updated', 
              email: workshopData.email,
              displayId: finalDisplayId,
              displayIdStatus: hasExistingDisplayId ? 'preserved' : 'generated'
            });
          } else {
            // Insert new workshop - displayId was already generated
            console.log(`➕ Importing new workshop: ${workshopData.email}, display ID: ${workshopData.displayId}`);
            await db.insert(workshopProfiles).values(workshopData);
            result.imported++;
            result.details?.push({ 
              row: rowNumber, 
              action: 'imported', 
              email: workshopData.email,
              displayId: workshopData.displayId
            });
          }

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Row ${rowNumber}: ${errorMsg}`);
        }
      }

      result.success = (result.imported + result.updated) > 0;
      console.log(`CSV Import completed: ${result.imported} imported, ${result.updated} updated, ${result.errors.length} errors`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error during CSV parsing';
      result.errors.push(`CSV parsing error: ${errorMsg}`);
    }

    return result;
  }

  /**
   * Import workshop data from file path
   */
  async importFromFile(filePath: string, adminUserId: string): Promise<WorkshopImportResult> {
    try {
      const csvContent = await fs.readFile(filePath, 'utf-8');
      return await this.importFromCSV(csvContent, adminUserId);
    } catch (error) {
      return {
        success: false,
        imported: 0,
        updated: 0,
        errors: [`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Get all workshop profiles with pagination and optional port filtering
   */
  async getAllWorkshops(page: number = 1, limit: number = 20, activeOnly: boolean = true, port?: string) {
    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    
    if (activeOnly) {
      whereConditions.push(eq(workshopProfiles.isActive, true));
    }
    
    if (port) {
      // Search for port in home_port field (case-insensitive, partial match)
      whereConditions.push(ilike(workshopProfiles.homePort, `%${port}%`));
    }
    
    let workshops;
    
    if (whereConditions.length > 0) {
      workshops = await db
        .select()
        .from(workshopProfiles)
        .where(whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions))
        .limit(limit)
        .offset(offset);
    } else {
      // Default to active workshops only even when no specific filters are applied
      workshops = await db
        .select()
        .from(workshopProfiles)
        .where(eq(workshopProfiles.isActive, true))
        .limit(limit)
        .offset(offset);
    }
    
    return {
      workshops,
      page,
      limit,
      total: workshops.length
    };
  }

  /**
   * Get workshop by ID
   */
  async getWorkshopById(id: string) {
    const workshop = await db
      .select()
      .from(workshopProfiles)
      .where(eq(workshopProfiles.id, id))
      .limit(1);

    return workshop[0] || null;
  }
}

export const workshopCSVImportService = new WorkshopCSVImportService();