import { initializeRankGroups } from './rank-groups-service';
import { bulkAssignUsersToRankGroups } from './bulk-assign-users';

async function initializeAndPopulate() {
  try {
    console.log('=== INITIALIZING MARITIME RANK GROUPS ===');
    
    // Step 1: Initialize rank groups
    console.log('Step 1: Creating rank group tables and inserting groups...');
    const initResult = await initializeRankGroups();
    console.log('✅ Initialization result:', initResult.message);
    
    // Step 2: Populate groups with users
    console.log('\nStep 2: Assigning users to groups based on maritime ranks...');
    const populateResult = await bulkAssignUsersToRankGroups();
    console.log('✅ Population result:', populateResult.message);
    
    console.log('\n=== COMPLETE SETUP FINISHED ===');
    console.log('Maritime rank groups are now ready for use!');
    
    return {
      success: true,
      message: 'Maritime rank groups initialized and populated successfully',
      details: {
        initialization: initResult,
        population: populateResult
      }
    };
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeAndPopulate()
    .then(result => {
      console.log('\n🎉 Setup completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Setup failed:', error.message);
      process.exit(1);
    });
}

export { initializeAndPopulate };