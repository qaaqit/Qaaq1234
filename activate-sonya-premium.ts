#!/usr/bin/env tsx

// Activate Sonya's premium subscription manually using her existing payment
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function activateSonyaPremium() {
  try {
    console.log('🎯 Activating premium status for Sonya...');
    
    // Update user subscription status for yearly premium
    const result = await sql`
      INSERT INTO user_subscription_status (
        user_id, is_premium, premium_expires_at, subscription_type
      ) VALUES (
        '44906531', 
        true, 
        NOW() + INTERVAL '1 year',
        'premium_yearly'
      )
      ON CONFLICT (user_id) DO UPDATE SET
        is_premium = true,
        premium_expires_at = NOW() + INTERVAL '1 year',
        subscription_type = 'premium_yearly'
    `;

    console.log('✅ Premium status activated for Sonya!');
    
    // Verify the activation
    const status = await sql`
      SELECT 
        user_id,
        is_premium,
        premium_expires_at,
        subscription_type
      FROM user_subscription_status 
      WHERE user_id = '44906531'
    `;
    
    console.log('📋 Current status:', status[0]);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to activate premium:', error);
    return false;
  }
}

activateSonyaPremium().then(() => {
  console.log('🎉 Sonya premium activation complete!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Activation failed:', error);
  process.exit(1);
});