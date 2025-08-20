#!/usr/bin/env tsx

// Manually process the payment for the user who made it
import { RazorpayService } from './server/razorpay-service-production.js';

async function processManualPayment() {
  try {
    console.log('🔧 Processing payment manually for phone +91 8973 297600...');
    
    const razorpayService = RazorpayService.getInstance();
    await razorpayService.ensureInitialized();
    
    const pool = razorpayService['pool'];
    
    // First, find user by phone number
    const phoneSearch = await pool.query(`
      SELECT id, name, email, phone 
      FROM users 
      WHERE phone LIKE '%8973297600%' OR phone LIKE '%+91 8973 297600%' OR phone = '+918973297600'
      LIMIT 5
    `);
    
    console.log('📱 Users found by phone:', phoneSearch.rows);
    
    if (phoneSearch.rows.length === 0) {
      console.log('❌ No user found with phone +91 8973 297600');
      console.log('💡 This payment might be from a user with a different phone number or not yet registered');
      
      // Check if there's any payment record already
      const paymentCheck = await pool.query(`
        SELECT p.*, u.name, u.email, u.phone 
        FROM payments p 
        LEFT JOIN users u ON p.user_id = u.id 
        WHERE p.razorpay_payment_id = 'pay_R6yeWtx4jUG6dS'
      `);
      
      console.log('💳 Existing payment record:', paymentCheck.rows);
      return;
    }
    
    const user = phoneSearch.rows[0];
    console.log(`✅ Found user: ${user.name} (ID: ${user.id}, Email: ${user.email})`);
    
    // Simulate payment object with user's actual email
    const paymentData = {
      id: 'pay_R6yeWtx4jUG6dS',
      amount: 45100, // ₹451 in paise
      currency: 'INR',
      status: 'captured',
      method: 'upi',
      email: user.email, // Use actual user email instead of void@razorpay.com
      contact: '+91 8973 297600',
      description: 'Premium Payment - premium monthly'
    };
    
    console.log('🔄 Processing payment with corrected email...');
    await razorpayService.handlePaymentCaptured(paymentData);
    
    console.log('✅ Payment processed - checking premium status...');
    const status = await razorpayService.checkUserPremiumStatus(user.id);
    console.log('📊 Premium status:', status);
    
    if (status.isPremium) {
      console.log('🎉 SUCCESS: User now has premium status!');
    } else {
      console.log('⚠️ Status still shows free - checking logs for errors');
    }
    
    return {
      user: user,
      status: status,
      success: status.isPremium
    };
    
  } catch (error) {
    console.error('❌ Manual processing failed:', error);
    return null;
  }
}

processManualPayment().then((result) => {
  if (result && result.success) {
    console.log(`✅ Payment successfully linked to ${result.user.name}`);
  } else {
    console.log('❌ Payment processing failed or user not found');
  }
  process.exit(result?.success ? 0 : 1);
});