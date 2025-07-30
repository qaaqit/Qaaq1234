import { getQAAQUserMetrics, getUserQuestions } from './server/qa-service';

async function testQAAQIntegration() {
  try {
    console.log('🧪 Testing QAAQ integration...\n');
    
    // Test getting user metrics
    console.log('1. Fetching QAAQ user metrics:');
    const metrics = await getQAAQUserMetrics();
    console.log(`   Found ${metrics.length} users with question metrics`);
    
    // Show top 5 users with questions
    const topUsers = metrics.filter(m => m.totalQuestions > 0).slice(0, 5);
    console.log('\n   Top users with questions:');
    for (const user of topUsers) {
      console.log(`   • ${user.fullName}: ${user.totalQuestions} questions (${user.whatsappQuestions} WhatsApp, ${user.webQuestions} Web)`);
    }
    
    // Test generating questions for a specific user
    if (topUsers.length > 0) {
      const testUser = topUsers[0];
      console.log(`\n2. Testing question generation for: ${testUser.fullName}`);
      
      const questions = await getUserQuestions(testUser.userId, testUser.fullName);
      console.log(`   Generated ${questions.length} questions based on QAAQ metrics`);
      
      if (questions.length > 0) {
        console.log('\n   Sample questions:');
        for (const q of questions.slice(0, 3)) {
          console.log(`   • ${q.category}: ${q.question}`);
        }
      }
    }
    
    console.log('\n✅ QAAQ integration test completed successfully!');
    
  } catch (error) {
    console.error('❌ QAAQ integration test failed:', error);
  }
}

testQAAQIntegration();