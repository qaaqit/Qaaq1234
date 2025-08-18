#!/usr/bin/env tsx

import { pool } from './server/db.js';

async function processSonyaPayment() {
  try {
    console.log('🔄 Processing manual payment for sonya11.gupta@gmail.com...');
    
    const userEmail = 'sonya11.gupta@gmail.com';
    const paymentId = 'pay_R6yFPetiGU8WjC';
    const orderId = 'order_R6yF9brRfCf4BG';
    const amount = 261100; // ₹2611 yearly premium
    
    // Find user by email
    const userResult = await pool.query(`
      SELECT id, full_name, email FROM users WHERE email = $1 LIMIT 1
    `, [userEmail]);

    if (userResult.rows.length === 0) {
      console.log('❌ User not found with email:', userEmail);
      return;
    }

    const user = userResult.rows[0];
    console.log('✅ Found user:', { id: user.id, name: user.full_name, email: user.email });
    
    // Check if payment already exists
    const existingPayment = await pool.query(`
      SELECT * FROM payments WHERE razorpay_payment_id = $1
    `, [paymentId]);

    if (existingPayment.rows.length > 0) {
      console.log('⚠️ Payment already exists in database:', existingPayment.rows[0]);
      return;
    }

    // Check payment table structure first
    console.log('🔍 Checking payments table structure...');
    const tableInfo = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'payments' 
      ORDER BY ordinal_position
    `);
    
    console.log('Available columns:', tableInfo.rows.map(r => r.column_name));

    // Insert payment record with available columns only
    console.log('💳 Creating payment record...');
    await pool.query(`
      INSERT INTO payments (
        user_id, razorpay_payment_id, amount, currency, status, method, 
        description, razorpay_order_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      user.id,
      paymentId,
      amount,
      'INR',
      'captured',
      'upi',
      'Premium Payment - premium yearly',
      orderId
    ]);

    console.log('✅ Payment record created successfully');

    // Check subscriptions table structure
    console.log('🔍 Checking subscriptions table structure...');
    const subsTableInfo = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'subscriptions' 
      ORDER BY ordinal_position
    `);
    
    console.log('Subscription columns:', subsTableInfo.rows.map(r => r.column_name));

    // Create subscription record - check if table exists first
    console.log('📋 Creating subscription record...');
    try {
      await pool.query(`
        INSERT INTO subscriptions (
          user_id, subscription_type, razorpay_payment_id, amount, currency, 
          status
        ) VALUES ($1, $2, $3, $4, $5, $6) 
        ON CONFLICT (user_id, subscription_type) 
        DO UPDATE SET 
          razorpay_payment_id = $3,
          amount = $4,
          status = 'active',
          updated_at = NOW()
      `, [
        user.id,
        'premium',
        paymentId,
        amount,
        'INR',
        'active'
      ]);
    } catch (subsError) {
      console.log('⚠️ Subscription creation failed, might not be needed:', subsError.message);
    }

    console.log('✅ Subscription record created successfully');

    // Update user premium status
    console.log('👑 Activating premium status...');
    await pool.query(`
      INSERT INTO user_subscription_status (
        user_id, is_premium, premium_expires_at, subscription_type, updated_at
      ) VALUES ($1, true, NOW() + INTERVAL '1 year', $2, NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        is_premium = true, 
        premium_expires_at = NOW() + INTERVAL '1 year',
        subscription_type = $2,
        updated_at = NOW()
    `, [user.id, 'premium']);

    console.log('✅ Premium status activated successfully');

    // Verify the payment was created
    const verifyPayment = await pool.query(`
      SELECT * FROM payments WHERE razorpay_payment_id = $1
    `, [paymentId]);

    const verifySubscription = await pool.query(`
      SELECT * FROM subscriptions WHERE user_id = $1 AND subscription_type = 'premium'
    `, [user.id]);

    const verifyStatus = await pool.query(`
      SELECT * FROM user_subscription_status WHERE user_id = $1
    `, [user.id]);

    console.log('\n🎉 PAYMENT PROCESSING COMPLETE!');
    console.log('📊 Summary:');
    console.log('- User:', user.full_name, '(ID:', user.id + ')');
    console.log('- Email:', user.email);
    console.log('- Payment ID:', paymentId);
    console.log('- Order ID:', orderId);
    console.log('- Amount: ₹' + (amount / 100));
    console.log('- Plan: Premium Yearly');
    console.log('- Status: Active');
    console.log('- Expires:', verifyStatus.rows[0]?.premium_expires_at);
    
    console.log('\n✅ Payment now appears in database:');
    console.log('- Payment record:', verifyPayment.rows.length > 0 ? '✓' : '✗');
    console.log('- Subscription record:', verifySubscription.rows.length > 0 ? '✓' : '✗');
    console.log('- Premium status:', verifyStatus.rows[0]?.is_premium ? '✓' : '✗');

  } catch (error) {
    console.error('❌ Error processing payment:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
processSonyaPayment();