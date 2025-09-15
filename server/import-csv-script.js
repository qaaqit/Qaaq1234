import { readFileSync } from 'fs';
import path from 'path';
import { WorkshopCSVImportService } from './workshop-csv-import.js';

async function importCSV() {
  try {
    
    // Read the CSV file content
    const csvPath = path.join(__dirname, '../attached_assets/Marine Repairs Workshop Database (Responses) - Form Responses 1_1757953053527.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');

    console.log('📂 CSV file size:', csvContent.length, 'characters');
    console.log('📂 CSV lines:', csvContent.split('\n').length);
    console.log('📂 First line:', csvContent.split('\n')[0].substring(0, 100) + '...');

    const importService = new WorkshopCSVImportService();
    const adminUserId = 'system-import-admin';

    console.log('🚀 Starting CSV import...');
    const result = await importService.importFromCSV(csvContent, adminUserId);
    
    console.log('✅ Import completed!');
    console.log('📊 Results:', JSON.stringify(result, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

importCSV();