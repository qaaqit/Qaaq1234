#!/usr/bin/env tsx

// Retroactively apply what the webhook should have done for Sonya's payment
import { RazorpayService } from './server/razorpay-service-production.js';

async function retroactiveWebhookFix() {
  try {
    console.log('🔄 Applying retroactive webhook processing for Sonya...');
    
    const razorpayService = RazorpayService.getInstance();
    
    // Simulate the payment object that the webhook would have received
    const paymentData = {
      id: 'pay_R6yFPetiGU8WjC',
      amount: 261100, // ₹2,611 in paise  
      currency: 'INR',
      status: 'captured',
      method: 'upi',
      email: 'sonya11.gupta@gmail.com',
      contact: '+919876543210',
      description: 'Premium Payment - premium yearly'
    };

    // Call the private method directly (we'll make it public temporarily)
    await razorpayService['handlePaymentCaptured'](paymentData);
    
    console.log('✅ Retroactive webhook processing complete');
    
    // Verify the result
    const status = await razorpayService.checkUserPremiumStatus('44906531');
    console.log('📊 Sonya\'s premium status:', status);
    
    return true;
  } catch (error) {
    console.error('❌ Retroactive fix failed:', error);
    return false;
  }
}

retroactiveWebhookFix().then(() => {
  console.log('🎉 Retroactive webhook fix complete!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fix failed:', error);
  process.exit(1);
});