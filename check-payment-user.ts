#!/usr/bin/env tsx

// Check if user exists for the payment contact number
import { RazorpayService } from './server/razorpay-service-production.js';

async function checkPaymentUser() {
  try {
    console.log('🔍 Checking for user with payment details...');
    
    const razorpayService = RazorpayService.getInstance();
    await razorpayService.ensureInitialized();
    
    // Search for user by phone number
    const pool = razorpayService['pool'];
    
    const phoneSearch = await pool.query(`
      SELECT id, name, email, phone 
      FROM users 
      WHERE phone LIKE '%8973297600%' OR phone LIKE '%+91 8973 297600%'
      LIMIT 5
    `);
    
    console.log('📱 Users found by phone:', phoneSearch.rows);
    
    // Search for any users with similar email pattern
    const emailSearch = await pool.query(`
      SELECT id, name, email, phone 
      FROM users 
      WHERE email LIKE '%rajesh%' OR email LIKE '%okicici%' OR email LIKE '%void@razorpay.com%'
      LIMIT 5
    `);
    
    console.log('📧 Users found by email pattern:', emailSearch.rows);
    
    // Check if payment exists in our records
    const paymentSearch = await pool.query(`
      SELECT * FROM payments 
      WHERE razorpay_payment_id = 'pay_R6yeWtx4jUG6dS'
    `);
    
    console.log('💳 Payment record found:', paymentSearch.rows);
    
    // Check webhook activity in logs
    console.log('🔗 This payment should trigger webhook with customer email void@razorpay.com');
    
    return {
      phoneUsers: phoneSearch.rows,
      emailUsers: emailSearch.rows,
      paymentRecord: paymentSearch.rows[0] || null
    };
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    return null;
  }
}

checkPaymentUser().then((result) => {
  if (result) {
    console.log('📊 Search complete');
  }
  process.exit(0);
});