import { z } from 'zod';
import { insertWorkshopProfileSchema } from '@shared/schema';

/**
 * Workshop CSV Parser Service
 * 
 * Handles parsing of workshop CSV files exported from Google Forms
 * Maps CSV columns to workshopProfiles database schema
 */

// CSV Column Header Mappings (Google Form responses format)
export const CSV_COLUMN_MAP = {
  'Timestamp': 'timestamp',
  '2.  Contact person Name (First Name, Last Name, Designation)': 'fullName',
  '3a. Primary Email': 'email',
  '4. Wshop Expertise services': 'services',
  '4.  Briefly describe area of your workshop\'s all expertise, number of staff & year of establishment. ': 'description',
  '3b. WhatsApp / WeChat/  Phone (with country code)': 'whatsappNumber',
  '6a. Port where your branch is located? (Write only one city prefrably with suburb/ pincode). Multiple city entry will get rejected.': 'homePort',
  '7. Service Engineer Visa status': 'visaStatus',
  '8. Companies worked for  (in last 1 year):': 'companiesWorkedFor',
  '5a. Photo of  W/shop front with name/ logo.': 'workshopFrontPhoto',
  '5b. Photo of work (without name, contact details or website)': 'workshopWorkPhoto',
  'Quote for 8 hour attendance of Service Engineer?  ': 'quote8Hours',
  '10. Kindly quote best tariff, for per day attendance of Service Engineer? (in USD). For outstation works, travel visa and stay will be arranged separately, by ship manager.': 'perDayAttendanceRate',
  '9. Your workshop\'s official website': 'officialWebsite',
  '11. Remote troubleshooting service? Guidance via Google meet/ Zoom. Kindly quote best tariff /hour session.': 'remoteTroubleshootingRate',
  'Email Address': 'alternateEmail',
  'Column 14': 'column14',
  'Workshop Bank Details': 'bankDetails',
  'Business Card': 'businessCardPhoto'
} as const;

// Maritime Expertise Categories mapping (from services description)
export const MARITIME_EXPERTISE_MAP = {
  'Automation (Radio Survey/ Electrical Electronics)': 'automation_electronics',
  'Hydraulic/ Pneumatic': 'hydraulic_pneumatic',
  'Mechanical (Repairs/ Fabrication/ Combustion/ Cargo Pumps FRAMO MARFLEX)': 'mechanical_repairs',
  'Mechanical (Repairs/ Fabrication/ Combustion)': 'mechanical_repairs',
  'LSA / FFA': 'lsa_ffa',
  'Turbocharger / Governor/ Refrigeration / UTM / UWILD': 'turbocharger_governor',
  'Ship Agency / Store Supplier/ Ship chandler / Crewing': 'ship_agency_supply',
  'a. Main Engine Propulsion': 'main_engine_propulsion',
  'b. Aux Engine Power generation': 'aux_engine_power',
  'PROPELLER AND PITCH SYSTEMS MAINTENANCE AND REPAIR': 'propeller_pitch_systems',
  'AIR STARTER MOTOR MAINTENANCE AND REPAIR': 'air_starter_motor',
  'd. Hydraulic/ Pneumatic': 'hydraulic_pneumatic',
  'j. Hull Structure': 'hull_structure',
  'Shaft Alignment': 'shaft_alignment',
  'Bore-Linebore Alignment': 'bore_linebore_alignment',
  'Laser Geometric Measurements': 'laser_geometric_measurements',
  'Thermal Expansion Measurements': 'thermal_expansion_measurements',
  'Sequential Machine Alignment': 'sequential_machine_alignment',
  'Vibration Measurements': 'vibration_measurements',
  'Tugboat Propeller Maintenance': 'tugboat_propeller_maintenance',
  'Ship Propeller Maintenance': 'ship_propeller_maintenance',
  'Azimuth Propeller Maintenance': 'azimuth_propeller_maintenance',
  'Azimuth Thruster System Repair': 'azimuth_thruster_repair',
  'Deck Equipment Repair': 'deck_equipment_repair',
  'Remanufacture of the shaft': 'shaft_remanufacture',
  'Propeller System Remanufacture': 'propeller_system_remanufacture',
  's. Ship Agency / Store Supplier/ Ship chandler / Crewing': 'ship_agency_supply'
} as const;

// Raw CSV row interface
export interface CSVRow {
  [key: string]: string;
}

// Parsed workshop data interface
export interface ParsedWorkshopData {
  fullName: string;
  email: string;
  services: string;
  maritimeExpertise: string[];
  description?: string;
  whatsappNumber?: string;
  homePort: string;
  visaStatus?: string;
  companiesWorkedFor?: string;
  workshopFrontPhoto?: string;
  workshopWorkPhoto?: string;
  quote8Hours?: string;
  perDayAttendanceRate?: string;
  officialWebsite?: string;
  remoteTroubleshootingRate?: string;
  alternateEmail?: string;
  bankDetails?: string;
  businessCardPhoto?: string;
  importSource: 'csv';
  isActive: boolean;
  anonymousMode: boolean;
  createdAt: Date;
}

// Import result interface
export interface CSVImportResult {
  success: boolean;
  processedRows: number;
  successfulImports: number;
  failedImports: number;
  errors: Array<{
    row: number;
    error: string;
    data?: any;
  }>;
  duplicateEmails: string[];
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    importedWorkshops: number;
    skippedWorkshops: number;
  };
}

export class WorkshopCSVParser {
  
  /**
   * Parse CSV content and return structured workshop data
   */
  static parseCSV(csvContent: string): CSVImportResult {
    const result: CSVImportResult = {
      success: false,
      processedRows: 0,
      successfulImports: 0,
      failedImports: 0,
      errors: [],
      duplicateEmails: [],
      summary: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        importedWorkshops: 0,
        skippedWorkshops: 0
      }
    };

    try {
      // Parse CSV using simple approach
      const records: CSVRow[] = this.parseSimpleCSV(csvContent);

      result.summary.totalRows = records.length;
      result.processedRows = records.length;

      console.log(`📊 CSV Parser: Processing ${records.length} rows`);

      // Process each row
      const parsedWorkshops: ParsedWorkshopData[] = [];
      const seenEmails = new Set<string>();

      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const rowNumber = i + 2; // +2 because CSV has header row and is 1-indexed

        try {
          const parsedData = this.parseWorkshopRow(row);
          
          // Skip rows without required data
          if (!parsedData.email || !parsedData.fullName || !parsedData.homePort) {
            result.errors.push({
              row: rowNumber,
              error: 'Missing required fields: email, fullName, or homePort',
              data: { email: parsedData.email, fullName: parsedData.fullName, homePort: parsedData.homePort }
            });
            result.summary.invalidRows++;
            result.failedImports++;
            continue;
          }

          // Check for duplicate emails in CSV
          const emailLower = parsedData.email.toLowerCase();
          if (seenEmails.has(emailLower)) {
            result.duplicateEmails.push(parsedData.email);
            result.errors.push({
              row: rowNumber,
              error: `Duplicate email in CSV: ${parsedData.email}`,
              data: parsedData
            });
            result.summary.skippedWorkshops++;
            continue;
          }
          seenEmails.add(emailLower);

          // Validate data using Zod schema
          const validationResult = insertWorkshopProfileSchema.safeParse(parsedData);
          if (!validationResult.success) {
            result.errors.push({
              row: rowNumber,
              error: `Validation failed: ${validationResult.error.message}`,
              data: parsedData
            });
            result.summary.invalidRows++;
            result.failedImports++;
            continue;
          }

          parsedWorkshops.push(parsedData);
          result.summary.validRows++;
          result.successfulImports++;

        } catch (error: unknown) {
          result.errors.push({
            row: rowNumber,
            error: `Parse error: ${error instanceof Error ? error.message : String(error)}`,
            data: row
          });
          result.summary.invalidRows++;
          result.failedImports++;
        }
      }

      result.summary.importedWorkshops = parsedWorkshops.length;
      result.success = parsedWorkshops.length > 0;

      console.log(`✅ CSV Parser: Successfully parsed ${result.successfulImports}/${result.processedRows} rows`);
      
      return result;

    } catch (error: unknown) {
      console.error('🚨 CSV Parser: Failed to parse CSV:', error);
      result.errors.push({
        row: 0,
        error: `CSV parsing failed: ${error instanceof Error ? error.message : String(error)}`
      });
      return result;
    }
  }

  /**
   * Parse a single CSV row into workshop data
   */
  private static parseWorkshopRow(row: CSVRow): ParsedWorkshopData {
    // Extract basic information
    const fullName = this.cleanString(this.getColumnValue(row, 'fullName'));
    const email = this.cleanEmail(this.getColumnValue(row, 'email'));
    const services = this.cleanString(this.getColumnValue(row, 'services'));
    const homePort = this.cleanString(this.getColumnValue(row, 'homePort'));

    // Parse maritime expertise from services string
    const maritimeExpertise = this.parseMaritimeExpertise(services);

    // Parse optional fields
    const description = this.cleanString(this.getColumnValue(row, 'description'));
    const whatsappNumber = this.cleanPhoneNumber(this.getColumnValue(row, 'whatsappNumber'));
    const visaStatus = this.cleanString(this.getColumnValue(row, 'visaStatus'));
    const companiesWorkedFor = this.cleanString(this.getColumnValue(row, 'companiesWorkedFor'));
    const officialWebsite = this.cleanUrl(this.getColumnValue(row, 'officialWebsite'));
    
    // Parse photo URLs
    const workshopFrontPhoto = this.extractPhotoUrl(this.getColumnValue(row, 'workshopFrontPhoto'));
    const workshopWorkPhoto = this.extractPhotoUrl(this.getColumnValue(row, 'workshopWorkPhoto'));
    const businessCardPhoto = this.extractPhotoUrl(this.getColumnValue(row, 'businessCardPhoto'));

    // Parse pricing information
    const quote8Hours = this.cleanString(this.getColumnValue(row, 'quote8Hours'));
    const perDayAttendanceRate = this.cleanString(this.getColumnValue(row, 'perDayAttendanceRate'));
    const remoteTroubleshootingRate = this.cleanString(this.getColumnValue(row, 'remoteTroubleshootingRate'));

    // Additional fields
    const alternateEmail = this.cleanEmail(this.getColumnValue(row, 'alternateEmail'));
    const bankDetails = this.cleanString(this.getColumnValue(row, 'bankDetails'));

    return {
      fullName,
      email,
      services,
      maritimeExpertise,
      description: description || undefined,
      whatsappNumber: whatsappNumber || undefined,
      homePort,
      visaStatus: visaStatus || undefined,
      companiesWorkedFor: companiesWorkedFor || undefined,
      workshopFrontPhoto: workshopFrontPhoto || undefined,
      workshopWorkPhoto: workshopWorkPhoto || undefined,
      quote8Hours: quote8Hours || undefined,
      perDayAttendanceRate: perDayAttendanceRate || undefined,
      officialWebsite: officialWebsite || undefined,
      remoteTroubleshootingRate: remoteTroubleshootingRate || undefined,
      alternateEmail: alternateEmail || undefined,
      bankDetails: bankDetails || undefined,
      businessCardPhoto: businessCardPhoto || undefined,
      importSource: 'csv',
      isActive: true,
      anonymousMode: true,
      createdAt: new Date()
    };
  }

  /**
   * Get column value from CSV row using the column mapping
   */
  private static getColumnValue(row: CSVRow, mappedKey: string): string {
    // Find the original CSV column name that maps to this key
    const originalColumnName = Object.keys(CSV_COLUMN_MAP).find(
      key => CSV_COLUMN_MAP[key as keyof typeof CSV_COLUMN_MAP] === mappedKey
    );

    if (!originalColumnName) {
      return '';
    }

    return row[originalColumnName] || '';
  }

  /**
   * Parse maritime expertise from services string
   */
  private static parseMaritimeExpertise(services: string): string[] {
    if (!services) return [];

    const expertiseCategories: string[] = [];
    
    // Split by common delimiters and clean
    const serviceItems = services
      .split(/[,/]/)
      .map(item => item.trim())
      .filter(item => item.length > 0);

    // Map service descriptions to expertise categories
    for (const item of serviceItems) {
      // Try exact match first
      if (MARITIME_EXPERTISE_MAP[item as keyof typeof MARITIME_EXPERTISE_MAP]) {
        const category = MARITIME_EXPERTISE_MAP[item as keyof typeof MARITIME_EXPERTISE_MAP];
        if (!expertiseCategories.includes(category)) {
          expertiseCategories.push(category);
        }
        continue;
      }

      // Try partial matches for common variations
      const itemLower = item.toLowerCase();
      if (itemLower.includes('automation') || itemLower.includes('electrical') || itemLower.includes('electronics')) {
        if (!expertiseCategories.includes('automation_electronics')) {
          expertiseCategories.push('automation_electronics');
        }
      } else if (itemLower.includes('hydraulic') || itemLower.includes('pneumatic')) {
        if (!expertiseCategories.includes('hydraulic_pneumatic')) {
          expertiseCategories.push('hydraulic_pneumatic');
        }
      } else if (itemLower.includes('mechanical') || itemLower.includes('repairs') || itemLower.includes('fabrication')) {
        if (!expertiseCategories.includes('mechanical_repairs')) {
          expertiseCategories.push('mechanical_repairs');
        }
      } else if (itemLower.includes('lsa') || itemLower.includes('ffa')) {
        if (!expertiseCategories.includes('lsa_ffa')) {
          expertiseCategories.push('lsa_ffa');
        }
      } else if (itemLower.includes('turbocharger') || itemLower.includes('governor') || itemLower.includes('refrigeration')) {
        if (!expertiseCategories.includes('turbocharger_governor')) {
          expertiseCategories.push('turbocharger_governor');
        }
      } else if (itemLower.includes('ship agency') || itemLower.includes('supplier') || itemLower.includes('chandler')) {
        if (!expertiseCategories.includes('ship_agency_supply')) {
          expertiseCategories.push('ship_agency_supply');
        }
      }
    }

    return expertiseCategories;
  }

  /**
   * Clean and validate string fields
   */
  private static cleanString(value: string): string {
    if (!value) return '';
    return value.trim().replace(/\s+/g, ' ');
  }

  /**
   * Clean and validate email addresses
   */
  private static cleanEmail(value: string): string {
    if (!value) return '';
    const email = value.trim().toLowerCase();
    
    // Remove common prefixes that might be in the data
    const cleanEmail = email.replace(/^(email:\s*|mailto:\s*)/i, '');
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return ''; // Return empty string for invalid emails
    }
    
    return cleanEmail;
  }

  /**
   * Clean phone numbers
   */
  private static cleanPhoneNumber(value: string): string {
    if (!value) return '';
    
    // Remove common prefixes and clean up
    const cleanPhone = value
      .replace(/^(whatsapp:\s*|phone:\s*|tel:\s*)/i, '')
      .replace(/[^\d\+\-\s\(\)]/g, '')
      .trim();
    
    return cleanPhone || '';
  }

  /**
   * Clean and validate URLs
   */
  private static cleanUrl(value: string): string {
    if (!value) return '';
    
    let url = value.trim();
    
    // Add protocol if missing
    if (url && !url.match(/^https?:\/\//i)) {
      url = `https://${url}`;
    }
    
    // Basic URL validation
    try {
      new URL(url);
      return url;
    } catch {
      return ''; // Return empty string for invalid URLs
    }
  }

  /**
   * Extract photo URLs from Google Drive links or other formats
   */
  private static extractPhotoUrl(value: string): string {
    if (!value) return '';
    
    // Handle Google Drive sharing URLs
    if (value.includes('drive.google.com')) {
      const match = value.match(/id=([a-zA-Z0-9-_]+)/);
      if (match) {
        return `https://drive.google.com/uc?id=${match[1]}`;
      }
    }
    
    // Handle other URL formats
    if (value.match(/^https?:\/\//)) {
      return value;
    }
    
    return '';
  }

  /**
   * Simple CSV parser without external dependencies
   */
  private static parseSimpleCSV(csvContent: string): CSVRow[] {
    const lines = csvContent.split('\n').filter(line => line.trim().length > 0);
    if (lines.length < 2) return []; // Need at least header and one data row

    // Parse header row
    const headers = this.parseCsvLine(lines[0]);
    const records: CSVRow[] = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      if (values.length === 0) continue; // Skip empty rows

      const record: CSVRow = {};
      for (let j = 0; j < headers.length; j++) {
        record[headers[j]] = values[j] || '';
      }
      records.push(record);
    }

    return records;
  }

  /**
   * Parse a single CSV line, handling quoted fields and commas
   */
  private static parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Handle escaped quotes
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }
}