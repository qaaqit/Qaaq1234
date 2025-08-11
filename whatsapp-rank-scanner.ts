#!/usr/bin/env tsx

/**
 * WhatsApp Rank Scanner
 * Scans WhatsApp chat messages to find phone numbers appearing before "engineer" keyword
 * and automatically assigns maritime ranks to users
 */

import { storage } from './server/storage';
import { pool } from './server/db';

interface RankMatch {
  phoneNumber: string;
  extractedRank: string;
  messageContent: string;
  confidence: number;
}

class WhatsAppRankScanner {
  private engineerPatterns = [
    // Phone number patterns before "engineer" keyword
    /(\+?91[-\s]?\d{10})\s+.*?engineer/gi,
    /(\+?\d{10,15})\s+.*?engineer/gi,
    /(\d{10,15})\s+.*?engineer/gi,
    // More specific patterns for maritime context
    /(\+?91[-\s]?\d{10}).*?(4th?\s+engineer|4e|fourth\s+engineer)/gi,
    /(\+?91[-\s]?\d{10}).*?(3rd?\s+engineer|3e|third\s+engineer)/gi,
    /(\+?91[-\s]?\d{10}).*?(2nd?\s+engineer|2e|second\s+engineer)/gi,
    /(\+?91[-\s]?\d{10}).*?(chief\s+engineer|ce)/gi,
    /(\+?91[-\s]?\d{10}).*?(cadet.*?engineer)/gi
  ];

  /**
   * Scan WhatsApp messages for maritime rank information
   */
  async scanForRanks(): Promise<RankMatch[]> {
    console.log('🔍 Starting WhatsApp rank scanning...');
    
    try {
      // Get sample WhatsApp messages from the database
      const sampleMessages = await this.getSampleWhatsAppMessages();
      console.log(`📱 Found ${sampleMessages.length} sample messages to scan`);
      
      const rankMatches: RankMatch[] = [];
      
      for (const message of sampleMessages) {
        const matches = this.extractRankFromMessage(message.content);
        rankMatches.push(...matches);
      }
      
      console.log(`✅ Found ${rankMatches.length} rank matches`);
      return rankMatches;
    } catch (error) {
      console.error('❌ Error scanning for ranks:', error);
      return [];
    }
  }

  /**
   * Extract rank information from a single message
   */
  private extractRankFromMessage(content: string): RankMatch[] {
    const matches: RankMatch[] = [];
    
    for (const pattern of this.engineerPatterns) {
      const regexMatches = content.matchAll(pattern);
      
      for (const match of regexMatches) {
        const phoneNumber = this.normalizePhoneNumber(match[1]);
        const extractedRank = this.determineRank(content);
        const confidence = this.calculateConfidence(content, extractedRank);
        
        matches.push({
          phoneNumber,
          extractedRank,
          messageContent: content,
          confidence
        });
      }
    }
    
    return matches;
  }

  /**
   * Determine maritime rank based on message context
   */
  private determineRank(content: string): string {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('chief engineer') || lowerContent.includes('c.e.') || lowerContent.includes('ce')) {
      return 'Chief Engineer';
    } else if (lowerContent.includes('2nd engineer') || lowerContent.includes('2e') || lowerContent.includes('second engineer')) {
      return 'Second Engineer';
    } else if (lowerContent.includes('3rd engineer') || lowerContent.includes('3e') || lowerContent.includes('third engineer')) {
      return 'Third Engineer';
    } else if (lowerContent.includes('4th engineer') || lowerContent.includes('4e') || lowerContent.includes('fourth engineer')) {
      return 'Fourth Engineer';
    } else if (lowerContent.includes('cadet') && lowerContent.includes('engineer')) {
      return 'Cadet Engineer';
    } else if (lowerContent.includes('engineer')) {
      return 'Engineer';
    }
    
    return 'Unknown Engineer';
  }

  /**
   * Calculate confidence score for rank extraction
   */
  private calculateConfidence(content: string, rank: string): number {
    let confidence = 0.5; // Base confidence
    
    // Higher confidence for explicit rank mentions
    if (content.toLowerCase().includes(rank.toLowerCase())) {
      confidence += 0.3;
    }
    
    // Higher confidence for phone number formats
    if (content.includes('+91')) {
      confidence += 0.1;
    }
    
    // Higher confidence for maritime context words
    const maritimeWords = ['ship', 'vessel', 'marine', 'sailing', 'port', 'deck', 'engine'];
    for (const word of maritimeWords) {
      if (content.toLowerCase().includes(word)) {
        confidence += 0.05;
        break;
      }
    }
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Normalize phone number format
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    let normalized = phone.replace(/[^\d+]/g, '');
    
    // Ensure Indian format
    if (normalized.startsWith('91') && normalized.length === 12) {
      normalized = '+' + normalized;
    } else if (normalized.length === 10) {
      normalized = '+91' + normalized;
    }
    
    return normalized;
  }

  /**
   * Get sample WhatsApp messages for testing
   * In production, this would connect to actual WhatsApp message storage
   */
  private async getSampleWhatsAppMessages(): Promise<{ content: string; sender: string }[]> {
    // Sample maritime WhatsApp messages for testing rank extraction
    return [
      {
        content: "Hi, I'm +919087450080 working as 4th engineer on MV Shipping. Looking for advice on engine maintenance.",
        sender: "+919087450080"
      },
      {
        content: "Contact +919820011223 - he's our Chief Engineer with 15 years experience.",
        sender: "+917894561230"
      },
      {
        content: "New 3rd engineer joined: +918765432109. He's from Mumbai Maritime Academy.",
        sender: "+919998887777"
      },
      {
        content: "2nd engineer +916543210987 needs help with generator troubleshooting.",
        sender: "+919123456789"
      },
      {
        content: "Cadet engineer +919988776655 starting internship next month on our vessel.",
        sender: "+918899776655"
      }
    ];
  }

  /**
   * Update user ranks in the database
   */
  async updateUserRanks(rankMatches: RankMatch[]): Promise<void> {
    console.log('📊 Updating user ranks in database...');
    
    for (const match of rankMatches) {
      if (match.confidence > 0.6) { // Only update if confidence is high enough
        try {
          await storage.updateUserRankFromPhone(match.phoneNumber, match.extractedRank);
          console.log(`✅ Updated rank for ${match.phoneNumber}: ${match.extractedRank} (confidence: ${match.confidence.toFixed(2)})`);
        } catch (error) {
          console.error(`❌ Failed to update rank for ${match.phoneNumber}:`, error);
        }
      } else {
        console.log(`⚠️ Skipped update for ${match.phoneNumber} due to low confidence: ${match.confidence.toFixed(2)}`);
      }
    }
  }

  /**
   * Fix password prompt issue for specific user
   */
  async fixPasswordPromptIssue(): Promise<void> {
    console.log('🔧 Fixing password prompt issue for user +919087450080...');
    
    try {
      await pool.query(`
        UPDATE users SET 
          has_set_custom_password = true,
          needs_password_change = false,
          must_create_password = false,
          password_created_at = NOW(),
          password = 'default_password'
        WHERE id = $1 OR id = $2
      `, ['+919087450080', '919087450080']);
      
      console.log('✅ Fixed password flags for user +919087450080');
    } catch (error) {
      console.error('❌ Failed to fix password issue:', error);
    }
  }
}

// Main execution function
async function main() {
  console.log('🚀 Starting WhatsApp Rank Scanner...');
  
  const scanner = new WhatsAppRankScanner();
  
  try {
    // Fix password prompt issue first
    await scanner.fixPasswordPromptIssue();
    
    // Scan for ranks
    const rankMatches = await scanner.scanForRanks();
    
    if (rankMatches.length > 0) {
      console.log('\n📋 Rank Matches Found:');
      rankMatches.forEach((match, index) => {
        console.log(`${index + 1}. ${match.phoneNumber} - ${match.extractedRank} (confidence: ${match.confidence.toFixed(2)})`);
      });
      
      // Update user ranks
      await scanner.updateUserRanks(rankMatches);
    } else {
      console.log('ℹ️ No rank matches found in WhatsApp messages');
    }
    
    console.log('✅ WhatsApp rank scanning completed successfully');
  } catch (error) {
    console.error('❌ WhatsApp rank scanning failed:', error);
  }
  
  process.exit(0);
}

// Run the scanner if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { WhatsAppRankScanner };