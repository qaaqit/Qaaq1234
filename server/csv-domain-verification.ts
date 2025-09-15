#!/usr/bin/env tsx

/**
 * CSV Domain Linking Verification Script
 * 
 * This script demonstrates the CSV-to-database linking functionality
 * and generates a verification report showing matched vs unmatched domains.
 * 
 * Usage:
 *   npm run verify-csv-domains [csv-file-path]
 *   
 * If no file path is provided, it uses the attached CSV file.
 */

import { csvWorkshopDomainLinker } from './csv-workshop-domain-linker';
import { promises as fs } from 'fs';
import path from 'path';

async function main() {
  console.log('🔗 CSV Domain Linking Verification Script');
  console.log('==========================================');
  
  // Determine CSV file path
  const csvFilePath = process.argv[2] || path.join(process.cwd(), 'attached_assets', 'Marine Repairs Workshop Database.csv');
  
  console.log(`📁 Using CSV file: ${csvFilePath}`);
  
  try {
    // Check if file exists
    await fs.access(csvFilePath);
    console.log('✅ CSV file found');
    
    // Perform domain linking
    console.log('\n🔄 Starting domain linking process...');
    const linkingResult = await csvWorkshopDomainLinker.linkDomainsFromFile(csvFilePath);
    
    console.log('\n📊 Linking Results:');
    console.log('==================');
    console.log(`✅ Success: ${linkingResult.success}`);
    console.log(`📋 Processed: ${linkingResult.processed} workshops`);
    console.log(`🎯 Matched: ${linkingResult.matched} workshops`);
    console.log(`🔄 Updated: ${linkingResult.updated} database records`);
    console.log(`⏭️ Skipped: ${linkingResult.skipped} (already had websites)`);
    console.log(`❌ Errors: ${linkingResult.errors.length}`);
    
    if (linkingResult.errors.length > 0) {
      console.log('\n⚠️ Errors encountered:');
      linkingResult.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    // Generate and save verification report
    console.log('\n📝 Generating verification report...');
    const report = await csvWorkshopDomainLinker.generateVerificationReport(linkingResult);
    
    const reportPath = path.join(process.cwd(), 'csv-domain-linking-report.md');
    await fs.writeFile(reportPath, report);
    
    console.log(`✅ Verification report saved: ${reportPath}`);
    
    // Show sample successful matches
    const successfulMatches = linkingResult.matches.filter(m => m.workshopId);
    if (successfulMatches.length > 0) {
      console.log('\n🎯 Sample Successful Matches:');
      console.log('============================');
      successfulMatches.slice(0, 5).forEach(match => {
        console.log(`  ${match.csvDomain} → ${match.workshopDisplayId} (${match.matchedBy}, ${(match.confidence * 100).toFixed(0)}% confidence)`);
      });
      
      if (successfulMatches.length > 5) {
        console.log(`  ... and ${successfulMatches.length - 5} more (see full report)`);
      }
    }
    
    // Show sample unmatched domains
    const unmatchedDomains = linkingResult.matches.filter(m => !m.workshopId);
    if (unmatchedDomains.length > 0) {
      console.log('\n❌ Sample Unmatched Domains:');
      console.log('===========================');
      unmatchedDomains.slice(0, 5).forEach(match => {
        console.log(`  ${match.csvDomain} (no database match found)`);
      });
      
      if (unmatchedDomains.length > 5) {
        console.log(`  ... and ${unmatchedDomains.length - 5} more (see full report)`);
      }
    }
    
    console.log('\n✅ Verification completed successfully!');
    console.log(`📋 Full details available in: ${reportPath}`);
    
    if (linkingResult.matched > 0) {
      console.log('\n🎉 CSV-to-database linking is working correctly!');
      console.log('   Website domains from CSV have been successfully linked to workshop database records.');
    } else {
      console.log('\n⚠️  No matches found. This might indicate:');
      console.log('   - CSV data format has changed');
      console.log('   - Workshop database records use different naming conventions');
      console.log('   - New workshops in CSV that don\'t exist in database yet');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

// Run verification if this script is executed directly  
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

export { main as runVerification };