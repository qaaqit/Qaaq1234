import { pool } from './server/db';

async function setupUserTypes() {
  try {
    console.log('🔧 Setting up user_type column for Razorpay integration...');
    
    // Update existing users to 'Free' if they don't have a type
    await pool.query(`
      UPDATE users 
      SET user_type = 'Free' 
      WHERE user_type IS NULL OR user_type = '' OR user_type = 'local' OR user_type = 'sailor';
    `);
    
    console.log('✅ Existing users set to Free type');
    
    // Add subscription tracking columns
    const subscriptionColumns = [
      'subscription_status TEXT DEFAULT \'free\'', // 'free', 'premium', 'super'
      'subscription_plan TEXT', // '451monthly', '2611yearly', '451starter', '4510max'
      'subscription_start_date TIMESTAMP',
      'subscription_end_date TIMESTAMP',
      'razorpay_subscription_id TEXT',
      'razorpay_customer_id TEXT',
      'last_payment_date TIMESTAMP',
      'payment_amount INTEGER DEFAULT 0', // Amount in paise
      'payment_currency TEXT DEFAULT \'INR\'',
      'super_user_credits INTEGER DEFAULT 0' // For pay-per-question topups
    ];
    
    for (const column of subscriptionColumns) {
      try {
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${column};`);
        console.log(`✅ Added subscription column: ${column.split(' ')[0]}`);
      } catch (error) {
        console.log(`⚠️ Column ${column.split(' ')[0]} already exists`);
      }
    }
    
    // Check current data
    const result = await pool.query(`
      SELECT id, email, user_type, subscription_status 
      FROM users 
      LIMIT 5;
    `);
    
    console.log('📊 Sample user types:');
    console.table(result.rows);
    
    console.log('🎉 User type system setup complete!');
    console.log('💡 User types: Free (default) → Premium (₹451/month, ₹2,611/year) → Super (pay-per-question)');
    
  } catch (error) {
    console.error('❌ Error setting up user types:', error);
  } finally {
    process.exit(0);
  }
}

setupUserTypes();