import { db } from "./db";
import { workshopProfiles } from "@shared/schema";
import { eq, isNull, or, and, ilike, isNotNull, ne, sql } from "drizzle-orm";

interface WorkshopForBackfill {
  id: string;
  homePort: string;
  workshopNumber: number;
  displayId: string | null;
}

export class WorkshopDisplayIdBackfillService {
  /**
   * Clean port name for display ID generation (matching CSV import logic)
   */
  private cleanPortName(port: string): string {
    if (!port || port.trim() === '') {
      return 'Unknown';
    }
    
    return port
      .split(',')[0] // Take first part if comma-separated
      .split('-')[0] // Take first part if dash-separated
      .replace(/\s+/g, '') // Remove spaces
      .replace(/[^a-zA-Z]/g, '') // Keep only letters
      .substring(0, 20) // Limit length
      .toLowerCase()
      .replace(/^./, (str) => str.toUpperCase()) || 'Unknown'; // Capitalize first letter
  }

  /**
   * Generate deterministic display ID for a port and sequence number
   */
  private generateDisplayId(cleanedPort: string, sequenceNumber: number): string {
    return `w${cleanedPort}${sequenceNumber}`;
  }

  /**
   * Get workshops that need display ID assignment
   */
  private async getWorkshopsNeedingDisplayId(): Promise<WorkshopForBackfill[]> {
    console.log('📋 Fetching workshops needing display ID assignment...');
    
    const workshops = await db
      .select({
        id: workshopProfiles.id,
        homePort: workshopProfiles.homePort,
        workshopNumber: workshopProfiles.workshopNumber,
        displayId: workshopProfiles.displayId,
      })
      .from(workshopProfiles)
      .where(
        and(
          eq(workshopProfiles.isActive, true),
          or(
            isNull(workshopProfiles.displayId),
            eq(workshopProfiles.displayId, '')
          )
        )
      )
      .orderBy(workshopProfiles.workshopNumber); // Stable ordering for deterministic assignment
    
    console.log(`📋 Found ${workshops.length} workshops needing display IDs`);
    return workshops;
  }

  /**
   * Get next available sequence number for a port
   */
  private async getNextSequenceForPort(cleanedPort: string): Promise<number> {
    const pattern = `w${cleanedPort}%`;
    
    const existingIds = await db
      .select({ displayId: workshopProfiles.displayId })
      .from(workshopProfiles)
      .where(
        and(
          eq(workshopProfiles.isActive, true),
          ilike(workshopProfiles.displayId, pattern)
        )
      );

    // Extract numeric suffixes and find max
    let maxSequence = 0;
    for (const row of existingIds) {
      if (row.displayId) {
        const match = row.displayId.match(/^w[A-Za-z]+(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxSequence) {
            maxSequence = num;
          }
        }
      }
    }
    
    return maxSequence + 1;
  }

  /**
   * Backfill display IDs for all workshops
   */
  public async backfillDisplayIds(): Promise<{
    success: boolean;
    processed: number;
    errors: string[];
  }> {
    console.log('🏗️ Starting workshop display ID backfill process...');
    
    const errors: string[] = [];
    let processed = 0;
    
    try {
      const workshops = await this.getWorkshopsNeedingDisplayId();
      
      if (workshops.length === 0) {
        console.log('✅ No workshops need display ID assignment');
        return { success: true, processed: 0, errors: [] };
      }

      // Group workshops by port for deterministic sequencing
      const workshopsByPort = new Map<string, WorkshopForBackfill[]>();
      
      for (const workshop of workshops) {
        const cleanedPort = this.cleanPortName(workshop.homePort);
        if (!workshopsByPort.has(cleanedPort)) {
          workshopsByPort.set(cleanedPort, []);
        }
        workshopsByPort.get(cleanedPort)!.push(workshop);
      }

      console.log(`🌍 Processing workshops across ${workshopsByPort.size} ports`);

      // Process each port group
      for (const [cleanedPort, portWorkshops] of Array.from(workshopsByPort.entries())) {
        console.log(`🏗️ Processing ${portWorkshops.length} workshops in ${cleanedPort}...`);
        
        // Get starting sequence for this port
        let nextSequence = await this.getNextSequenceForPort(cleanedPort);
        
        // Assign display IDs in workshop_number order
        for (const workshop of portWorkshops) {
          try {
            const displayId = this.generateDisplayId(cleanedPort, nextSequence);
            
            await db
              .update(workshopProfiles)
              .set({ displayId })
              .where(eq(workshopProfiles.id, workshop.id));
            
            console.log(`✅ Assigned ${displayId} to workshop ${workshop.workshopNumber} in ${cleanedPort}`);
            processed++;
            nextSequence++;
            
          } catch (error) {
            const errorMsg = `Failed to assign display ID to workshop ${workshop.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            console.error(`❌ ${errorMsg}`);
            errors.push(errorMsg);
          }
        }
      }

      console.log(`🎉 Backfill complete! Processed ${processed} workshops across ${workshopsByPort.size} ports`);
      
      return {
        success: errors.length === 0,
        processed,
        errors
      };

    } catch (error) {
      const errorMsg = `Backfill process failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`❌ ${errorMsg}`);
      errors.push(errorMsg);
      
      return {
        success: false,
        processed,
        errors
      };
    }
  }

  /**
   * Verify display ID assignments
   */
  public async verifyDisplayIds(): Promise<{
    total: number;
    assigned: number;
    unassigned: number;
    sampleIds: string[];
  }> {
    const totalWorkshops = await db
      .select({ count: sql<number>`count(*)` })
      .from(workshopProfiles)
      .where(eq(workshopProfiles.isActive, true));

    const assignedWorkshops = await db
      .select({ count: sql<number>`count(*)` })
      .from(workshopProfiles)
      .where(
        and(
          eq(workshopProfiles.isActive, true),
          isNotNull(workshopProfiles.displayId),
          ne(workshopProfiles.displayId, '')
        )
      );

    const sampleDisplayIds = await db
      .select({ displayId: workshopProfiles.displayId })
      .from(workshopProfiles)
      .where(
        and(
          eq(workshopProfiles.isActive, true),
          isNotNull(workshopProfiles.displayId)
        )
      )
      .limit(10);

    const total = totalWorkshops[0]?.count || 0;
    const assigned = assignedWorkshops[0]?.count || 0;
    
    return {
      total,
      assigned,
      unassigned: total - assigned,
      sampleIds: sampleDisplayIds.map(w => w.displayId || '').filter(Boolean)
    };
  }
}