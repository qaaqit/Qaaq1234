#!/usr/bin/env tsx

// Test the enhanced webhook system with the new payment pay_R6yeWtx4jUG6dS
import { RazorpayService } from './server/razorpay-service-production.js';

async function testEnhancedWebhook() {
  try {
    console.log('🧪 Testing enhanced webhook system with pay_R6yeWtx4jUG6dS...');
    
    const razorpayService = RazorpayService.getInstance();
    await razorpayService.ensureInitialized();
    
    // Simulate the webhook payload with UPI details for automatic user detection
    const enhancedPaymentData = {
      id: 'pay_R6yeWtx4jUG6dS',
      amount: 45100, // ₹451 in paise
      currency: 'INR',
      status: 'captured',
      method: 'upi',
      email: 'void@razorpay.com', // Generic email (will be ignored)
      contact: '+91 8973 297600', // Real contact for phone matching
      description: 'Premium Payment - premium monthly',
      notes: {
        // Add user identification data that would come from our app
        user_id: '44885683', // Simulate if Piyush made this payment
        source: 'qaaq_connect_test'
      }
    };

    console.log('📨 Testing enhanced webhook with:', enhancedPaymentData);
    
    // Process with enhanced webhook handler
    await razorpayService.handlePaymentCaptured(enhancedPaymentData);
    
    console.log('✅ Enhanced webhook test complete');
    
    // Check status after processing
    const status = await razorpayService.checkUserPremiumStatus('44885683');
    console.log('📊 User status after enhanced webhook:', status);
    
    return {
      success: status.isPremium,
      status: status
    };
    
  } catch (error) {
    console.error('❌ Enhanced webhook test failed:', error);
    return { success: false, error: error.message };
  }
}

testEnhancedWebhook().then((result) => {
  if (result.success) {
    console.log('🎉 Enhanced webhook system working perfectly!');
  } else {
    console.log('⚠️ Enhanced webhook needs more work:', result.error);
  }
  process.exit(result.success ? 0 : 1);
});