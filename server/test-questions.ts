import { getQuestions, searchQuestions } from "./questions-service";

async function testQuestionsService() {
  console.log('Testing questions service...');
  
  try {
    // Test getQuestions
    const result = await getQuestions(1, 5);
    console.log(`\nTotal questions in database: ${result.total}`);
    console.log(`Questions in this page: ${result.questions.length}`);
    console.log(`Has more pages: ${result.hasMore}`);
    
    if (result.questions.length > 0) {
      console.log('\nFirst question:');
      const q = result.questions[0];
      console.log(`- ID: ${q.id}`);
      console.log(`- Content: ${q.content?.substring(0, 100) || 'N/A'}...`);
      console.log(`- Author: ${q.author_name} (${q.author_rank || 'No rank'})`);
      console.log(`- Created: ${q.created_at}`);
      console.log(`- Answers: ${q.answer_count}`);
      console.log(`- Resolved: ${q.is_resolved}`);
    }
    
    // Test search
    console.log('\n\nTesting search for "engine"...');
    const searchResult = await searchQuestions('engine', 1, 5);
    console.log(`Found ${searchResult.total} questions matching "engine"`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testQuestionsService();