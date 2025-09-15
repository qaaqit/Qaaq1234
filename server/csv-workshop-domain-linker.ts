import { db } from "./db";
import { workshopProfiles } from "@shared/schema";
import { eq, and, isNotNull, like, ilike } from "drizzle-orm";
import { promises as fs } from 'fs';
import path from 'path';

interface DomainMatchResult {
  csvDomain: string;
  workshopId: string | null;
  workshopDisplayId: string | null;
  matchedBy: 'exact_domain' | 'email_domain' | 'company_name' | 'none';
  confidence: number;
  workshopName?: string;
  existingWebsite?: string;
}

interface LinkingResult {
  success: boolean;
  processed: number;
  matched: number;
  updated: number;
  skipped: number;
  errors: string[];
  matches: DomainMatchResult[];
}

export class CSVWorkshopDomainLinker {
  
  /**
   * Normalize domain from various formats to consistent format
   */
  private normalizeDomain(url: string): string | null {
    if (!url || !url.trim()) return null;
    
    try {
      let cleanUrl = url.trim().toLowerCase();
      
      // Remove protocol
      cleanUrl = cleanUrl.replace(/^https?:\/\//, '');
      
      // Remove www prefix
      cleanUrl = cleanUrl.replace(/^www\./, '');
      
      // Remove trailing slash and paths
      cleanUrl = cleanUrl.split('/')[0];
      
      // Remove port numbers
      cleanUrl = cleanUrl.split(':')[0];
      
      // Validate domain format
      if (!cleanUrl.includes('.') || cleanUrl.length < 4) {
        return null;
      }
      
      return cleanUrl;
      
    } catch (error) {
      console.error(`Error normalizing domain ${url}:`, error);
      return null;
    }
  }

  /**
   * Extract domain from email address
   */
  private extractEmailDomain(email: string): string | null {
    if (!email || !email.includes('@')) return null;
    
    const domain = email.split('@')[1];
    return this.normalizeDomain(domain);
  }

  /**
   * Parse CSV content to extract workshop data with domains
   */
  private parseCSVForDomains(csvContent: string): Array<{
    contactName: string;
    email: string;
    domain: string;
    competency: string;
    port: string;
  }> {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = this.parseCSVLine(lines[0]);
    const workshops: Array<{
      contactName: string;
      email: string;
      domain: string;
      competency: string;
      port: string;
    }> = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = this.parseCSVLine(lines[i]);
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        const email = row['2. Primary Email'] || row['primary_email'] || row['email'] || '';
        const website = row['Your workshop\'s official website'] || row['website'] || '';
        const contactName = row['1.  Contact person Name'] || row['contact_name'] || row['name'] || '';
        const competency = row['3. Wshop Competency / Expertise  (Please select only 1)'] || row['competency'] || '';
        const port = row['6. City where your workshop\'s main branch is located?'] || row['port'] || row['location'] || '';

        if (email && email.includes('@')) {
          const domain = this.normalizeDomain(website) || this.extractEmailDomain(email);
          if (domain) {
            workshops.push({
              contactName,
              email,
              domain,
              competency,
              port
            });
          }
        }
      } catch (error) {
        console.error(`Error parsing CSV row ${i + 1}:`, error);
      }
    }

    return workshops;
  }

  /**
   * Parse CSV line handling quoted fields
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
          current += '"';
          i += 2;
        } else {
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    values.push(current.trim());
    return values;
  }

  /**
   * Find matching workshop in database by domain
   */
  private async findWorkshopMatch(csvData: {
    contactName: string;
    email: string;
    domain: string;
    competency: string;
    port: string;
  }): Promise<DomainMatchResult> {
    
    // Strategy 1: Exact domain match in official_website field
    try {
      const exactDomainMatch = await db
        .select({
          id: workshopProfiles.id,
          displayId: workshopProfiles.displayId,
          fullName: workshopProfiles.fullName,
          officialWebsite: workshopProfiles.officialWebsite
        })
        .from(workshopProfiles)
        .where(
          and(
            eq(workshopProfiles.isActive, true),
            isNotNull(workshopProfiles.officialWebsite),
            ilike(workshopProfiles.officialWebsite, `%${csvData.domain}%`)
          )
        )
        .limit(1);

      if (exactDomainMatch.length > 0) {
        const match = exactDomainMatch[0];
        return {
          csvDomain: csvData.domain,
          workshopId: match.id,
          workshopDisplayId: match.displayId,
          workshopName: match.fullName,
          existingWebsite: match.officialWebsite,
          matchedBy: 'exact_domain',
          confidence: 0.95
        };
      }
    } catch (error) {
      console.error('Error in exact domain matching:', error);
    }

    // Strategy 2: Email domain match (email domain matches csv domain)
    try {
      const emailDomainMatch = await db
        .select({
          id: workshopProfiles.id,
          displayId: workshopProfiles.displayId,
          fullName: workshopProfiles.fullName,
          officialWebsite: workshopProfiles.officialWebsite,
          email: workshopProfiles.email
        })
        .from(workshopProfiles)
        .where(
          and(
            eq(workshopProfiles.isActive, true),
            isNotNull(workshopProfiles.email),
            ilike(workshopProfiles.email, `%@${csvData.domain}`)
          )
        )
        .limit(1);

      if (emailDomainMatch.length > 0) {
        const match = emailDomainMatch[0];
        return {
          csvDomain: csvData.domain,
          workshopId: match.id,
          workshopDisplayId: match.displayId,
          workshopName: match.fullName,
          existingWebsite: match.officialWebsite,
          matchedBy: 'email_domain',
          confidence: 0.85
        };
      }
    } catch (error) {
      console.error('Error in email domain matching:', error);
    }

    // Strategy 3: Company name/contact name fuzzy match
    try {
      if (csvData.contactName && csvData.contactName.length > 3) {
        const nameTokens = csvData.contactName.toLowerCase().split(/\s+/).filter(token => token.length > 2);
        
        if (nameTokens.length > 0) {
          // Try to match on the longest name token
          const longestToken = nameTokens.reduce((a, b) => a.length > b.length ? a : b);
          
          const nameMatch = await db
            .select({
              id: workshopProfiles.id,
              displayId: workshopProfiles.displayId,
              fullName: workshopProfiles.fullName,
              officialWebsite: workshopProfiles.officialWebsite
            })
            .from(workshopProfiles)
            .where(
              and(
                eq(workshopProfiles.isActive, true),
                ilike(workshopProfiles.fullName, `%${longestToken}%`)
              )
            )
            .limit(1);

          if (nameMatch.length > 0) {
            const match = nameMatch[0];
            return {
              csvDomain: csvData.domain,
              workshopId: match.id,
              workshopDisplayId: match.displayId,
              workshopName: match.fullName,
              existingWebsite: match.officialWebsite,
              matchedBy: 'company_name',
              confidence: 0.60
            };
          }
        }
      }
    } catch (error) {
      console.error('Error in company name matching:', error);
    }

    // No match found
    return {
      csvDomain: csvData.domain,
      workshopId: null,
      workshopDisplayId: null,
      matchedBy: 'none',
      confidence: 0
    };
  }

  /**
   * Update workshop with official website from CSV
   */
  private async updateWorkshopWebsite(workshopId: string, domain: string): Promise<boolean> {
    try {
      const httpsUrl = `https://${domain}`;
      
      await db
        .update(workshopProfiles)
        .set({
          officialWebsite: httpsUrl,
          updatedAt: new Date()
        })
        .where(eq(workshopProfiles.id, workshopId));

      console.log(`✅ Updated workshop ${workshopId} with website: ${httpsUrl}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to update workshop ${workshopId}:`, error);
      return false;
    }
  }

  /**
   * Process CSV file and link domains to workshops
   */
  async linkDomainsFromCSV(csvContent: string): Promise<LinkingResult> {
    const result: LinkingResult = {
      success: false,
      processed: 0,
      matched: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      matches: []
    };

    try {
      console.log('🔗 Starting CSV domain linking process...');
      
      // Parse CSV for workshop data with domains
      const csvWorkshops = this.parseCSVForDomains(csvContent);
      result.processed = csvWorkshops.length;
      
      console.log(`📋 Parsed ${csvWorkshops.length} workshops from CSV`);

      // Process each workshop
      for (const csvWorkshop of csvWorkshops) {
        try {
          console.log(`🔍 Processing: ${csvWorkshop.contactName} (${csvWorkshop.domain})`);
          
          // Find matching workshop in database
          const matchResult = await this.findWorkshopMatch(csvWorkshop);
          result.matches.push(matchResult);

          if (matchResult.workshopId) {
            result.matched++;
            
            // Only update if we don't already have a website or if this is a high-confidence match
            const shouldUpdate = !matchResult.existingWebsite || 
                               matchResult.confidence > 0.8 ||
                               matchResult.matchedBy === 'exact_domain';

            if (shouldUpdate) {
              const updateSuccess = await this.updateWorkshopWebsite(
                matchResult.workshopId, 
                csvWorkshop.domain
              );
              
              if (updateSuccess) {
                result.updated++;
                console.log(`✅ Linked ${csvWorkshop.domain} → ${matchResult.workshopDisplayId} (${matchResult.matchedBy})`);
              } else {
                result.errors.push(`Failed to update workshop ${matchResult.workshopDisplayId}`);
              }
            } else {
              result.skipped++;
              console.log(`⏭️  Skipped ${csvWorkshop.domain} → ${matchResult.workshopDisplayId} (already has website: ${matchResult.existingWebsite})`);
            }
          } else {
            console.log(`❌ No match found for: ${csvWorkshop.contactName} (${csvWorkshop.domain})`);
          }
          
        } catch (error) {
          const errorMsg = `Error processing ${csvWorkshop.contactName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      result.success = result.matched > 0;
      
      console.log(`🎯 Domain linking completed:`);
      console.log(`   📊 Processed: ${result.processed}`);
      console.log(`   ✅ Matched: ${result.matched}`);
      console.log(`   🔄 Updated: ${result.updated}`);
      console.log(`   ⏭️  Skipped: ${result.skipped}`);
      console.log(`   ❌ Errors: ${result.errors.length}`);

    } catch (error) {
      const errorMsg = `CSV domain linking failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMsg);
      console.error(errorMsg);
    }

    return result;
  }

  /**
   * Generate verification report showing matched vs unmatched domains
   */
  async generateVerificationReport(linkingResult: LinkingResult): Promise<string> {
    const report = [];
    
    report.push('# CSV-to-Database Domain Linking Verification Report');
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push('');
    
    // Summary statistics
    report.push('## Summary Statistics');
    report.push(`- **Total Processed**: ${linkingResult.processed}`);
    report.push(`- **Successfully Matched**: ${linkingResult.matched} (${((linkingResult.matched / linkingResult.processed) * 100).toFixed(1)}%)`);
    report.push(`- **Database Records Updated**: ${linkingResult.updated}`);
    report.push(`- **Skipped (Already Had Website)**: ${linkingResult.skipped}`);
    report.push(`- **Unmatched**: ${linkingResult.processed - linkingResult.matched} (${(((linkingResult.processed - linkingResult.matched) / linkingResult.processed) * 100).toFixed(1)}%)`);
    report.push(`- **Errors**: ${linkingResult.errors.length}`);
    report.push('');
    
    // Successful matches by strategy
    const matchesByStrategy = linkingResult.matches.reduce((acc, match) => {
      if (match.matchedBy !== 'none') {
        acc[match.matchedBy] = (acc[match.matchedBy] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    report.push('## Matches by Strategy');
    Object.entries(matchesByStrategy).forEach(([strategy, count]) => {
      report.push(`- **${strategy}**: ${count} matches`);
    });
    report.push('');
    
    // Successful matches detail
    const successfulMatches = linkingResult.matches.filter(m => m.workshopId);
    if (successfulMatches.length > 0) {
      report.push('## ✅ Successfully Matched Domains');
      report.push('| CSV Domain | Workshop ID | Workshop Name | Match Strategy | Confidence | Existing Website |');
      report.push('|------------|-------------|---------------|----------------|------------|------------------|');
      
      successfulMatches.forEach(match => {
        report.push(`| ${match.csvDomain} | ${match.workshopDisplayId || 'N/A'} | ${match.workshopName || 'N/A'} | ${match.matchedBy} | ${(match.confidence * 100).toFixed(0)}% | ${match.existingWebsite || 'None'} |`);
      });
      report.push('');
    }
    
    // Unmatched domains
    const unmatchedDomains = linkingResult.matches.filter(m => !m.workshopId);
    if (unmatchedDomains.length > 0) {
      report.push('## ❌ Unmatched Domains');
      report.push('These domains from the CSV could not be linked to existing workshop records:');
      report.push('');
      unmatchedDomains.forEach(match => {
        report.push(`- **${match.csvDomain}**`);
      });
      report.push('');
      
      report.push('### Recommendations for Unmatched Domains:');
      report.push('1. Manually review these domains to see if they represent new workshops that should be added');
      report.push('2. Check if workshop names in CSV differ significantly from database records');
      report.push('3. Consider if these are duplicate workshops with different contact information');
      report.push('');
    }
    
    // Errors
    if (linkingResult.errors.length > 0) {
      report.push('## ⚠️ Errors Encountered');
      linkingResult.errors.forEach(error => {
        report.push(`- ${error}`);
      });
      report.push('');
    }
    
    return report.join('\n');
  }

  /**
   * Link domains from file
   */
  async linkDomainsFromFile(filePath: string): Promise<LinkingResult> {
    try {
      const csvContent = await fs.readFile(filePath, 'utf-8');
      return await this.linkDomainsFromCSV(csvContent);
    } catch (error) {
      return {
        success: false,
        processed: 0,
        matched: 0,
        updated: 0,
        skipped: 0,
        errors: [`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`],
        matches: []
      };
    }
  }
}

export const csvWorkshopDomainLinker = new CSVWorkshopDomainLinker();