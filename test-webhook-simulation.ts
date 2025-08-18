#!/usr/bin/env tsx

// Simulate what the webhook should have done automatically for Sonya's payment
import fetch from 'node-fetch';

async function simulateWebhookForSonya() {
  try {
    console.log('🧪 Simulating webhook processing for Sonya\'s payment...');
    
    // Simulate the webhook payload that Razorpay would have sent
    const webhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_R6yFPetiGU8WjC',
            amount: 261100, // ₹2,611 in paise
            currency: 'INR',
            status: 'captured',
            method: 'upi',
            email: 'sonya11.gupta@gmail.com',
            contact: '+919876543210',
            description: 'Premium Payment - premium yearly'
          }
        }
      }
    };

    // Send to webhook endpoint with a test signature
    const response = await fetch('http://localhost:5000/api/razorpay/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Razorpay-Signature': 'test-signature-for-simulation'
      },
      body: JSON.stringify(webhookPayload)
    });

    const result = await response.text();
    console.log('📋 Webhook response:', result.substring(0, 200));
    
    // Check if premium status was activated
    const statusCheck = await fetch('http://localhost:5000/api/admin/check-payment?email=sonya11.gupta@gmail.com');
    const statusResult = await statusCheck.json();
    
    console.log('📊 Current status:', statusResult);
    
    return true;
  } catch (error) {
    console.error('❌ Simulation failed:', error);
    return false;
  }
}

simulateWebhookForSonya().then(() => {
  console.log('🎯 Webhook simulation complete');
  process.exit(0);
}).catch(error => {
  console.error('💥 Simulation error:', error);
  process.exit(1);
});