import { db } from './db';
import { sql } from 'drizzle-orm';

// Auto-populate rank groups with users based on their maritime ranks
export async function populateRankGroupsWithUsers() {
  try {
    console.log('Starting auto-population of rank groups...');
    
    // Get all users with maritime ranks
    const usersResult = await db.execute(sql`
      SELECT id, maritime_rank 
      FROM users 
      WHERE maritime_rank IS NOT NULL 
      AND maritime_rank != ''
      AND id NOT LIKE '%test%'
      AND id NOT LIKE '%demo%'
    `);

    console.log(`Found ${usersResult.rows.length} users with rank information`);

    // Rank mapping rules for auto-assignment
    const rankMappings = [
      { keywords: ['tsi', 'technical superintendent', 'superintendent technical'], groupName: 'TSI' },
      { keywords: ['msi', 'marine superintendent', 'superintendent marine'], groupName: 'MSI' },
      { keywords: ['master', 'captain', 'mtr co', 'chief officer'], groupName: 'Mtr CO' },
      { keywords: ['2nd officer', '2/o', '20', '3rd officer', '3/o', '30', 'second officer', 'third officer'], groupName: '20 30' },
      { keywords: ['chief engineer', 'ce', '2nd engineer', '2/e', 'second engineer'], groupName: 'CE 2E' },
      { keywords: ['3rd engineer', '3/e', '4th engineer', '4/e', 'third engineer', 'fourth engineer'], groupName: '3E 4E' },
      { keywords: ['cadet', 'deck cadet', 'engine cadet', 'trainee'], groupName: 'Cadets' },
      { keywords: ['crew', 'seaman', 'bosun', 'fitter', 'wiper', 'cook', 'steward', 'ab', 'ordinary seaman'], groupName: 'Crew' },
      { keywords: ['eto', 'electrical technical officer', 'electrical superintendent', 'electrician', 'electrical officer'], groupName: 'ETO & Elec Supdts' }
    ];

    const assignmentResults = {
      processed: 0,
      assigned: 0,
      errors: 0,
      groupCounts: {} as Record<string, number>
    };

    // Process each user
    for (const user of usersResult.rows) {
      try {
        assignmentResults.processed++;
        
        const userId = user.id as string;
        const userRank = (user.maritime_rank as string)?.toLowerCase() || '';
        
        if (!userRank) {
          console.log(`Skipping user ${userId} - no rank information`);
          continue;
        }

        // Remove user from all existing rank groups first (single group rule)
        await db.execute(sql`
          DELETE FROM rank_group_members WHERE "userId" = ${userId}
        `);

        // Find matching group
        let assignedGroup = null;
        for (const mapping of rankMappings) {
          const matchFound = mapping.keywords.some(keyword => userRank.includes(keyword));
          
          if (matchFound) {
            // Get group ID
            const groupResult = await db.execute(sql`
              SELECT id FROM rank_groups WHERE name = ${mapping.groupName} LIMIT 1
            `);

            if (groupResult.rows.length > 0) {
              const groupId = groupResult.rows[0].id as string;
              
              // Add user to group
              await db.execute(sql`
                INSERT INTO rank_group_members (id, "userId", "groupId", role, "joinedAt", "lastActivity")
                VALUES (
                  gen_random_uuid(), 
                  ${userId}, 
                  ${groupId}, 
                  'member', 
                  CURRENT_TIMESTAMP, 
                  CURRENT_TIMESTAMP
                )
                ON CONFLICT ("userId", "groupId") DO NOTHING
              `);

              assignedGroup = mapping.groupName;
              assignmentResults.assigned++;
              assignmentResults.groupCounts[mapping.groupName] = (assignmentResults.groupCounts[mapping.groupName] || 0) + 1;
              
              console.log(`Assigned user ${userId} (${userRank}) to ${mapping.groupName}`);
            }
            break; // Only assign to first matching group
          }
        }

        // If no specific match, assign to ETO & Elec Supdts as default for maritime personnel
        if (!assignedGroup) {
          const defaultGroupResult = await db.execute(sql`
            SELECT id FROM rank_groups WHERE name = 'ETO & Elec Supdts' LIMIT 1
          `);

          if (defaultGroupResult.rows.length > 0) {
            const groupId = defaultGroupResult.rows[0].id as string;
            
            await db.execute(sql`
              INSERT INTO rank_group_members (id, "userId", "groupId", role, "joinedAt", "lastActivity")
              VALUES (
                gen_random_uuid(), 
                ${userId}, 
                ${groupId}, 
                'member', 
                CURRENT_TIMESTAMP, 
                CURRENT_TIMESTAMP
              )
              ON CONFLICT ("userId", "groupId") DO NOTHING
            `);

            assignmentResults.assigned++;
            assignmentResults.groupCounts['ETO & Elec Supdts'] = (assignmentResults.groupCounts['ETO & Elec Supdts'] || 0) + 1;
            
            console.log(`Assigned user ${userId} (${userRank}) to ETO & Elec Supdts (default)`);
          }
        }

      } catch (error) {
        assignmentResults.errors++;
        console.error(`Error processing user ${user.id}:`, error);
      }
    }

    // Update member counts for all groups
    const groupsResult = await db.execute(sql`SELECT id, name FROM rank_groups`);
    
    for (const group of groupsResult.rows) {
      const memberCountResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM rank_group_members WHERE "groupId" = ${group.id}
      `);
      
      const memberCount = memberCountResult.rows[0]?.count || 0;
      
      await db.execute(sql`
        UPDATE rank_groups 
        SET "memberCount" = ${memberCount}, "updatedAt" = CURRENT_TIMESTAMP 
        WHERE id = ${group.id}
      `);
    }

    console.log('Auto-population completed!');
    console.log('Results:', assignmentResults);

    return {
      success: true,
      message: 'Successfully populated rank groups with users',
      results: assignmentResults
    };

  } catch (error) {
    console.error('Error auto-populating rank groups:', error);
    throw error;
  }
}

// Run the population if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  populateRankGroupsWithUsers()
    .then(result => {
      console.log('Population completed:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Population failed:', error);
      process.exit(1);
    });
}