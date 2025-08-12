// DUMMY RAZORPAY SERVICE - Disabled to prevent database column errors
// This provides mock responses to avoid breaking the application

import crypto from "crypto";

console.log('⚠️ Using DUMMY Razorpay service - Payment features disabled');

// Subscription plans configuration (kept for compatibility)
export const SUBSCRIPTION_PLANS = {
  premium: {
    monthly: {
      planId: 'plan_premium_monthly',
      amount: 45100, // ₹451 in paise
      period: 'monthly',
      interval: 1,
      name: 'Premium Monthly Plan',
      description: 'Enhanced QBOT features and priority support',
      displayPrice: '₹451'
    },
    yearly: {
      planId: 'plan_premium_yearly',
      amount: 261100, // ₹2611 in paise
      period: 'yearly',
      interval: 1,
      name: 'Premium Yearly Plan',
      description: 'Enhanced QBOT features and priority support - Save ₹2,801',
      displayPrice: '₹2,611',
      savings: '₹2,801 (6+ months free)'
    }
  },
  super_user: {
    topup_451: {
      planId: 'plan_super_topup_451',
      amount: 45100, // ₹451 in paise (minimum topup)
      name: 'Super User Starter Pack',
      description: 'Pay per question - 100 questions included',
      displayPrice: '₹451',
      questions: 100, // ₹451 ÷ ₹4.51 = 100 questions
      perQuestionRate: 4.51,
      validityMonths: 1,
      features: ['100 questions', '1 month validity', '₹4.51 per question']
    },

    topup_4510: {
      planId: 'plan_super_topup_4510',
      amount: 451000, // ₹4,510 in paise (maximum topup)
      name: 'Super User Max Pack',
      description: 'Pay per question - 1000 questions included',
      displayPrice: '₹4,510',
      questions: 1000, // ₹4,510 ÷ ₹4.51 = 1000 questions
      perQuestionRate: 4.51,
      validityMonths: 24,
      features: ['1000 questions', '2 years validity', '₹4.51 per question', 'Maximum value pack']
    }
  }
};

// Dummy Razorpay client - disabled
let razorpayClient: any = null;

async function initializeRazorpay() {
  try {
    // Dummy initialization - no actual Razorpay connection
    console.log('⚠️ Razorpay initialization skipped (dummy mode)');
    console.log('⚠️ Razorpay client initialization skipped');
    return true; // Always return true to avoid blocking the app
  } catch (error) {
    console.error('❌ Razorpay initialization skipped (dummy mode):', error);
    return true; // Always return true in dummy mode
  }
}

export class RazorpayService {
  private static instance: RazorpayService;
  private isInitialized = true; // Always initialized in dummy mode

  constructor() {
    console.log('🔧 Dummy RazorpayService initialized');
  }

  static getInstance(): RazorpayService {
    if (!RazorpayService.instance) {
      RazorpayService.instance = new RazorpayService();
    }
    return RazorpayService.instance;
  }

  // Dummy create order
  async createOrder(amount: number, currency: string = 'INR', receiptId: string) {
    console.log('🔧 Dummy order created:', { amount, currency, receiptId });
    return {
      id: `dummy_order_${Date.now()}`,
      amount: amount,
      currency: currency,
      receipt: receiptId,
      status: 'created'
    };
  }

  // Dummy verify payment signature
  verifyPaymentSignature(paymentId: string, orderId: string, signature: string): boolean {
    console.log('🔧 Dummy payment signature verification:', { paymentId, orderId });
    return true; // Always return true in dummy mode
  }

  // Dummy verify webhook signature
  verifyWebhookSignature(body: string, signature: string): boolean {
    console.log('🔧 Dummy webhook signature verification');
    return true; // Always return true in dummy mode
  }

  // Dummy create subscription
  async createSubscription(userId: string, planType: 'premium' | 'super_user', billingPeriod?: string, topupPlan?: string) {
    console.log('🔧 Dummy subscription creation:', { userId, planType, billingPeriod, topupPlan });
    
    // Return dummy response with checkout URL
    const dummySubscriptionId = `dummy_sub_${Date.now()}`;
    const dummyCheckoutUrl = `https://dummy-razorpay-checkout.example.com/subscription/${dummySubscriptionId}`;
    
    // Log the dummy checkout creation
    console.log('🔧 Dummy checkout URL generated:', dummyCheckoutUrl);
    console.log('⚠️ NOTE: This is a dummy checkout URL. For real payments, configure Razorpay credentials.');
    
    return {
      subscriptionId: dummySubscriptionId,
      checkoutUrl: dummyCheckoutUrl,
      planType: planType,
      amount: planType === 'premium' 
        ? (billingPeriod === 'yearly' ? 261100 : 45100)
        : topupPlan === 'topup_451' ? 45100 : 451000,
      status: 'created'
    };
  }

  // Dummy process subscription
  async processSubscription(userId: string, planType: 'premium' | 'super_user', planVariant: string, paymentId: string, orderId: string) {
    console.log('🔧 Dummy subscription processed:', { userId, planType, planVariant });
    return {
      id: `dummy_sub_${Date.now()}`,
      userId: userId,
      planType: planType,
      planVariant: planVariant,
      status: 'active',
      createdAt: new Date()
    };
  }

  // Dummy get user subscription status
  async getUserSubscriptionStatus(userId: string) {
    console.log('🔧 Dummy subscription status check for user:', userId);
    return null; // No subscription in dummy mode
  }

  // Dummy check user premium status
  async checkUserPremiumStatus(userId: string): Promise<{isPremium: boolean, subscriptionType: string | null, validUntil: Date | null, questionsRemaining: number | null}> {
    console.log('🔧 Dummy premium status check for user:', userId);
    return {
      isPremium: false,
      subscriptionType: null,
      validUntil: null,
      questionsRemaining: null
    };
  }

  // Dummy consume question
  async consumeQuestion(userId: string): Promise<boolean> {
    console.log('🔧 Dummy question consumption for user:', userId);
    return true; // Always allow in dummy mode
  }

  // Get subscription plans (real data)
  getSubscriptionPlans() {
    return SUBSCRIPTION_PLANS;
  }

  // Dummy cancel subscription
  async cancelSubscription(userId: string) {
    console.log('🔧 Dummy subscription cancelled for user:', userId);
    return true;
  }

  // Dummy get user payments
  async getUserPayments(userId: string) {
    console.log('🔧 Dummy payment history for user:', userId);
    return [];
  }
}

// Create and export the service instance
export const razorpayService = RazorpayService.getInstance();