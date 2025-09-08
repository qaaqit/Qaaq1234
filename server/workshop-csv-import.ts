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
   */
  private mapCSVToWorkshopProfile(row: CSVRow): any {
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

    // Clean port name (remove pincode, country, extra info)
    const cleanPort = this.cleanPortName(port);
    
    // Generate display ID
    const displayId = this.generateDisplayId(cleanPort);

    return {
      fullName: contactName || 'Workshop Provider',
      email: email,
      services: competency + (description ? `. ${description}` : ''),
      whatsappNumber: this.cleanPhoneNumber(whatsapp),
      homePort: cleanPort,
      businessCardPhoto: '',
      workshopFrontPhoto: '',
      officialWebsite: website,
      location: port, // Keep original for reference
      description: `${description}${companies ? ` | Companies worked for: ${companies}` : ''}${visaStatus ? ` | Visa status: ${visaStatus}` : ''}`,
      displayId: displayId,
      anonymousMode: true,
      publicContactHidden: true,
      directContactDisabled: true,
      importSource: 'google_forms_bulk_2025',
      lastSyncAt: new Date(),
      isActive: true,
      isVerified: false
    };
  }

  /**
   * Clean port name for display ID generation
   */
  private cleanPortName(port: string): string {
    if (!port) return 'Unknown';
    
    // Remove common suffixes and clean up
    return port
      .replace(/,.*$/g, '') // Remove everything after comma
      .replace(/\d+/g, '') // Remove numbers/pincode
      .replace(/\s*(port|Port|PORT)\s*/g, '') // Remove "port" word
      .replace(/\s*(city|City|CITY)\s*/g, '') // Remove "city" word
      .replace(/\s+/g, '') // Remove spaces
      .replace(/[^a-zA-Z]/g, '') // Keep only letters
      .toLowerCase()
      .replace(/^(.)/, (match) => match.toUpperCase()); // Capitalize first letter
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

  private portCounters: Map<string, number> = new Map();

  /**
   * Generate anonymous display ID per port
   */
  private generateDisplayId(port: string): string {
    const cleanedPort = port || 'Unknown';
    const currentCount = this.portCounters.get(cleanedPort) || 0;
    const newCount = currentCount + 1;
    this.portCounters.set(cleanedPort, newCount);
    
    return `w${cleanedPort}${newCount}`;
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
    
    let workshops;
    
    if (activeOnly) {
      workshops = await db.select().from(workshopProfiles).where(eq(workshopProfiles.isActive, true)).limit(limit).offset(offset);
    } else {
      workshops = await db.select().from(workshopProfiles).limit(limit).offset(offset);
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