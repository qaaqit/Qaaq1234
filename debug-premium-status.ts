import { pool } from './server/db.js';

async function debugPremiumStatus() {
  try {
    console.log('🔍 DEBUGGING PREMIUM STATUS FOR CCR KING');
    console.log('=========================================\n');

    const userId = '45016180';
    
    // 1. Check user_subscription_status table
    console.log('1️⃣ CHECKING user_subscription_status TABLE');
    console.log('--------------------------------------------');
    
    const statusResult = await pool.query(`
      SELECT 
        user_id,
        is_premium,
        premium_expires_at,
        subscription_type,
        created_at,
        updated_at
      FROM user_subscription_status 
      WHERE user_id = $1
    `, [userId]);

    if (statusResult.rows.length > 0) {
      const status = statusResult.rows[0];
      console.log('✅ Found premium status record:');
      console.log(`   User ID: ${status.user_id}`);
      console.log(`   Is Premium: ${status.is_premium}`);
      console.log(`   Expires: ${status.premium_expires_at}`);
      console.log(`   Type: ${status.subscription_type}`);
      console.log(`   Created: ${status.created_at}`);
      console.log(`   Updated: ${status.updated_at}`);
      
      const now = new Date();
      const isPremiumValid = status.is_premium && 
        (!status.premium_expires_at || new Date(status.premium_expires_at) > now);
      console.log(`   Valid Premium: ${isPremiumValid ? '✅ YES' : '❌ NO'}`);
    } else {
      console.log('❌ No premium status record found');
    }

    // 2. Check subscriptions table
    console.log('\n2️⃣ CHECKING subscriptions TABLE');
    console.log('--------------------------------');
    
    const subscriptionResult = await pool.query(`
      SELECT 
        user_id,
        subscription_type,
        status,
        created_at
      FROM subscriptions 
      WHERE user_id = $1 AND status = 'active'
      ORDER BY created_at DESC
    `, [userId]);

    console.log(`Found ${subscriptionResult.rows.length} active subscriptions:`);
    subscriptionResult.rows.forEach((sub, index) => {
      console.log(`   ${index + 1}. Type: ${sub.subscription_type}, Status: ${sub.status}, Created: ${sub.created_at}`);
    });

    // 3. Test the actual API endpoint
    console.log('\n3️⃣ TESTING PREMIUM STATUS API');
    console.log('------------------------------');
    
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`http://localhost:5000/api/user/subscription-status?userId=${userId}`);
    const apiData = await response.json();
    
    console.log(`API Response Status: ${response.status}`);
    console.log('API Response:', apiData);

    // 4. Check the exact SQL query used in razorpay service
    console.log('\n4️⃣ TESTING RAZORPAY SERVICE QUERY');
    console.log('----------------------------------');
    
    const razorpayQuery = await pool.query(`
      SELECT 
        is_premium,
        premium_expires_at,
        subscription_type
      FROM user_subscription_status 
      WHERE user_id = $1
    `, [userId]);

    if (razorpayQuery.rows.length > 0) {
      const status = razorpayQuery.rows[0];
      const now = new Date();
      const isPremiumValid = status.is_premium && 
        (!status.premium_expires_at || new Date(status.premium_expires_at) > now);
      
      console.log('Razorpay Service Query Result:');
      console.log(`   Is Premium: ${status.is_premium}`);
      console.log(`   Expires: ${status.premium_expires_at}`);
      console.log(`   Type: ${status.subscription_type}`);
      console.log(`   Computed Premium Valid: ${isPremiumValid}`);
    } else {
      console.log('❌ Razorpay service query returned no results');
    }

  } catch (error) {
    console.error('❌ Error debugging premium status:', error);
  }
}

// Run the debug
debugPremiumStatus();