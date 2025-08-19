#!/usr/bin/env node

import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function processManualPayment(email, paymentId, planType = 'premium', billingPeriod = 'monthly') {
  try {
    console.log(`🔧 Manual payment processing: ${email} - Payment ID: ${paymentId}`);

    // Find user by email
    const userResult = await pool.query(`
      SELECT id, full_name, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1
    `, [email]);

    if (userResult.rows.length === 0) {
      console.error('❌ User not found with the provided email');
      return { success: false, message: 'User not found' };
    }

    const user = userResult.rows[0];
    const userId = user.id;

    console.log(`👤 Found user: ${user.full_name} (${user.email}) - ID: ${userId}`);

    // Create a manual subscription record
    const subscriptionId = `manual_${userId}_${Date.now()}`;
    const amount = billingPeriod === 'yearly' ? 261100 : 45100; // ₹2611 or ₹451 in paise
    
    await pool.query(`
      INSERT INTO subscriptions (
        user_id, subscription_type, razorpay_subscription_id, razorpay_plan_id, 
        status, amount, currency, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      userId,
      planType,
      subscriptionId,
      billingPeriod === 'yearly' ? 'plan_premium_yearly' : 'plan_R6tDNXxZMxBIJR',
      'active',
      amount,
      'INR',
      JSON.stringify({ 
        manual_processing: true,
        payment_id: paymentId,
        processed_by: 'admin_script',
        billing_period: billingPeriod,
        user_email: email,
        processing_date: new Date().toISOString()
      })
    ]);

    console.log('✅ Subscription record created');

    // Create payment record
    await pool.query(`
      INSERT INTO payments (
        user_id, razorpay_payment_id, amount, currency, status, method, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      userId,
      paymentId,
      amount,
      'INR',
      'captured',
      'manual',
      'Manually processed premium subscription payment'
    ]);

    console.log('✅ Payment record created');

    // Update user premium status
    const expiryInterval = billingPeriod === 'yearly' ? '1 year' : '1 month';
    await pool.query(`
      INSERT INTO user_subscription_status (
        user_id, is_premium, premium_expires_at, subscription_type
      ) VALUES ($1, true, NOW() + INTERVAL '${expiryInterval}', $2)
      ON CONFLICT (user_id) DO UPDATE SET
        is_premium = true,
        premium_expires_at = NOW() + INTERVAL '${expiryInterval}',
        subscription_type = $2,
        updated_at = NOW()
    `, [userId, planType]);

    console.log('✅ User premium status updated');

    // Verify the update
    const statusResult = await pool.query(`
      SELECT is_premium, premium_expires_at, subscription_type 
      FROM user_subscription_status WHERE user_id = $1
    `, [userId]);

    console.log(`✅ Manual payment processed successfully: ${email} - Payment ID: ${paymentId}`);
    console.log(`🎯 Premium Status:`, statusResult.rows[0]);

    return {
      success: true,
      message: `Premium subscription activated for ${user.full_name} (${email})`,
      user: {
        id: userId,
        name: user.full_name,
        email: user.email
      },
      subscription: {
        type: planType,
        billingPeriod: billingPeriod,
        expiryInterval: expiryInterval
      },
      status: statusResult.rows[0]
    };
  } catch (error) {
    console.error('❌ Error processing manual payment:', error);
    return { success: false, message: error.message };
  }
}

// Process the specific payment mentioned by the user
async function main() {
  const email = 'workship.ai@gmail.com';
  const paymentId = 'R71G8cKB3xWq4g';
  
  console.log('🚀 Starting manual payment processing...');
  const result = await processManualPayment(email, paymentId, 'premium', 'monthly');
  
  if (result.success) {
    console.log('🎉 SUCCESS:', result.message);
  } else {
    console.log('💥 FAILED:', result.message);
  }
  
  await pool.end();
}

// Run the script
main().catch(console.error);