import { robustAuth } from './auth-system';
import { db } from './db';

async function testAuthenticationScenarios() {
  console.log('🧪 Testing Robust Authentication System\n');
  
  const testCases = [
    {
      name: 'Chiru Login',
      userId: '+919035283755',
      password: '1234koihai',
      expectation: 'Single account, successful login'
    },
    {
      name: 'Admin Login',
      userId: 'mushy.piyush@gmail.com',
      password: '1234koihai',
      expectation: 'Admin account, successful login'
    },
    {
      name: 'Phone Variation Test',
      userId: '919035283755',
      password: '1234koihai',
      expectation: 'Should match +919035283755'
    },
    {
      name: 'Email Variation Test',
      userId: 'pg97@rediffmail.com',
      password: '1234koihai',
      expectation: 'Should find Chiru by email'
    },
    {
      name: 'Invalid Credentials',
      userId: 'nonexistent@user.com',
      password: 'wrongpassword',
      expectation: 'Authentication failure'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log(`   Input: ${testCase.userId} / ${testCase.password}`);
    console.log(`   Expected: ${testCase.expectation}`);
    
    try {
      const result = await robustAuth.authenticateUser(testCase.userId, testCase.password);
      
      if (result.success) {
        console.log(`   ✅ Success: ${result.user?.fullName} (${result.user?.id})`);
        console.log(`   🔑 Token generated: ${result.token?.substring(0, 20)}...`);
      } else if (result.requiresMerge) {
        console.log(`   🔀 Merge Required: ${result.duplicateAccounts?.length} accounts found`);
        result.duplicateAccounts?.forEach((acc, i) => {
          console.log(`      ${i + 1}. ${acc.fullName} - Completeness: ${acc.completeness}%`);
        });
      } else {
        console.log(`   ❌ Failed: Authentication unsuccessful`);
      }
    } catch (error) {
      console.log(`   💥 Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

async function testDuplicateDetection() {
  console.log('\n\n🔍 Testing Duplicate Detection System\n');
  
  // Test phone number variations
  const phoneVariations = ['+919035283755', '919035283755', '9035283755'];
  
  for (const phone of phoneVariations) {
    console.log(`📞 Testing phone: ${phone}`);
    try {
      const result = await robustAuth.authenticateUser(phone, '1234koihai');
      if (result.success) {
        console.log(`   ✅ Matched user: ${result.user?.fullName}`);
      } else if (result.requiresMerge) {
        console.log(`   🔀 ${result.duplicateAccounts?.length} duplicates found`);
      } else {
        console.log(`   ❌ No match found`);
      }
    } catch (error) {
      console.log(`   💥 Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

async function testDatabaseHealth() {
  console.log('\n\n🏥 Database Health Check\n');
  
  try {
    // Check user count
    const userCount = await db.execute('SELECT COUNT(*) as count FROM users');
    console.log(`👥 Total users in database: ${userCount.rows[0].count}`);
    
    // Check Chiru specifically
    const chiruCheck = await db.execute('SELECT * FROM users WHERE id = $1', ['+919035283755']);
    if (chiruCheck.rows.length > 0) {
      const chiru = chiruCheck.rows[0];
      console.log(`✅ Chiru found:`);
      console.log(`   Name: ${chiru.fullName}`);
      console.log(`   Email: ${chiru.email}`);
      console.log(`   Questions: ${chiru.questionCount}`);
      console.log(`   Rank: ${chiru.maritimeRank}`);
    } else {
      console.log(`❌ Chiru not found in database`);
    }
    
    // Check for potential duplicates
    const duplicateCheck = await db.execute(`
      SELECT id, "fullName", email, "questionCount", "answerCount"
      FROM users 
      WHERE id LIKE '%919035283755%' 
         OR email LIKE '%pg97%' 
         OR "fullName" ILIKE '%chiru%'
    `);
    
    console.log(`🔍 Potential Chiru duplicates: ${duplicateCheck.rows.length}`);
    duplicateCheck.rows.forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.id} - ${row.fullName} (Q:${row.questionCount}, A:${row.answerCount})`);
    });
    
  } catch (error) {
    console.log(`💥 Database health check failed: ${error}`);
  }
}

// Main test runner
async function runAllTests() {
  try {
    await testDatabaseHealth();
    await testAuthenticationScenarios();
    await testDuplicateDetection();
    console.log('\n🎉 All tests completed!');
  } catch (error) {
    console.error('Test suite failed:', error);
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

export { testAuthenticationScenarios, testDuplicateDetection, testDatabaseHealth, runAllTests };