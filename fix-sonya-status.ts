#!/usr/bin/env tsx

// Fix Sonya's premium status by applying what webhook should have done
import { RazorpayService } from './server/razorpay-service-production.js';

async function fixSonyaStatus() {
  try {
    console.log('🔧 Fixing Sonya\'s premium status...');
    
    const razorpayService = RazorpayService.getInstance();
    await razorpayService.ensureInitialized();
    
    // Apply what the webhook should have done for Sonya's payment
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

    // Process the payment as webhook would have
    await razorpayService.handlePaymentCaptured(paymentData);
    
    console.log('✅ Payment processed - checking status...');
    
    // Verify the result
    const status = await razorpayService.checkUserPremiumStatus('44906531');
    console.log('📊 Sonya\'s updated status:', status);
    
    if (status.isPremium) {
      console.log('🎉 SUCCESS: Sonya now has premium status!');
    } else {
      console.log('⚠️ Status still shows free - may need manual intervention');
    }
    
    return status.isPremium;
  } catch (error) {
    console.error('❌ Fix failed:', error);
    return false;
  }
}

fixSonyaStatus().then((success) => {
  console.log(success ? '✅ Fix completed successfully' : '❌ Fix failed');
  process.exit(success ? 0 : 1);
});