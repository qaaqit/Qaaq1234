import pkg from 'pg';
const { Pool } = pkg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkPayment() {
  try {
    console.log('🔍 Checking payment for user sonya11.gupta@gmail.com (+919920027697)...');
    
    // First, find the user
    const userQuery = `
      SELECT id, email, whatsAppNumber, fullName, userId 
      FROM users 
      WHERE email = $1 OR whatsAppNumber = $2 OR whatsAppNumber = $3
    `;
    
    const userResult = await pool.query(userQuery, [
      'sonya11.gupta@gmail.com', 
      '+919920027697', 
      '919920027697'
    ]);
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found with email sonya11.gupta@gmail.com or phone +919920027697');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      phone: user.whatsappnumber,
      name: user.fullname,
      userId: user.userid
    });
    
    // Check payments for this user, especially for amount 2611
    const paymentQuery = `
      SELECT 
        p.id,
        p.razorpay_payment_id,
        p.amount,
        p.currency,
        p.status,
        p.method,
        p.description,
        p.created_at,
        s.subscription_type,
        s.status as subscription_status
      FROM payments p
      LEFT JOIN subscriptions s ON p.subscription_id = s.id
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC
    `;
    
    const paymentResult = await pool.query(paymentQuery, [user.id]);
    
    console.log(`\n💰 Found ${paymentResult.rows.length} payments for this user:`);
    
    paymentResult.rows.forEach((payment, index) => {
      console.log(`\n${index + 1}. Payment ID: ${payment.id}`);
      console.log(`   Razorpay ID: ${payment.razorpay_payment_id}`);
      console.log(`   Amount: ₹${payment.amount / 100} (${payment.amount} paise)`);
      console.log(`   Status: ${payment.status}`);
      console.log(`   Method: ${payment.method || 'N/A'}`);
      console.log(`   Description: ${payment.description || 'N/A'}`);
      console.log(`   Subscription Type: ${payment.subscription_type || 'N/A'}`);
      console.log(`   Created: ${payment.created_at}`);
      
      // Check if this is the 2611 payment
      if (payment.amount === 261100) { // 2611 * 100 = 261100 paise
        console.log('   🎯 THIS IS THE ₹2611 PAYMENT!');
      }
    });
    
    // Check subscription status
    const statusQuery = `
      SELECT 
        is_premium,
        is_super_user,
        premium_expires_at,
        super_user_expires_at,
        questions_remaining,
        total_spent
      FROM user_subscription_status 
      WHERE user_id = $1
    `;
    
    const statusResult = await pool.query(statusQuery, [user.id]);
    
    if (statusResult.rows.length > 0) {
      const status = statusResult.rows[0];
      console.log('\n📊 Current Subscription Status:');
      console.log(`   Premium: ${status.is_premium ? 'Yes' : 'No'}`);
      console.log(`   Super User: ${status.is_super_user ? 'Yes' : 'No'}`);
      console.log(`   Premium Expires: ${status.premium_expires_at || 'N/A'}`);
      console.log(`   Super User Expires: ${status.super_user_expires_at || 'N/A'}`);
      console.log(`   Questions Remaining: ${status.questions_remaining || 'N/A'}`);
      console.log(`   Total Spent: ₹${(status.total_spent || 0) / 100}`);
    } else {
      console.log('\n📊 No subscription status found for this user');
    }
    
    // Check active subscriptions
    const subscriptionQuery = `
      SELECT 
        id,
        subscription_type,
        status,
        amount,
        current_period_start,
        current_period_end,
        razorpay_subscription_id,
        created_at
      FROM subscriptions 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    
    const subscriptionResult = await pool.query(subscriptionQuery, [user.id]);
    
    console.log(`\n📋 Found ${subscriptionResult.rows.length} subscriptions for this user:`);
    
    subscriptionResult.rows.forEach((sub, index) => {
      console.log(`\n${index + 1}. Subscription ID: ${sub.id}`);
      console.log(`   Type: ${sub.subscription_type}`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Amount: ₹${sub.amount / 100}`);
      console.log(`   Razorpay Sub ID: ${sub.razorpay_subscription_id || 'N/A'}`);
      console.log(`   Period: ${sub.current_period_start || 'N/A'} to ${sub.current_period_end || 'N/A'}`);
      console.log(`   Created: ${sub.created_at}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking payment:', error);
  } finally {
    await pool.end();
  }
}

checkPayment();