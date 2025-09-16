#!/usr/bin/env tsx

/**
 * Import Workshop Data from CSV
 * This script imports all workshop data from the attached CSV file
 */

import { db } from "./server/db";
import { workshopProfiles } from "@shared/schema";
import { eq } from "drizzle-orm";
import { promises as fs } from 'fs';
import path from 'path';

// Maritime Expertise Mapping from CSV services to our standard categories
const MARITIME_EXPERTISE_MAP = {
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
  'manufacturing and assembling stainless accessories and products needed by ships, sailboats and motor yachts': 'marine_manufacturing'
} as const;

// CSV Column mapping - exact headers from CSV file
const CSV_COLUMN_MAP = {
  'Timestamp': 'timestamp',
  '2.  Contact person Name (First Name, Last Name, Designation)': 'fullName',
  '3a. Primary Email': 'email',
  '4. Wshop Expertise services': 'services',
  '4.  Briefly describe area of your workshop\'s all expertise, number of staff & year of establishment.': 'description',
  '3b. WhatsApp / WeChat/  Phone (with country code)': 'whatsappNumber',
  '6a. Port where your branch is located? (Write only one city prefrably with suburb/ pincode). Multiple city entry will get rejected.': 'homePort',
  '7. Service Engineer Visa status': 'visaStatus',
  '8. Companies worked for  (in last 1 year):': 'companiesWorkedFor',
  '5a. Photo of  W/shop front with name/ logo.': 'workshopFrontPhoto',
  '5b. Photo of work (without name, contact details or website)': 'workPhoto',
  'Quote for 8 hour attendance of Service Engineer?': 'quote8Hours',
  '10. Kindly quote best tariff, for per day attendance of Service Engineer? (in USD). For outstation works, travel visa and stay will be arranged separately, by ship manager.': 'perDayAttendanceRate',
  '9. Your workshop\'s official website': 'officialWebsite',
  '11. Remote troubleshooting service? Guidance via Google meet/ Zoom. Kindly quote best tariff /hour session.': 'remoteTroubleshootingRate',
  'Email Address': 'alternateEmail',
  'Workshop Bank Details': 'bankDetails',
  'Business Card': 'businessCardPhoto'
} as const;

interface CSVRow {
  [key: string]: string;
}

class WorkshopImporter {
  
  private parseCSV(csvContent: string): CSVRow[] {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must contain at least a header row and one data row');
    }

    const headers = this.parseCSVLine(lines[0]);
    const rows: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const row: CSVRow = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      rows.push(row);
    }

    return rows;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];

      if (char === '"' && (i === 0 || line[i - 1] === ',')) {
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // Skip the next quote
        } else {
          inQuotes = false;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
      i++;
    }

    result.push(current.trim());
    return result;
  }

  private cleanEmail(email: string): string {
    return email.toLowerCase().trim().replace(/[,;]/g, '');
  }

  private cleanPort(port: string): string {
    return port.trim().replace(/[,/]/g, ' ').replace(/\s+/g, ' ');
  }

  private cleanWebsite(website: string): string {
    let cleaned = website.trim();
    if (cleaned && !cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      cleaned = 'https://' + cleaned;
    }
    return cleaned;
  }

  private mapExpertiseToCategories(services: string): string[] {
    if (!services) return [];
    
    const categories = new Set<string>();
    
    // Split by comma and clean each service
    const serviceList = services.split(',').map(s => s.trim());
    
    for (const service of serviceList) {
      // Find exact matches first
      const exactMatch = MARITIME_EXPERTISE_MAP[service as keyof typeof MARITIME_EXPERTISE_MAP];
      if (exactMatch) {
        categories.add(exactMatch);
        continue;
      }
      
      // Try partial matches for complex categories
      if (service.includes('Automation') || service.includes('Radio Survey') || service.includes('Electrical Electronics')) {
        categories.add('automation_electronics');
      }
      if (service.includes('Hydraulic') || service.includes('Pneumatic')) {
        categories.add('hydraulic_pneumatic');
      }
      if (service.includes('Mechanical') || service.includes('Repairs') || service.includes('Fabrication') || service.includes('Combustion')) {
        categories.add('mechanical_repairs');
      }
      if (service.includes('LSA') || service.includes('FFA')) {
        categories.add('lsa_ffa');
      }
      if (service.includes('Turbocharger') || service.includes('Governor') || service.includes('Refrigeration') || service.includes('UTM') || service.includes('UWILD')) {
        categories.add('turbocharger_governor');
      }
      if (service.includes('Ship Agency') || service.includes('Store Supplier') || service.includes('Ship chandler') || service.includes('Crewing')) {
        categories.add('ship_agency_supply');
      }
      if (service.includes('Main Engine') || service.includes('Propulsion')) {
        categories.add('main_engine_propulsion');
      }
      if (service.includes('Aux Engine') || service.includes('Power generation')) {
        categories.add('aux_engine_power');
      }
    }
    
    return Array.from(categories);
  }

  private generateDisplayId(homePort: string, workshopNumber: number): string {
    if (!homePort) return `w${workshopNumber}`;
    
    // Clean and extract city name
    const cityMatch = homePort.match(/([a-zA-Z]+)/);
    const city = cityMatch ? cityMatch[1] : 'Unknown';
    
    return `w${city}${workshopNumber}`;
  }

  async importWorkshops(): Promise<void> {
    try {
      console.log('🚢 Starting workshop import from CSV...');
      
      // Read the CSV file
      const csvPath = path.join(process.cwd(), 'attached_assets', 'Marine Repairs Workshop Database (Responses) - Form Responses 1 (3)_1758031382970.csv');
      const csvContent = await fs.readFile(csvPath, 'utf-8');
      
      console.log('📁 CSV file read successfully');
      
      // Parse CSV
      const rows = this.parseCSV(csvContent);
      console.log(`📊 Parsed ${rows.length} workshop records from CSV`);
      
      let imported = 0;
      let updated = 0;
      let skipped = 0;

      for (const row of rows) {
        try {
          // Extract and clean data using exact column names
          const email = this.cleanEmail(row['3a. Primary Email'] || '');
          const fullName = (row['2.  Contact person Name (First Name, Last Name, Designation)'] || '').trim();
          const services = row['4. Wshop Expertise services'] || '';
          const homePort = this.cleanPort(row['6a. Port where your branch is located? (Write only one city prefrably with suburb/ pincode). Multiple city entry will get rejected.'] || '');
          
          if (!email || !fullName || !homePort) {
            console.log(`⚠️ Skipping workshop - missing required fields: ${fullName || 'no name'}`);
            skipped++;
            continue;
          }
          
          // Map services to maritime expertise categories
          const maritimeExpertise = this.mapExpertiseToCategories(services);
          
          // Check if workshop already exists
          const existingWorkshop = await db.select().from(workshopProfiles)
            .where(eq(workshopProfiles.email, email))
            .limit(1);
          
          if (existingWorkshop.length > 0) {
            // Update existing workshop
            await db.update(workshopProfiles)
              .set({
                fullName,
                services,
                maritimeExpertise,
                whatsappNumber: row['3b. WhatsApp / WeChat/  Phone (with country code)'] || null,
                homePort,
                description: row['4.  Briefly describe area of your workshop\'s all expertise, number of staff & year of establishment.'] || null,
                visaStatus: row['7. Service Engineer Visa status'] || null,
                companiesWorkedFor: row['8. Companies worked for  (in last 1 year):'] || null,
                workshopFrontPhoto: row['5a. Photo of  W/shop front with name/ logo.'] || null,
                workPhoto: row['5b. Photo of work (without name, contact details or website)'] || null,
                perDayAttendanceRate: row['10. Kindly quote best tariff, for per day attendance of Service Engineer? (in USD). For outstation works, travel visa and stay will be arranged separately, by ship manager.'] || null,
                officialWebsite: this.cleanWebsite(row['9. Your workshop\'s official website'] || ''),
                remoteTroubleshootingRate: row['11. Remote troubleshooting service? Guidance via Google meet/ Zoom. Kindly quote best tariff /hour session.'] || null,
                businessCardPhoto: row['Business Card'] || null,
                isActive: true,
                importSource: 'csv_import',
                lastSyncAt: new Date(),
                updatedAt: new Date()
              })
              .where(eq(workshopProfiles.id, existingWorkshop[0].id));
              
            console.log(`🔄 Updated workshop: ${fullName} (${email})`);
            updated++;
          } else {
            // Insert new workshop
            const newWorkshop = await db.insert(workshopProfiles).values({
              fullName,
              email,
              services,
              maritimeExpertise,
              whatsappNumber: row['3b. WhatsApp / WeChat/  Phone (with country code)'] || null,
              homePort,
              description: row['4.  Briefly describe area of your workshop\'s all expertise, number of staff & year of establishment.'] || null,
              visaStatus: row['7. Service Engineer Visa status'] || null,
              companiesWorkedFor: row['8. Companies worked for  (in last 1 year):'] || null,
              workshopFrontPhoto: row['5a. Photo of  W/shop front with name/ logo.'] || null,
              workPhoto: row['5b. Photo of work (without name, contact details or website)'] || null,
              perDayAttendanceRate: row['10. Kindly quote best tariff, for per day attendance of Service Engineer? (in USD). For outstation works, travel visa and stay will be arranged separately, by ship manager.'] || null,
              officialWebsite: this.cleanWebsite(row['9. Your workshop\'s official website'] || ''),
              remoteTroubleshootingRate: row['11. Remote troubleshooting service? Guidance via Google meet/ Zoom. Kindly quote best tariff /hour session.'] || null,
              businessCardPhoto: row['Business Card'] || null,
              isActive: true,
              isVerified: false,
              importSource: 'csv_import',
              lastSyncAt: new Date()
            }).returning();
            
            // Generate display ID based on port and workshop number
            if (newWorkshop[0]) {
              const displayId = this.generateDisplayId(homePort, newWorkshop[0].workshopNumber);
              await db.update(workshopProfiles)
                .set({ displayId })
                .where(eq(workshopProfiles.id, newWorkshop[0].id));
            }
            
            console.log(`✅ Imported workshop: ${fullName} (${email}) - ${maritimeExpertise.length} expertise categories`);
            imported++;
          }
          
        } catch (error) {
          console.error(`❌ Error processing workshop ${row['2.  Contact person Name (First Name, Last Name, Designation)'] || 'unknown'}:`, error);
          skipped++;
        }
      }
      
      console.log('\n📊 Import Summary:');
      console.log(`✅ Imported: ${imported} new workshops`);
      console.log(`🔄 Updated: ${updated} existing workshops`);
      console.log(`⚠️ Skipped: ${skipped} workshops`);
      console.log(`📋 Total processed: ${rows.length} records`);
      
      // Show final count
      const totalWorkshops = await db.select().from(workshopProfiles);
      console.log(`\n🚢 Total workshops in database: ${totalWorkshops.length}`);
      
    } catch (error) {
      console.error('💥 Error during workshop import:', error);
      throw error;
    }
  }
}

async function main() {
  console.log('🚢 Workshop CSV Import Tool');
  console.log('===========================');
  
  const importer = new WorkshopImporter();
  await importer.importWorkshops();
  
  console.log('✅ Workshop import completed successfully!');
  process.exit(0);
}

// Run the importer
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Import failed:', error);
    process.exit(1);
  });
}

export { WorkshopImporter };