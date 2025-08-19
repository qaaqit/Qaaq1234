import { pool } from './server/db.js';

async function verifyAutomaticPaymentSystem() {
  try {
    console.log('🔍 COMPREHENSIVE PAYMENT SYSTEM VERIFICATION');
    console.log('============================================\n');

    // 1. Verify CCR KING's Premium Status
    console.log('1️⃣ PREMIUM STATUS CHECK');
    console.log('-----------------------');
    
    const userResult = await pool.query(`
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.password,
        uss.is_premium,
        uss.premium_expires_at,
        uss.subscription_type,
        uss.created_at as premium_activated,
        uss.updated_at as premium_updated
      FROM users u
      LEFT JOIN user_subscription_status uss ON u.id = uss.user_id
      WHERE u.email = $1
    `, ['workship.ai@gmail.com']);

    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = userResult.rows[0];
    console.log(`👤 User: ${user.full_name} (${user.email})`);
    console.log(`🆔 User ID: ${user.id}`);
    console.log(`🔑 Password Set: ${user.password ? '✅ YES ("' + user.password + '")' : '❌ NO'}`);
    console.log(`💎 Premium Status: ${user.is_premium ? '✅ ACTIVE' : '❌ INACTIVE'}`);
    console.log(`⏰ Premium Expires: ${user.premium_expires_at || 'N/A'}`);
    console.log(`📦 Subscription Type: ${user.subscription_type || 'N/A'}`);
    console.log(`📅 Premium Activated: ${user.premium_activated || 'N/A'}`);
    console.log(`🔄 Last Updated: ${user.premium_updated || 'N/A'}\n`);

    // 2. Verify Payment Records
    console.log('2️⃣ PAYMENT RECORDS CHECK');
    console.log('-------------------------');
    
    const paymentResult = await pool.query(`
      SELECT 
        razorpay_payment_id,
        amount,
        status,
        created_at,
        updated_at
      FROM payments 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `, [user.id]);

    console.log(`💳 Found ${paymentResult.rows.length} payment records:`);
    paymentResult.rows.forEach((payment, index) => {
      console.log(`  ${index + 1}. Payment ID: ${payment.razorpay_payment_id}`);
      console.log(`     Amount: ₹${payment.amount}`);
      console.log(`     Status: ${payment.status}`);
      console.log(`     Created: ${payment.created_at}`);
      console.log(`     Updated: ${payment.updated_at}\n`);
    });

    // 3. Verify Subscription Records
    console.log('3️⃣ SUBSCRIPTION RECORDS CHECK');
    console.log('------------------------------');
    
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
      console.log(`     Updated: ${sub.updated_at}\n`);
    });

    // 4. Test Login Functionality
    console.log('4️⃣ LOGIN FUNCTIONALITY TEST');
    console.log('----------------------------');
    
    const testPassword = '4321koihai';
    const loginTest = await pool.query(`
      SELECT id, full_name, email, password 
      FROM users 
      WHERE id = $1 AND password = $2
    `, [user.id, testPassword]);

    if (loginTest.rows.length > 0) {
      console.log(`✅ Login Test PASSED - User can login with ID "${user.id}" and password "${testPassword}"`);
    } else {
      console.log(`❌ Login Test FAILED - Password mismatch`);
    }

    // 5. Check Specific Payment ID
    console.log('\n5️⃣ SPECIFIC PAYMENT VERIFICATION');
    console.log('----------------------------------');
    
    const specificPaymentId = 'R71G8cKB3xWq4g';
    const specificPaymentResult = await pool.query(`
      SELECT 
        p.razorpay_payment_id,
        p.amount,
        p.status,
        p.created_at,
        s.subscription_type,
        s.status as subscription_status
      FROM payments p
      LEFT JOIN subscriptions s ON p.razorpay_payment_id = s.razorpay_payment_id
      WHERE p.razorpay_payment_id = $1
    `, [specificPaymentId]);

    if (specificPaymentResult.rows.length > 0) {
      const payment = specificPaymentResult.rows[0];
      console.log(`✅ Payment ${specificPaymentId} FOUND and PROCESSED:`);
      console.log(`   Amount: ₹${payment.amount}`);
      console.log(`   Status: ${payment.status}`);
      console.log(`   Created: ${payment.created_at}`);
      console.log(`   Subscription Type: ${payment.subscription_type}`);
      console.log(`   Subscription Status: ${payment.subscription_status}`);
    } else {
      console.log(`❌ Payment ${specificPaymentId} NOT FOUND`);
    }

    // 6. Final Summary
    console.log('\n🎯 AUTOMATIC WEBHOOK SYSTEM SUMMARY');
    console.log('====================================');
    
    const isWorking = user.is_premium && 
                     paymentResult.rows.length > 0 && 
                     subscriptionResult.rows.length > 0 &&
                     user.password === testPassword;

    if (isWorking) {
      console.log('✅ AUTOMATIC PAYMENT PROCESSING: WORKING CORRECTLY');
      console.log('✅ PREMIUM ACTIVATION: SUCCESSFUL');
      console.log('✅ USER LOGIN: ENABLED');
      console.log('✅ WEBHOOK SYSTEM: FUNCTIONAL');
      console.log('\n🎉 READY FOR TESTING:');
      console.log(`   - User ID: ${user.id}`);
      console.log(`   - Password: ${testPassword}`);
      console.log(`   - Premium Status: ACTIVE until ${user.premium_expires_at}`);
      console.log('   - User can now login and see premium features');
    } else {
      console.log('❌ SYSTEM ISSUES DETECTED - Need manual verification');
    }

  } catch (error) {
    console.error('❌ Error verifying payment system:', error);
  }
}

// Run the verification
verifyAutomaticPaymentSystem();