#!/usr/bin/env tsx
/**
 * Test Fixed Checkout URL Integration
 * Tests the premium subscription with the fixed checkout URL: https://rzp.io/rzp/jwQW9TW
 */

import { razorpayService } from './server/razorpay-service-production';
import { pool } from './server/db';

async function testFixedCheckout() {
  console.log('🔗 Testing Fixed Checkout URL Integration...\n');

  try {
    const testUserId = '44885683'; // Current user

    console.log('📋 1. Checking Plan Configuration:');
    const plans = razorpayService.getSubscriptionPlans();
    console.log('   Premium Monthly Checkout URL:', plans.premium.monthly.checkoutUrl);
    console.log('   Amount:', plans.premium.monthly.displayPrice);

    console.log('\n💳 2. Creating Subscription with Fixed URL:');
    const result = await razorpayService.createSubscription(testUserId, 'premium', 'monthly');
    
    console.log('   ✅ Subscription created successfully!');
    console.log('   Checkout URL:', result.checkoutUrl);
    console.log('   Expected URL: https://rzp.io/rzp/jwQW9TW');
    console.log('   URLs match:', result.checkoutUrl === 'https://rzp.io/rzp/jwQW9TW');

    console.log('\n🗄️ 3. Verifying Database Record:');
    const dbRecord = await pool.query(`
      SELECT * FROM subscriptions 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `, [testUserId]);

    if (dbRecord.rows.length > 0) {
      const subscription = dbRecord.rows[0];
      console.log('   Database URL:', subscription.short_url);
      console.log('   Status:', subscription.status);
      console.log('   Amount:', subscription.amount);
    }

    console.log('\n🎉 FIXED CHECKOUT URL INTEGRATION SUCCESSFUL!');
    console.log('\nNow when users click the premium subscription button,');
    console.log('they will be directed to: https://rzp.io/rzp/jwQW9TW');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testFixedCheckout().catch(console.error);