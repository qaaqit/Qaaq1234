import { db } from './db';
import { sql } from 'drizzle-orm';
import { autoAssignUserToRankGroups } from './rank-groups-service';

// Bulk assign users to rank groups based on their maritime ranks
export async function bulkAssignUsersToRankGroups() {
  try {
    console.log('Starting bulk assignment of users to rank groups...');
    
    // Get all users with valid IDs (phone numbers starting with +)
    const usersResult = await db.execute(sql`
      SELECT id 
      FROM users 
      WHERE id LIKE '+%'
      AND id NOT LIKE '%test%'
      AND id NOT LIKE '%demo%'
      ORDER BY id
    `);

    console.log(`Found ${usersResult.rows.length} valid users`);

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process users in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < usersResult.rows.length; i += batchSize) {
      const batch = usersResult.rows.slice(i, i + batchSize);
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1} (users ${i + 1} to ${Math.min(i + batchSize, usersResult.rows.length)})`);
      
      for (const user of batch) {
        try {
          results.processed++;
          const userId = user.id as string;
          
          console.log(`Assigning user ${userId}...`);
          const result = await autoAssignUserToRankGroups(userId);
          
          if (result.success) {
            results.successful++;
            console.log(`✅ ${userId}: ${result.message}`);
          } else {
            results.failed++;
            results.errors.push(`${userId}: ${result.message}`);
            console.log(`❌ ${userId}: ${result.message}`);
          }
        } catch (error) {
          results.failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push(`${user.id}: ${errorMsg}`);
          console.error(`❌ Error processing user ${user.id}:`, errorMsg);
        }
      }
      
      // Small delay between batches to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n=== BULK ASSIGNMENT COMPLETED ===');
    console.log(`Total processed: ${results.processed}`);
    console.log(`Successful: ${results.successful}`);
    console.log(`Failed: ${results.failed}`);
    
    if (results.errors.length > 0) {
      console.log('\nErrors:');
      results.errors.forEach(error => console.log(`- ${error}`));
    }

    return {
      success: true,
      message: 'Bulk assignment completed',
      results
    };

  } catch (error) {
    console.error('Error in bulk assignment:', error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  bulkAssignUsersToRankGroups()
    .then(result => {
      console.log('\nBulk assignment completed:', result.message);
      process.exit(0);
    })
    .catch(error => {
      console.error('Bulk assignment failed:', error.message);
      process.exit(1);
    });
}