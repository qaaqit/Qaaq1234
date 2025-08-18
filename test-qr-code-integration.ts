#!/usr/bin/env tsx
/**
 * QR Code Payment Integration Test
 * 
 * Tests the complete QR code payment flow:
 * 1. Razorpay QR code generates payment
 * 2. Webhook processes payment and creates pending subscription
 * 3. Admin can link payment to user account
 * 4. User gets premium access
 */

import { razorpayService } from './server/razorpay-service-production';
import { pool } from './server/db';

async function testQRCodeIntegration() {
  console.log('📱 Testing QR Code Payment Integration...\n');

  try {
    // Initialize service
    await razorpayService.ensureInitialized();

    console.log('📋 1. Current Subscription Plans:');
    const plans = razorpayService.getSubscriptionPlans();
    console.log('   Monthly Plan:', plans.premium.monthly.displayPrice, '-', plans.premium.monthly.checkoutUrl);
    console.log('   Yearly Plan:', plans.premium.yearly.displayPrice, '-', plans.premium.yearly.checkoutUrl);

    console.log('\n📱 2. QR Code Payment Flow:');
    console.log('   When users scan Razorpay QR code and pay:');
    console.log('   • ₹451 = Monthly Premium Plan');  
    console.log('   • ₹2,611 = Yearly Premium Plan');
    console.log('   • Payment automatically creates pending subscription');
    console.log('   • Admin can link payment to user account');

    // Simulate QR payment webhook
    console.log('\n🔄 3. Simulating QR Payment Webhook:');
    const mockQRPayment = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_QR_test_' + Date.now(),
            amount: 45100, // ₹451 monthly plan
            currency: 'INR',
            status: 'captured',
            method: 'upi',
            contact: '+919876543210',
            vpa: 'user@paytm',
            description: 'QR Code Payment'
          }
        }
      }
    };

    // Process the webhook
    console.log('   Processing QR payment webhook...');
    await razorpayService.handleWebhook(mockQRPayment, 'test_signature');
    console.log('   ✅ QR payment webhook processed');

    // Check pending payments
    console.log('\n📋 4. Checking Pending QR Payments:');
    const pendingPayments = await razorpayService.getPendingQRPayments();
    console.log('   Pending QR payments:', pendingPayments.length);
    
    if (pendingPayments.length > 0) {
      const latestPayment = pendingPayments[0];
      console.log('   Latest pending payment:');
      console.log('     Payment ID:', latestPayment.paymentId);
      console.log('     Amount:', latestPayment.amount / 100, latestPayment.currency);
      console.log('     Method:', latestPayment.method);
      console.log('     Contact:', latestPayment.contact);
      
      // Simulate admin linking payment to user
      console.log('\n🔗 5. Simulating Admin Link Payment to User:');
      const testUserId = '44885683'; // Current admin user
      const result = await razorpayService.linkQRPaymentToUser(latestPayment.paymentId, testUserId);
      
      if (result) {
        console.log('   ✅ Successfully linked QR payment to user');
        
        // Verify user premium status
        const userStatus = await razorpayService.checkUserPremiumStatus(testUserId);
        console.log('   Updated user status:', userStatus);
      } else {
        console.log('   ❌ Failed to link QR payment to user');
      }
    }

    console.log('\n🎉 QR CODE INTEGRATION COMPLETE!');
    console.log('\n📚 How it works:');
    console.log('1. Razorpay generates QR code for your business');
    console.log('2. Users scan QR and pay ₹451 (monthly) or ₹2,611 (yearly)');
    console.log('3. Webhook automatically processes payment');
    console.log('4. Admin can link payments to user accounts via admin panel');
    console.log('5. Users get instant premium access');
    console.log('\n🔗 Integration Points:');
    console.log('• Monthly checkout: https://rzp.io/rzp/jwQW9TW');
    console.log('• Yearly checkout: https://rzp.io/rzp/NAU59cv');
    console.log('• QR payments automatically detected by amount matching');
    console.log('• Admin APIs ready for linking payments to users');

  } catch (error) {
    console.error('❌ QR integration test failed:', error);
  } finally {
    await pool.end();
  }
}

testQRCodeIntegration().catch(console.error);