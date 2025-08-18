// Manual premium activation for Sonya using server's database pool
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  min: 1,
});

async function activateSonyaPremium() {
  const client = await pool.connect();
  
  try {
    console.log('🎯 Activating premium status for Sonya (44906531)...');
    
    // Insert or update user subscription status
    const result = await client.query(`
      INSERT INTO user_subscription_status (
        user_id, is_premium, premium_expires_at, subscription_type
      ) VALUES ($1, $2, NOW() + INTERVAL '1 year', $3)
      ON CONFLICT (user_id) DO UPDATE SET
        is_premium = $2,
        premium_expires_at = NOW() + INTERVAL '1 year',
        subscription_type = $3
      RETURNING *
    `, ['44906531', true, 'premium_yearly']);

    console.log('✅ Premium status activated:', result.rows[0]);
    
    // Also update subscription record
    await client.query(`
      UPDATE subscriptions 
      SET user_id = $1, status = 'active'
      WHERE razorpay_payment_id = $2
    `, ['44906531', 'pay_R6yFPetiGU8WjC']);

    console.log('✅ Subscription record linked to user');
    
    // Verify the activation
    const verification = await client.query(`
      SELECT user_id, is_premium, premium_expires_at, subscription_type
      FROM user_subscription_status 
      WHERE user_id = $1
    `, ['44906531']);
    
    console.log('📋 Final status:', verification.rows[0]);
    
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  } finally {
    client.release();
    await pool.end();
  }
}

activateSonyaPremium()
  .then(success => {
    if (success) {
      console.log('🎉 Sonya premium activation complete!');
    } else {
      console.log('💥 Activation failed');
    }
    process.exit(success ? 0 : 1);
  });