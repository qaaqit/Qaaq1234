// Test script for CSV import functionality
import { WorkshopCSVParser } from './server/workshop-csv-parser';
import { readFileSync } from 'fs';

async function testCSVImport() {
  console.log('🧪 Testing CSV Import Functionality...');
  
  try {
    // Read the attached CSV file
    const csvFilePath = 'attached_assets/Marine Repairs Workshop Database (Responses) - Form Responses 1 (3)_1758031382970.csv';
    const csvContent = readFileSync(csvFilePath, 'utf-8');
    
    console.log(`📄 Loaded CSV file: ${csvFilePath}`);
    console.log(`📊 File size: ${csvContent.length} characters`);
    
    // Test CSV parsing
    const parseResult = WorkshopCSVParser.parseCSV(csvContent);
    
    console.log('\n📈 Parsing Results:');
    console.log(`  Total rows: ${parseResult.summary.totalRows}`);
    console.log(`  Valid rows: ${parseResult.summary.validRows}`);
    console.log(`  Invalid rows: ${parseResult.summary.invalidRows}`);
    console.log(`  Success rate: ${parseResult.summary.totalRows > 0 ? ((parseResult.summary.validRows / parseResult.summary.totalRows) * 100).toFixed(1) : 0}%`);
    
    if (parseResult.errors.length > 0) {
      console.log('\n⚠️ Errors found:');
      parseResult.errors.slice(0, 5).forEach(error => {
        console.log(`  Row ${error.row}: ${error.error}`);
      });
      if (parseResult.errors.length > 5) {
        console.log(`  ... and ${parseResult.errors.length - 5} more errors`);
      }
    }
    
    if (parseResult.duplicateEmails.length > 0) {
      console.log('\n📧 Duplicate emails found:', parseResult.duplicateEmails);
    }
    
    console.log('\n✅ CSV parsing test completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ CSV import test failed:', error);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testCSVImport();
}