#!/usr/bin/env tsx

// Activate Sonya's premium subscription via admin API
import fetch from 'node-fetch';

async function activateSonyaPremium() {
  try {
    console.log('🎯 Activating premium status for Sonya via admin API...');
    
    // Create admin API request to activate premium
    const response = await fetch('http://localhost:5000/api/admin/activate-premium', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: '44906531',
        email: 'sonya11.gupta@gmail.com',
        subscriptionType: 'premium_yearly',
        paymentId: 'pay_R6yFPetiGU8WjC'
      })
    });

    const result = await response.json();
    console.log('📋 API Response:', result);
    
    return result.success;
  } catch (error) {
    console.error('❌ Failed to activate via API:', error);
    return false;
  }
}

activateSonyaPremium().then((success) => {
  if (success) {
    console.log('🎉 Sonya premium activation complete!');
  } else {
    console.log('⚠️ Need to create admin activation endpoint');
  }
  process.exit(0);
}).catch(error => {
  console.error('💥 Activation failed:', error);
  process.exit(1);
});