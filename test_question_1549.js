// Test script to diagnose question 1549 issue
import { getQuestionById } from './server/questions-service.js';

async function testQuestion1549() {
  console.log('🔍 Testing question 1549...');
  
  try {
    const question = await getQuestionById(1549);
    
    if (question) {
      console.log('✅ Question 1549 found:', {
        id: question.id,
        content: question.content.substring(0, 100) + '...',
        author_id: question.author_id,
        author_name: question.author_name,
        is_resolved: question.is_resolved,
        created_at: question.created_at
      });
    } else {
      console.log('❌ Question 1549 not found or hidden/archived');
    }
  } catch (error) {
    console.error('🚨 Error testing question 1549:', error);
  }
  
  // Also test a working question for comparison
  console.log('\n🔍 Testing question 1300 for comparison...');
  try {
    const question = await getQuestionById(1300);
    
    if (question) {
      console.log('✅ Question 1300 found:', {
        id: question.id,
        content: question.content.substring(0, 100) + '...',
        author_id: question.author_id,
        author_name: question.author_name,
        is_resolved: question.is_resolved,
        created_at: question.created_at
      });
    } else {
      console.log('❌ Question 1300 not found or hidden/archived');
    }
  } catch (error) {
    console.error('🚨 Error testing question 1300:', error);
  }
}

testQuestion1549();