import { db } from "./db";
import { workshopProfiles, insertWorkshopProfileSchema } from "@shared/schema";
import { eq } from "drizzle-orm";
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
   * Parse CSV content and convert to workshop profiles
   */
  private parseCSV(csvContent: string): CSVRow[] {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must contain at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length !== headers.length) {
        console.warn(`Row ${i + 1} has ${values.length} columns, expected ${headers.length}. Skipping.`);
        continue;
      }

      const row: CSVRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }

    return rows;
  }

  /**
   * Map CSV row to workshop profile data
   */
  private mapCSVToWorkshopProfile(row: CSVRow): any {
    // Flexible field mapping - supports various CSV column names
    const getField = (possibleNames: string[]): string => {
      for (const name of possibleNames) {
        const value = row[name] || row[name.toLowerCase()] || row[name.toUpperCase()];
        if (value && value.trim()) return value.trim();
      }
      return '';
    };

    return {
      fullName: getField(['full_name', 'fullName', 'name', 'Full Name', 'Name']),
      email: getField(['email', 'Email', 'email_address', 'Email Address']),
      services: getField(['services', 'Services', 'expertise', 'Expertise', 'services_expertise', 'Services/Expertise']),
      whatsappNumber: getField(['whatsapp_number', 'whatsappNumber', 'whatsapp', 'WhatsApp', 'phone', 'Phone']),
      homePort: getField(['home_port', 'homePort', 'port', 'Port', 'base_port', 'Base Port']),
      businessCardPhoto: getField(['business_card_photo', 'businessCardPhoto', 'card_photo', 'Card Photo']),
      workshopFrontPhoto: getField(['workshop_front_photo', 'workshopFrontPhoto', 'front_photo', 'Front Photo']),
      officialWebsite: getField(['official_website', 'officialWebsite', 'website', 'Website', 'url', 'URL']),
      location: getField(['location', 'Location', 'address', 'Address']),
      description: getField(['description', 'Description', 'about', 'About']),
      importSource: 'csv',
      lastSyncAt: new Date(),
      isActive: true,
      isVerified: false
    };
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
          const workshopData = this.mapCSVToWorkshopProfile(row);
          const validation = this.validateWorkshopProfile(workshopData);

          if (!validation.isValid) {
            result.errors.push(`Row ${rowNumber}: ${validation.errors.join(', ')}`);
            continue;
          }

          // Check if workshop already exists (by email)
          const existingWorkshop = await db
            .select()
            .from(workshopProfiles)
            .where(eq(workshopProfiles.email, workshopData.email))
            .limit(1);

          if (existingWorkshop.length > 0) {
            // Update existing workshop
            await db
              .update(workshopProfiles)
              .set({
                ...workshopData,
                updatedAt: new Date()
              })
              .where(eq(workshopProfiles.email, workshopData.email));

            result.updated++;
            result.details?.push({ row: rowNumber, action: 'updated', email: workshopData.email });
          } else {
            // Insert new workshop
            await db.insert(workshopProfiles).values(workshopData);
            result.imported++;
            result.details?.push({ row: rowNumber, action: 'imported', email: workshopData.email });
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
   * Get all workshop profiles with pagination
   */
  async getAllWorkshops(page: number = 1, limit: number = 20, activeOnly: boolean = true) {
    const offset = (page - 1) * limit;
    
    let query = db.select().from(workshopProfiles);
    
    if (activeOnly) {
      query = query.where(eq(workshopProfiles.isActive, true));
    }
    
    const workshops = await query.limit(limit).offset(offset);
    
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