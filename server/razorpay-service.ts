import crypto from 'crypto';
import { pool } from './db';

// Razorpay API interface since we can't install the package due to dependency conflicts
interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

class RazorpayClient {
  private keyId: string;
  private keySecret: string;

  constructor(keyId: string, keySecret: string) {
    this.keyId = keyId;
    this.keySecret = keySecret;
  }

  async createOrder(options: {
    amount: number;
    currency: string;
    receipt: string;
    payment_capture: number;
  }): Promise<RazorpayOrder> {
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(options)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Razorpay API error: ${error}`);
    }

    return await response.json();
  }
}

// Subscription plans configuration (same as dummy but now with real integration)
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

// Real Razorpay client
let razorpayClient: RazorpayClient | null = null;

async function initializeRazorpay() {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not found in environment variables');
    }

    razorpayClient = new RazorpayClient(
      process.env.RAZORPAY_KEY_ID,
      process.env.RAZORPAY_KEY_SECRET
    );

    console.log('✅ Razorpay client initialized successfully');
    console.log(`🔑 Using Key ID: ${process.env.RAZORPAY_KEY_ID}`);
    return true;
  } catch (error) {
    console.error('❌ Razorpay initialization failed:', error);
    throw error;
  }
}

export class RazorpayService {
  private static instance: RazorpayService;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      await initializeRazorpay();
      this.isInitialized = true;
      console.log('✅ RazorpayService initialized successfully');
    } catch (error) {
      console.error('❌ RazorpayService initialization failed:', error);
      throw error;
    }
  }

  static getInstance(): RazorpayService {
    if (!RazorpayService.instance) {
      RazorpayService.instance = new RazorpayService();
    }
    return RazorpayService.instance;
  }

  // Create Razorpay order
  async createOrder(amount: number, currency: string = 'INR', receiptId: string) {
    if (!razorpayClient) {
      throw new Error('Razorpay client not initialized');
    }

    try {
      const order = await razorpayClient.createOrder({
        amount: amount, // Amount in paise
        currency: currency,
        receipt: receiptId,
        payment_capture: 1
      });

      console.log('✅ Razorpay order created:', order.id);
      return order;
    } catch (error) {
      console.error('❌ Razorpay order creation failed:', error);
      throw error;
    }
  }

  // Verify payment signature
  verifyPaymentSignature(paymentId: string, orderId: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const isValid = expectedSignature === signature;
      console.log('🔐 Payment signature verification:', isValid ? 'VALID' : 'INVALID');
      return isValid;
    } catch (error) {
      console.error('❌ Payment signature verification failed:', error);
      return false;
    }
  }

  // Verify webhook signature
  verifyWebhookSignature(body: string, signature: string): boolean {
    try {
      if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
        console.error('❌ Webhook secret not configured');
        return false;
      }

      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(body)
        .digest('hex');

      const isValid = expectedSignature === signature;
      console.log('🔐 Webhook signature verification:', isValid ? 'VALID' : 'INVALID');
      return isValid;
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error);
      return false;
    }
  }

  // Create subscription
  async createSubscription(userId: string, planType: 'premium' | 'super_user', billingPeriod?: string, topupPlan?: string) {
    if (!razorpayClient) {
      throw new Error('Razorpay client not initialized');
    }

    try {
      let planConfig;
      let subscriptionType;

      if (planType === 'premium') {
        if (!billingPeriod || !['monthly', 'yearly'].includes(billingPeriod)) {
          throw new Error('Invalid billing period for premium plan');
        }
        planConfig = SUBSCRIPTION_PLANS.premium[billingPeriod as 'monthly' | 'yearly'];
        subscriptionType = `premium_${billingPeriod}`;
      } else if (planType === 'super_user') {
        if (!topupPlan || !['topup_451', 'topup_4510'].includes(topupPlan)) {
          throw new Error('Invalid topup plan for super user');
        }
        planConfig = SUBSCRIPTION_PLANS.super_user[topupPlan as 'topup_451' | 'topup_4510'];
        subscriptionType = `super_user_${topupPlan}`;
      } else {
        throw new Error('Invalid plan type');
      }

      // Create Razorpay order for one-time payment (super user) or subscription setup
      const receiptId = `${userId}_${subscriptionType}_${Date.now()}`;
      const order = await this.createOrder(planConfig.amount, 'INR', receiptId);

      // Store subscription in database
      const result = await pool.query(`
        INSERT INTO subscriptions (
          user_id, subscription_type, amount, currency, status, 
          razorpay_order_id, plan_config, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
      `, [
        userId,
        subscriptionType,
        planConfig.amount,
        'INR',
        'pending',
        order.id,
        JSON.stringify(planConfig)
      ]);

      console.log('✅ Subscription created in database:', result.rows[0].id);

      return {
        subscription: result.rows[0],
        razorpayOrderId: order.id,
        amount: planConfig.amount,
        currency: 'INR',
        checkoutUrl: `https://api.razorpay.com/v1/checkout/embedded`
      };
    } catch (error) {
      console.error('❌ Subscription creation failed:', error);
      throw error;
    }
  }

  // Process successful payment
  async processSubscription(userId: string, planType: 'premium' | 'super_user', planVariant: string, paymentId: string, orderId: string) {
    try {
      // Update subscription status
      const result = await pool.query(`
        UPDATE subscriptions 
        SET status = 'active', razorpay_payment_id = $1, activated_at = NOW()
        WHERE user_id = $2 AND razorpay_order_id = $3
        RETURNING *
      `, [paymentId, userId, orderId]);

      if (result.rows.length === 0) {
        throw new Error('Subscription not found');
      }

      const subscription = result.rows[0];
      console.log('✅ Subscription activated:', subscription.id);

      // For super user plans, add questions to user account
      if (planType === 'super_user') {
        const planConfig = JSON.parse(subscription.plan_config);
        const questionsToAdd = planConfig.questions || 0;
        const validityMonths = planConfig.validityMonths || 1;
        const validUntil = new Date();
        validUntil.setMonth(validUntil.getMonth() + validityMonths);

        await pool.query(`
          INSERT INTO user_question_balance (user_id, questions_remaining, valid_until, created_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (user_id) 
          DO UPDATE SET 
            questions_remaining = user_question_balance.questions_remaining + $2,
            valid_until = GREATEST(user_question_balance.valid_until, $3),
            updated_at = NOW()
        `, [userId, questionsToAdd, validUntil]);

        console.log(`✅ Added ${questionsToAdd} questions to user ${userId}, valid until ${validUntil}`);
      }

      return subscription;
    } catch (error) {
      console.error('❌ Subscription processing failed:', error);
      throw error;
    }
  }

  // Get user subscription status
  async getUserSubscriptionStatus(userId: string) {
    try {
      const result = await pool.query(`
        SELECT * FROM subscriptions 
        WHERE user_id = $1 AND status = 'active'
        ORDER BY created_at DESC 
        LIMIT 1
      `, [userId]);

      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Failed to get subscription status:', error);
      return null;
    }
  }

  // Check user premium status
  async checkUserPremiumStatus(userId: string): Promise<{
    isPremium: boolean;
    subscriptionType: string | null;
    validUntil: Date | null;
    questionsRemaining: number | null;
  }> {
    try {
      // Check for active premium subscription
      const premiumResult = await pool.query(`
        SELECT * FROM subscriptions 
        WHERE user_id = $1 AND subscription_type LIKE 'premium_%' AND status = 'active'
        ORDER BY created_at DESC 
        LIMIT 1
      `, [userId]);

      if (premiumResult.rows.length > 0) {
        const subscription = premiumResult.rows[0];
        const planConfig = JSON.parse(subscription.plan_config);
        
        // Calculate validity based on subscription type
        let validUntil = new Date(subscription.activated_at);
        if (planConfig.period === 'monthly') {
          validUntil.setMonth(validUntil.getMonth() + 1);
        } else if (planConfig.period === 'yearly') {
          validUntil.setFullYear(validUntil.getFullYear() + 1);
        }

        // Check if still valid
        if (validUntil > new Date()) {
          return {
            isPremium: true,
            subscriptionType: subscription.subscription_type,
            validUntil: validUntil,
            questionsRemaining: null // Premium has unlimited questions
          };
        }
      }

      // Check for super user question balance
      const balanceResult = await pool.query(`
        SELECT questions_remaining, valid_until FROM user_question_balance 
        WHERE user_id = $1 AND valid_until > NOW() AND questions_remaining > 0
      `, [userId]);

      if (balanceResult.rows.length > 0) {
        const balance = balanceResult.rows[0];
        return {
          isPremium: false, // Super user is not premium, but has question credits
          subscriptionType: 'super_user',
          validUntil: balance.valid_until,
          questionsRemaining: balance.questions_remaining
        };
      }

      return {
        isPremium: false,
        subscriptionType: null,
        validUntil: null,
        questionsRemaining: null
      };
    } catch (error) {
      console.error('❌ Failed to check premium status:', error);
      return {
        isPremium: false,
        subscriptionType: null,
        validUntil: null,
        questionsRemaining: null
      };
    }
  }

  // Consume a question for super user
  async consumeQuestion(userId: string): Promise<boolean> {
    try {
      const result = await pool.query(`
        UPDATE user_question_balance 
        SET questions_remaining = questions_remaining - 1, updated_at = NOW()
        WHERE user_id = $1 AND questions_remaining > 0 AND valid_until > NOW()
        RETURNING questions_remaining
      `, [userId]);

      if (result.rows.length > 0) {
        console.log(`✅ Question consumed for user ${userId}, remaining: ${result.rows[0].questions_remaining}`);
        return true;
      }

      console.log(`❌ No questions available for user ${userId}`);
      return false;
    } catch (error) {
      console.error('❌ Failed to consume question:', error);
      return false;
    }
  }

  // Handle webhook events
  async handleWebhook(body: any, signature: string) {
    try {
      if (!this.verifyWebhookSignature(JSON.stringify(body), signature)) {
        throw new Error('Invalid webhook signature');
      }

      const event = body.event;
      const paymentEntity = body.payload.payment.entity;

      console.log('📥 Razorpay webhook received:', event);

      switch (event) {
        case 'payment.captured':
          await this.handlePaymentCaptured(paymentEntity);
          break;
        case 'payment.failed':
          await this.handlePaymentFailed(paymentEntity);
          break;
        default:
          console.log('📋 Unhandled webhook event:', event);
      }
    } catch (error) {
      console.error('❌ Webhook handling failed:', error);
      throw error;
    }
  }

  private async handlePaymentCaptured(payment: any) {
    try {
      const orderId = payment.order_id;
      const paymentId = payment.id;

      // Find the subscription by order ID
      const result = await pool.query(`
        SELECT * FROM subscriptions WHERE razorpay_order_id = $1
      `, [orderId]);

      if (result.rows.length === 0) {
        console.log('⚠️ No subscription found for order:', orderId);
        return;
      }

      const subscription = result.rows[0];
      const userId = subscription.user_id;
      const subscriptionType = subscription.subscription_type;

      // Determine plan type and variant
      let planType: 'premium' | 'super_user';
      let planVariant: string;

      if (subscriptionType.startsWith('premium_')) {
        planType = 'premium';
        planVariant = subscriptionType.replace('premium_', '');
      } else if (subscriptionType.startsWith('super_user_')) {
        planType = 'super_user';
        planVariant = subscriptionType.replace('super_user_', '');
      } else {
        throw new Error('Invalid subscription type');
      }

      // Process the subscription
      await this.processSubscription(userId, planType, planVariant, paymentId, orderId);

      console.log('✅ Payment captured and subscription activated');
    } catch (error) {
      console.error('❌ Failed to handle payment captured:', error);
    }
  }

  private async handlePaymentFailed(payment: any) {
    try {
      const orderId = payment.order_id;

      // Update subscription status to failed
      await pool.query(`
        UPDATE subscriptions 
        SET status = 'failed', updated_at = NOW()
        WHERE razorpay_order_id = $1
      `, [orderId]);

      console.log('❌ Payment failed for order:', orderId);
    } catch (error) {
      console.error('❌ Failed to handle payment failed:', error);
    }
  }

  // Cancel subscription
  async cancelSubscription(userId: string, subscriptionId: string) {
    try {
      const result = await pool.query(`
        UPDATE subscriptions 
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `, [subscriptionId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Subscription not found');
      }

      console.log('✅ Subscription cancelled:', subscriptionId);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Subscription cancellation failed:', error);
      throw error;
    }
  }

  // Get payment history
  async getPaymentHistory(userId: string) {
    try {
      const result = await pool.query(`
        SELECT 
          id, subscription_type, amount, currency, status,
          razorpay_order_id, razorpay_payment_id,
          created_at, activated_at
        FROM subscriptions 
        WHERE user_id = $1
        ORDER BY created_at DESC
      `, [userId]);

      return result.rows;
    } catch (error) {
      console.error('❌ Failed to get payment history:', error);
      return [];
    }
  }
}

// Export singleton instance
export const razorpayService = RazorpayService.getInstance();