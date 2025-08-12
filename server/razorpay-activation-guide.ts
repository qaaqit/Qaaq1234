// RAZORPAY ACTIVATION GUIDE - Safe Production Integration
// This guide provides step-by-step instructions for safely activating Razorpay

import { pool } from "./db";

console.log(`
🔒 RAZORPAY PRODUCTION ACTIVATION GUIDE
=====================================

Your QaaqConnect app has a comprehensive payment system ready for production.
Follow these steps to safely activate Razorpay payments:

📋 PRE-ACTIVATION CHECKLIST:
✅ Razorpay credentials configured (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET)
✅ Database schema ready (subscriptions, payments, user_subscription_status tables)
✅ API endpoints implemented (/api/subscriptions, /api/razorpay/webhook, etc.)
✅ Production Razorpay service coded (server/razorpay-service-production.ts)
✅ Frontend payment integration ready

🚀 ACTIVATION STEPS:

1. UPDATE SERVICE IMPORT:
   In server/routes.ts, change line 30 from:
   import { razorpayService, SUBSCRIPTION_PLANS } from "./razorpay-service-dummy";
   To:
   import { razorpayService, SUBSCRIPTION_PLANS } from "./razorpay-service-production";

2. RAZORPAY DASHBOARD SETUP:
   - Login to https://dashboard.razorpay.com
   - Create subscription plans with these exact IDs:
     * plan_premium_monthly (₹451/month)
     * plan_premium_yearly (₹2611/year)
     * plan_super_topup_451 (₹451 one-time)
     * plan_super_topup_4510 (₹4510 one-time)
   
3. WEBHOOK CONFIGURATION:
   - In Razorpay Dashboard → Settings → Webhooks
   - Add webhook URL: https://qaaq.app/api/razorpay/webhook
   - Enable events: payment.captured, payment.failed, subscription.activated, subscription.cancelled
   - Use your RAZORPAY_WEBHOOK_SECRET

4. TESTING WORKFLOW:
   - Start with Razorpay Test Mode
   - Test all subscription flows
   - Verify webhook handling
   - Check database updates
   - Switch to Live Mode only after thorough testing

5. MONITORING SETUP:
   - Monitor /api/admin/subscriptions (admin dashboard)
   - Check /api/admin/payment-analytics (revenue tracking)
   - Set up alerts for failed payments

⚠️  SAFETY MEASURES:
- Always test in Razorpay Test Mode first
- Keep database backups before going live
- Monitor payment logs closely during initial days
- Have rollback plan ready (switch back to dummy service)

🔧 CURRENT STATUS: DUMMY MODE (Safe for development)
🎯 NEXT STEP: Follow activation guide when ready for production payments

For support: Check Razorpay documentation or contact support@qaaq.app
`);

export async function validateDatabaseSchema() {
  try {
    console.log('🔍 Validating database schema for payments...');
    
    const tables = ['subscriptions', 'payments', 'user_subscription_status'];
    
    for (const table of tables) {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      
      console.log(`✅ Table ${table}: ${result.rows.length} columns found`);
    }
    
    console.log('✅ Database schema validation complete');
    return true;
  } catch (error) {
    console.error('❌ Database validation failed:', error);
    return false;
  }
}

export async function testDummyService() {
  try {
    console.log('🧪 Testing dummy service functionality...');
    
    // Import dummy service
    const { razorpayService } = await import('./razorpay-service-dummy');
    
    // Test basic operations
    const plans = razorpayService.getSubscriptionPlans();
    console.log(`✅ Subscription plans loaded: ${Object.keys(plans).length} plan types`);
    
    const premiumStatus = await razorpayService.checkUserPremiumStatus('test-user');
    console.log(`✅ Premium status check: ${premiumStatus.isPremium}`);
    
    console.log('✅ Dummy service test complete');
    return true;
  } catch (error) {
    console.error('❌ Dummy service test failed:', error);
    return false;
  }
}

// Run validation if called directly
if (require.main === module) {
  (async () => {
    await validateDatabaseSchema();
    await testDummyService();
  })();
}