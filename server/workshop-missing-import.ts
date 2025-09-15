import { db } from "./db";
import { workshopProfiles } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

interface CSVRow {
  [key: string]: string;
}

export class WorkshopMissingImportService {
  
  /**
   * Parse CSV line handling quoted fields properly
   */
  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
      } else if (inQuotes && char === quoteChar) {
        // Check for escaped quotes
        if (line[i + 1] === quoteChar) {
          current += char;
          i++; // Skip next quote
        } else {
          inQuotes = false;
          quoteChar = '';
        }
      } else if (!inQuotes && char === ',') {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  }

  /**
   * Clean port name for display ID generation
   */
  private cleanPortName(port: string): string {
    return port
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 12); // Limit length
  }

  /**
   * Generate display ID for workshop
   */
  private async generateDisplayId(cleanedPort: string): Promise<string> {
    try {
      // Get existing IDs for this port
      const pattern = `w${cleanedPort}%`;
      
      const existingIds = await db
        .select({ displayId: workshopProfiles.displayId })
        .from(workshopProfiles)
        .where(eq(workshopProfiles.isActive, true));

      // Filter for this port and find max sequence
      let maxSequence = 0;
      for (const row of existingIds) {
        if (row.displayId && row.displayId.startsWith(`w${cleanedPort}`)) {
          const match = row.displayId.match(/^w[A-Za-z]+(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxSequence) {
              maxSequence = num;
            }
          }
        }
      }
      
      return `w${cleanedPort}${maxSequence + 1}`;
    } catch (error) {
      console.error(`Error generating display ID for port ${cleanedPort}:`, error);
      return `w${cleanedPort}${Date.now() % 10000}`;
    }
  }

  /**
   * More lenient validation for authentic workshops
   */
  private validateWorkshop(profile: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // More lenient validation
    if (!profile.fullName || profile.fullName.length < 1) {
      errors.push('Name is required');
    }

    // Relaxed email validation - allow some flexibility
    if (!profile.email || !profile.email.includes('@')) {
      errors.push('Email must contain @');
    }

    // More flexible services validation - allow shorter descriptions
    if (!profile.services || profile.services.length < 2) {
      errors.push('Services description too short');
    }

    // More flexible port validation
    if (!profile.homePort || profile.homePort.length < 1) {
      errors.push('Port location is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Map CSV row to workshop profile with more flexible parsing
   */
  private mapCSVToProfile(row: CSVRow): any {
    // Get fields with multiple possible column names
    const fullName = (row['1.  Contact person Name (First Name, Last Name)'] || 
                     row['contact_name'] || 
                     row['name'] || '').trim();
    
    const email = (row['2. Primary Email'] || 
                  row['email'] || 
                  row['primary_email'] || '').trim();
    
    const expertise = (row['3. Wshop Competency / Expertise  (Please select only 1)'] || 
                      row['competency'] || 
                      row['expertise'] || '').trim();
    
    const services = (row['4.  Briefly describe area of your workshop\'s core expertise, number of staff & year of establishment. '] || 
                     row['description'] || 
                     row['services'] || 
                     expertise || '').trim();
    
    const phone = (row['5. WhatsApp / WeChat/  Phone (with country code)'] || 
                  row['phone'] || 
                  row['whatsapp'] || '').trim();
    
    const homePort = (row['6. Port where your branch is located? (Write only one city with pincode). Multiple city entry will get rejected.'] || 
                     row['port'] || 
                     row['location'] || 
                     row['city'] || '').trim();

    const visaStatus = (row['7. Service Engineer Visa status'] || 
                       row['visa_status'] || '').trim();

    const quote = (row['Quote for 8 hour attendance of Service Engineer?  '] || 
                  row['quote'] || '').trim();

    const website = (row['Your workshop\'s official website'] || 
                    row['website'] || '').trim();

    const remoteService = (row['Remote troubleshooting service? Guidance via Google meet/ Zoom. Kindly quote best tariff /hour session.'] || 
                          row['remote_service'] || '').trim();

    return {
      fullName,
      email: email.toLowerCase(),
      expertise,
      services: services || expertise || 'Maritime services',
      phone,
      homePort,
      visaStatus,
      quote,
      website,
      remoteService,
      importSource: 'csv_authentic_missing_2025',
      importedAt: new Date().toISOString(),
      isActive: true
    };
  }

  /**
   * Import missing workshops with lenient validation
   */
  async importMissingWorkshops(): Promise<{
    success: boolean;
    processed: number;
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    const result = {
      success: false,
      processed: 0,
      imported: 0,
      skipped: 0,
      errors: []
    };

    try {
      // Read the CSV file - go up one directory from server to find attached_assets
      const csvPath = path.join(process.cwd(), '..', 'attached_assets', 'Marine Repairs Workshop Database (Responses) - Form Responses 1_1757953053527.csv');
      const csvContent = await fs.readFile(csvPath, 'utf-8');
      
      const lines = csvContent.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('CSV must contain at least header and one data row');
      }

      const headers = this.parseCSVLine(lines[0]);
      console.log(`📊 Processing CSV with ${headers.length} columns and ${lines.length - 1} data rows`);

      // Get existing workshops to avoid duplicates
      const existingWorkshops = await db
        .select({ email: workshopProfiles.email })
        .from(workshopProfiles)
        .where(eq(workshopProfiles.isActive, true));
      
      const existingEmails = new Set(existingWorkshops.map(w => w.email.toLowerCase()));
      console.log(`📋 Found ${existingEmails.size} existing active workshops`);

      // Process each row
      for (let i = 1; i < lines.length; i++) {
        const rowNumber = i + 1;
        result.processed++;

        try {
          const values = this.parseCSVLine(lines[i]);
          
          // Create row object
          const row: CSVRow = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });

          // Map to workshop profile
          const profile = this.mapCSVToProfile(row);
          
          // Check if already exists
          if (existingEmails.has(profile.email.toLowerCase())) {
            console.log(`⏭️  Row ${rowNumber}: Email ${profile.email} already exists, skipping`);
            result.skipped++;
            continue;
          }

          // Validate with lenient rules
          const validation = this.validateWorkshop(profile);
          if (!validation.isValid) {
            console.log(`❌ Row ${rowNumber}: Validation failed - ${validation.errors.join(', ')}`);
            result.errors.push(`Row ${rowNumber}: ${validation.errors.join(', ')}`);
            result.skipped++;
            continue;
          }

          // Generate display ID
          const cleanedPort = this.cleanPortName(profile.homePort);
          const displayId = await this.generateDisplayId(cleanedPort);
          
          // Insert workshop
          await db.insert(workshopProfiles).values({
            ...profile,
            displayId,
            id: randomUUID()
          });

          console.log(`✅ Row ${rowNumber}: Imported ${profile.fullName} (${profile.email}) as ${displayId}`);
          result.imported++;
          
          // Add to existing emails set to prevent future duplicates in this batch
          existingEmails.add(profile.email.toLowerCase());

        } catch (error) {
          console.error(`❌ Row ${rowNumber}: Processing error -`, error);
          result.errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : 'Processing error'}`);
          result.skipped++;
        }
      }

      result.success = true;
      console.log(`🎉 Import completed: ${result.imported} imported, ${result.skipped} skipped`);

    } catch (error) {
      console.error('❌ Import failed:', error);
      result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }
}