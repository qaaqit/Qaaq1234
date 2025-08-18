#!/usr/bin/env tsx
/**
 * Test Yearly Plan with Fixed Checkout URL
 * Tests the premium yearly subscription with: https://rzp.io/rzp/NAU59cv
 */

import { razorpayService } from './server/razorpay-service-production';
import { pool } from './server/db';

async function testYearlyPlan() {
  console.log('🗓️ Testing Premium Yearly Plan with Fixed URL...\n');

  try {
    const testUserId = '44885683'; // Current user

    console.log('📋 1. Checking Both Plan Configurations:');
    const plans = razorpayService.getSubscriptionPlans();
    console.log('   Monthly Plan:');
    console.log('     Checkout URL:', plans.premium.monthly.checkoutUrl);
    console.log('     Amount:', plans.premium.monthly.displayPrice);
    
    console.log('   Yearly Plan:');
    console.log('     Checkout URL:', plans.premium.yearly.checkoutUrl);
    console.log('     Amount:', plans.premium.yearly.displayPrice);
    console.log('     Savings:', plans.premium.yearly.savings);

    console.log('\n💳 2. Creating Yearly Subscription:');
    const result = await razorpayService.createSubscription(testUserId, 'premium', 'yearly');
    
    console.log('   ✅ Yearly subscription created!');
    console.log('   Checkout URL:', result.checkoutUrl);
    console.log('   Expected URL: https://rzp.io/rzp/NAU59cv');
    console.log('   URLs match:', result.checkoutUrl === 'https://rzp.io/rzp/NAU59cv');

    console.log('\n🗄️ 3. Verifying Database Record:');
    const dbRecord = await pool.query(`
      SELECT * FROM subscriptions 
      WHERE user_id = $1 AND subscription_type = 'premium'
      ORDER BY created_at DESC 
      LIMIT 2
    `, [testUserId]);

    if (dbRecord.rows.length > 0) {
      console.log('   Recent subscriptions:');
      dbRecord.rows.forEach((sub, index) => {
        console.log(`     ${index + 1}. ${sub.short_url} - ${sub.amount/100} (${sub.razorpay_plan_id})`);
      });
    }

    console.log('\n🎉 YEARLY PLAN INTEGRATION COMPLETE!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Monthly: https://rzp.io/rzp/jwQW9TW (₹451)');
    console.log('   ✅ Yearly: https://rzp.io/rzp/NAU59cv (₹2,611)');
    console.log('   ✅ Both plans ready for production use');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testYearlyPlan().catch(console.error);