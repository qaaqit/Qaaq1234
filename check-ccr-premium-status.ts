import { pool } from './server/db.js';

async function checkCCRPremiumStatus() {
  try {
    console.log('🔍 Checking CCR KING premium status...');
    
    // Check user's current premium status and payment records
    const result = await pool.query(`
      SELECT 
        u.id,
        u.full_name,
        u.email,
        uss.is_premium,
        uss.premium_expires_at,
        uss.subscription_type,
        uss.created_at as status_created,
        uss.updated_at as status_updated
      FROM users u
      LEFT JOIN user_subscription_status uss ON u.id = uss.user_id
      WHERE u.email = $1
    `, ['workship.ai@gmail.com']);

    if (result.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = result.rows[0];
    console.log('👤 User Found:', user.full_name, '(', user.email, ')');
    console.log('🆔 User ID:', user.id);
    
    if (user.is_premium) {
      console.log('✅ PREMIUM STATUS: ACTIVE');
      console.log('⏰ Expires:', user.premium_expires_at);
      console.log('📦 Subscription Type:', user.subscription_type);
      console.log('📅 Status Created:', user.status_created);
      console.log('🔄 Status Updated:', user.status_updated);
    } else {
      console.log('❌ PREMIUM STATUS: INACTIVE');
    }

    // Check payment records for this user
    console.log('\n🔍 Checking payment records...');
    const paymentResult = await pool.query(`
      SELECT 
        razorpay_payment_id,
        amount,
        status,
        captured_at,
        created_at
      FROM payments 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `, [user.id]);

    console.log(`💳 Found ${paymentResult.rows.length} payment records:`);
    paymentResult.rows.forEach((payment, index) => {
      console.log(`  ${index + 1}. Payment ID: ${payment.razorpay_payment_id}`);
      console.log(`     Amount: ₹${payment.amount}`);
      console.log(`     Status: ${payment.status}`);
      console.log(`     Captured: ${payment.captured_at}`);
      console.log(`     Created: ${payment.created_at}`);
      console.log('');
    });

    // Check subscription records
    console.log('🔍 Checking subscription records...');
    const subscriptionResult = await pool.query(`
      SELECT 
        razorpay_subscription_id,
        razorpay_payment_id,
        subscription_type,
        status,
        created_at,
        updated_at
      FROM subscriptions 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `, [user.id]);

    console.log(`📋 Found ${subscriptionResult.rows.length} subscription records:`);
    subscriptionResult.rows.forEach((sub, index) => {
      console.log(`  ${index + 1}. Subscription ID: ${sub.razorpay_subscription_id || 'N/A'}`);
      console.log(`     Payment ID: ${sub.razorpay_payment_id}`);
      console.log(`     Type: ${sub.subscription_type}`);
      console.log(`     Status: ${sub.status}`);
      console.log(`     Created: ${sub.created_at}`);
      console.log(`     Updated: ${sub.updated_at}`);
      console.log('');
    });

    // Check for specific payment ID R71G8cKB3xWq4g
    console.log('🎯 Checking specific payment ID: R71G8cKB3xWq4g');
    const specificPayment = await pool.query(`
      SELECT 
        p.razorpay_payment_id,
        p.amount,
        p.status,
        p.captured_at,
        p.created_at,
        s.subscription_type,
        s.status as subscription_status
      FROM payments p
      LEFT JOIN subscriptions s ON p.razorpay_payment_id = s.razorpay_payment_id
      WHERE p.razorpay_payment_id = $1
    `, ['R71G8cKB3xWq4g']);

    if (specificPayment.rows.length > 0) {
      const payment = specificPayment.rows[0];
      console.log('✅ Payment R71G8cKB3xWq4g found:');
      console.log(`   Amount: ₹${payment.amount}`);
      console.log(`   Status: ${payment.status}`);
      console.log(`   Captured: ${payment.captured_at}`);
      console.log(`   Subscription Type: ${payment.subscription_type}`);
      console.log(`   Subscription Status: ${payment.subscription_status}`);
    } else {
      console.log('❌ Payment R71G8cKB3xWq4g not found in database');
    }

  } catch (error) {
    console.error('❌ Error checking premium status:', error);
  }
}

// Run the check
checkCCRPremiumStatus();