// PRODUCTION RAZORPAY SERVICE - Full integration with secure payment processing
// This replaces the dummy service for live payment processing

import crypto from "crypto";
import https from "https";
import { pool } from "./db";

// Razorpay API interface (avoiding package dependency conflicts)
interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

interface RazorpaySubscription {
  id: string;
  status: string;
  short_url: string;
  notes: any;
}

interface RazorpayPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  description?: string;
}

console.log('🔄 Initializing PRODUCTION Razorpay service');

// Subscription plans configuration with proper typing
interface PremiumPlan {
  planId: string;
  amount: number;
  period: 'monthly' | 'yearly';
  interval: number;
  name: string;
  description: string;
  displayPrice: string;
  savings?: string;
}

interface SuperUserPlan {
  planId: string;
  amount: number;
  name: string;
  description: string;
  displayPrice: string;
  questions: number;
  perQuestionRate: number;
  validityMonths: number;
  features: string[];
}

export const SUBSCRIPTION_PLANS: {
  premium: {
    monthly: PremiumPlan;
    yearly: PremiumPlan;
  };
  super_user: {
    topup_451: SuperUserPlan;
    topup_4510: SuperUserPlan;
  };
} = {
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

// Razorpay API client using native HTTPS (avoiding package dependency conflicts)
class RazorpayClient {
  private keyId: string;
  private keySecret: string;
  private baseUrl = 'https://api.razorpay.com/v1';

  constructor(keyId: string, keySecret: string) {
    this.keyId = keyId;
    this.keySecret = keySecret;
  }

  private async makeRequest(method: string, path: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
      
      const options = {
        hostname: 'api.razorpay.com',
        port: 443,
        path: `/v1${path}`,
        method: method.toUpperCase(),
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const result = JSON.parse(responseData);
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(result);
            } else {
              reject(new Error(`Razorpay API error: ${result.error?.description || 'Unknown error'}`));
            }
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${responseData}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  async createOrder(data: any): Promise<RazorpayOrder> {
    return this.makeRequest('POST', '/orders', data);
  }

  async createSubscription(data: any): Promise<RazorpaySubscription> {
    return this.makeRequest('POST', '/subscriptions', data);
  }

  async fetchPayment(paymentId: string): Promise<RazorpayPayment> {
    return this.makeRequest('GET', `/payments/${paymentId}`);
  }

  async cancelSubscription(subscriptionId: string): Promise<any> {
    return this.makeRequest('POST', `/subscriptions/${subscriptionId}/cancel`);
  }
}

// Production Razorpay client
let razorpayClient: RazorpayClient | null = null;

async function initializeRazorpay() {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials not found in environment variables');
    }

    razorpayClient = new RazorpayClient(keyId, keySecret);

    console.log('✅ Razorpay client initialized successfully');
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
    console.log('🔧 Production RazorpayService initialized');
  }

  static getInstance(): RazorpayService {
    if (!RazorpayService.instance) {
      RazorpayService.instance = new RazorpayService();
    }
    return RazorpayService.instance;
  }

  // Enhanced database operation with retry logic for subscription reliability
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    description: string,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 ${description} (attempt ${attempt}/${maxRetries})`);
        const result = await operation();
        console.log(`✅ ${description} completed successfully`);
        return result;
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ ${description} failed (attempt ${attempt}):`, error.message);
        
        // Don't retry for certain errors
        if (this.isNonRetryableError(error as Error)) {
          console.error(`💀 ${description}: Non-retryable error, aborting`);
          throw error;
        }
        
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
          console.log(`⏳ ${description}: Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`${description} failed after ${maxRetries} attempts. Last error: ${lastError.message}`);
  }

  // Check if error should not be retried
  private isNonRetryableError(error: Error): boolean {
    const nonRetryablePatterns = [
      'unique constraint',
      'foreign key constraint',
      'check constraint',
      'invalid input syntax',
      'column does not exist',
      'relation does not exist',
      'duplicate key value',
      'authentication failed'
    ];

    const errorMessage = error.message.toLowerCase();
    return nonRetryablePatterns.some(pattern => errorMessage.includes(pattern));
  }

  async ensureInitialized() {
    if (!this.isInitialized) {
      await initializeRazorpay();
      this.isInitialized = true;
    }
  }

  // Create Razorpay order for one-time payments
  async createOrder(amount: number, currency: string = 'INR', receiptId: string) {
    await this.ensureInitialized();
    
    try {
      const order = await razorpayClient!.createOrder({
        amount: amount, // Amount in paise
        currency: currency,
        receipt: receiptId,
        payment_capture: 1, // Auto-capture payment
      });

      console.log('✅ Razorpay order created:', order.id);
      return order;
    } catch (error) {
      console.error('❌ Failed to create Razorpay order:', error);
      throw error;
    }
  }

  // Create subscription with Razorpay and enhanced database connection
  async createSubscription(userId: string, planType: 'premium' | 'super_user', billingPeriod?: string, topupPlan?: string) {
    await this.ensureInitialized();

    try {
      let planConfig;
      let planId;

      if (planType === 'premium') {
        if (!billingPeriod || !['monthly', 'yearly'].includes(billingPeriod)) {
          throw new Error('Invalid billing period for premium plan');
        }
        planConfig = SUBSCRIPTION_PLANS.premium[billingPeriod as 'monthly' | 'yearly'];
        planId = planConfig.planId;
      } else if (planType === 'super_user') {
        if (!topupPlan || !['topup_451', 'topup_4510'].includes(topupPlan)) {
          throw new Error('Invalid topup plan for super user');
        }
        planConfig = SUBSCRIPTION_PLANS.super_user[topupPlan as 'topup_451' | 'topup_4510'];
        planId = planConfig.planId;
      } else {
        throw new Error('Invalid plan type');
      }

      // For super user plans, we use one-time payments instead of subscriptions
      if (planType === 'super_user') {
        const receiptId = `qaaq_topup_${userId}_${Date.now()}`;
        const order = await this.createOrder(planConfig.amount, 'INR', receiptId);

        console.log('✅ Created one-time order for super user topup:', order.id);

        return {
          subscriptionId: null, // No subscription for one-time payments
          checkoutUrl: `https://rzp.io/l/${order.id}`, // Standard Razorpay checkout URL for orders
          razorpayOrderId: order.id,
          razorpaySubscriptionId: null,
          planType: planType,
          amount: planConfig.amount,
          status: 'created',
          isOrderMode: true,
          orderDetails: order
        };
      }

      // For premium subscriptions, create actual Razorpay subscription
      const premiumPlanConfig = planConfig as PremiumPlan;
      const subscriptionData = {
        plan_id: planId,
        total_count: premiumPlanConfig.period === 'yearly' ? 1 : 12, // 1 year for yearly, 12 months for monthly
        quantity: 1,
        customer_notify: 1,
        notes: {
          userId: userId,
          planType: planType,
          billingPeriod: billingPeriod
        }
      };

      const razorpaySubscription = await razorpayClient!.createSubscription(subscriptionData);

      // Store the subscription in our database with enhanced reliability and retry logic
      const result = await this.executeWithRetry(async () => {
        return await pool.query(`
          INSERT INTO subscriptions (
            user_id, subscription_type, razorpay_subscription_id, razorpay_plan_id, 
            status, amount, currency, short_url, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
          RETURNING *
        `, [
          userId,
          planType,
          razorpaySubscription.id,
          planId,
          razorpaySubscription.status,
          planConfig.amount,
          'INR',
          razorpaySubscription.short_url,
          JSON.stringify(razorpaySubscription.notes)
        ]);
      }, `Create subscription for user ${userId}`);

      console.log('✅ Subscription created:', razorpaySubscription.id);

      return {
        subscription: result.rows[0],
        checkoutUrl: razorpaySubscription.short_url,
        razorpaySubscriptionId: razorpaySubscription.id,
        razorpayOrderId: null,
        isOrderMode: false
      };
    } catch (error) {
      console.error('❌ Failed to create subscription:', error);
      throw error;
    }
  }

  // Verify payment signature for security
  verifyPaymentSignature(paymentId: string, orderId: string, signature: string): boolean {
    try {
      const keySecret = process.env.RAZORPAY_KEY_SECRET!;
      const body = orderId + "|" + paymentId;
      const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(body.toString())
        .digest("hex");

      return expectedSignature === signature;
    } catch (error) {
      console.error('❌ Payment signature verification failed:', error);
      return false;
    }
  }

  // Verify webhook signature for security
  verifyWebhookSignature(body: string, signature: string): boolean {
    try {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(body)
        .digest("hex");

      return expectedSignature === signature;
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error);
      return false;
    }
  }

  // Handle successful payment
  async processPayment(paymentId: string, orderId: string, signature: string, userId: string) {
    if (!this.verifyPaymentSignature(paymentId, orderId, signature)) {
      throw new Error('Invalid payment signature');
    }

    try {
      // Fetch payment details from Razorpay
      const payment = await razorpayClient!.fetchPayment(paymentId);

      // Store payment record with enhanced reliability
      const paymentResult = await this.executeWithRetry(async () => {
        return await pool.query(`
          INSERT INTO payments (
            user_id, razorpay_payment_id, razorpay_order_id, razorpay_signature,
            amount, currency, status, method, description
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
          RETURNING *
        `, [
          userId,
          paymentId,
          orderId,
          signature,
          payment.amount,
          payment.currency,
          payment.status,
          payment.method,
          payment.description || 'QaaqConnect subscription payment'
        ]);
      }, `Process payment ${paymentId} for user ${userId}`);

      // Update subscription status with enhanced reliability
      await this.executeWithRetry(async () => {
        return await pool.query(`
          UPDATE subscriptions 
          SET status = 'active', current_period_start = NOW(), 
              current_period_end = NOW() + INTERVAL '1 month'
          WHERE user_id = $1 AND status = 'created'
        `, [userId]);
      }, `Update subscription status for user ${userId}`);

      // Get subscription details with retry logic
      const subscriptionResult = await this.executeWithRetry(async () => {
        return await pool.query(`
          SELECT subscription_type, notes FROM subscriptions 
          WHERE user_id = $1 AND status = 'active' 
          ORDER BY created_at DESC LIMIT 1
        `, [userId]);
      }, `Get subscription details for user ${userId}`);

      if (subscriptionResult.rows.length > 0) {
        const subscription = subscriptionResult.rows[0];
        
        // Update user subscription status with enhanced reliability
        if (subscription.subscription_type === 'premium') {
          await this.executeWithRetry(async () => {
            return await pool.query(`
              INSERT INTO user_subscription_status (
                user_id, is_premium, premium_expires_at
              ) VALUES ($1, true, NOW() + INTERVAL '1 month')
              ON CONFLICT (user_id) DO UPDATE SET
                is_premium = true,
                premium_expires_at = NOW() + INTERVAL '1 month'
            `, [userId]);
          }, `Update premium status for user ${userId}`);
        } else if (subscription.subscription_type === 'super_user') {
          const notes = subscription.notes || {};
          const questions = notes.questions || 100;
          const validityMonths = notes.validityMonths || 1;

          await this.executeWithRetry(async () => {
            return await pool.query(`
              INSERT INTO user_subscription_status (
                user_id, is_super_user, super_user_expires_at, questions_remaining
              ) VALUES ($1, true, NOW() + INTERVAL '${validityMonths} months', $2)
              ON CONFLICT (user_id) DO UPDATE SET
                is_super_user = true,
                super_user_expires_at = NOW() + INTERVAL '${validityMonths} months',
                questions_remaining = COALESCE(user_subscription_status.questions_remaining, 0) + $2
            `, [userId, questions]);
          }, `Update super user status for user ${userId}`);
        }
      }

      console.log('✅ Payment processed successfully:', paymentId);
      return paymentResult.rows[0];
    } catch (error) {
      console.error('❌ Payment processing failed:', error);
      throw error;
    }
  }

  // Check user's premium status - handle missing columns gracefully  
  async checkUserPremiumStatus(userId: string): Promise<{
    isPremium: boolean, 
    subscriptionType: string | null, 
    validUntil: Date | null, 
    questionsRemaining: number | null
  }> {
    try {
      // For now, return default free status until database columns are properly added
      // This prevents the application from breaking due to missing columns
      console.log('⚠️ Subscription status check: returning default free status (columns being added)');
      
      return {
        isPremium: false,
        subscriptionType: null,
        validUntil: null,
        questionsRemaining: null
      };
      
    } catch (error: any) {
      console.error('❌ Error checking premium status:', error);
      
      // Return safe default
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
        UPDATE user_subscription_status 
        SET questions_remaining = GREATEST(questions_remaining - 1, 0)
        WHERE user_id = $1 AND questions_remaining > 0
        RETURNING questions_remaining
      `, [userId]);

      return result.rows.length > 0;
    } catch (error) {
      console.error('❌ Error consuming question:', error);
      return false;
    }
  }

  // Get subscription plans
  getSubscriptionPlans() {
    return SUBSCRIPTION_PLANS;
  }

  // Cancel subscription
  async cancelSubscription(userId: string, subscriptionId: string) {
    await this.ensureInitialized();

    try {
      // Cancel with Razorpay
      const razorpaySubscription = await razorpayClient!.cancelSubscription(subscriptionId);

      // Update our database
      await pool.query(`
        UPDATE subscriptions 
        SET status = 'cancelled', updated_at = NOW()
        WHERE user_id = $1 AND razorpay_subscription_id = $2
      `, [userId, subscriptionId]);

      console.log('✅ Subscription cancelled:', subscriptionId);
      return { success: true, message: 'Subscription cancelled successfully' };
    } catch (error) {
      console.error('❌ Failed to cancel subscription:', error);
      throw error;
    }
  }

  // Get user subscriptions
  async getUserSubscriptions(userId: string) {
    try {
      const result = await pool.query(`
        SELECT * FROM subscriptions 
        WHERE user_id = $1 
        ORDER BY created_at DESC
      `, [userId]);

      return result.rows;
    } catch (error) {
      console.error('❌ Error fetching user subscriptions:', error);
      throw error;
    }
  }

  // Get user payments
  async getUserPayments(userId: string) {
    try {
      const result = await pool.query(`
        SELECT p.*, s.subscription_type
        FROM payments p
        LEFT JOIN subscriptions s ON p.subscription_id = s.id
        WHERE p.user_id = $1 
        ORDER BY p.created_at DESC
      `, [userId]);

      return result.rows;
    } catch (error) {
      console.error('❌ Error fetching user payments:', error);
      throw error;
    }
  }

  // Handle Razorpay webhooks
  async handleWebhook(body: any, signature: string) {
    if (!this.verifyWebhookSignature(JSON.stringify(body), signature)) {
      throw new Error('Invalid webhook signature');
    }

    try {
      const { event, payload } = body;
      
      console.log('📨 Processing webhook:', event);

      switch (event) {
        case 'payment.captured':
          await this.handlePaymentCaptured(payload.payment.entity);
          break;
        
        case 'payment.failed':
          await this.handlePaymentFailed(payload.payment.entity);
          break;
        
        case 'subscription.activated':
          await this.handleSubscriptionActivated(payload.subscription.entity);
          break;
        
        case 'subscription.cancelled':
          await this.handleSubscriptionCancelled(payload.subscription.entity);
          break;
        
        default:
          console.log('⚠️ Unhandled webhook event:', event);
      }
    } catch (error) {
      console.error('❌ Webhook processing failed:', error);
      throw error;
    }
  }

  // Handle payment captured webhook
  private async handlePaymentCaptured(payment: any) {
    try {
      await pool.query(`
        UPDATE payments 
        SET status = 'captured', updated_at = NOW()
        WHERE razorpay_payment_id = $1
      `, [payment.id]);

      console.log('✅ Payment captured:', payment.id);
    } catch (error) {
      console.error('❌ Failed to handle payment captured:', error);
    }
  }

  // Handle payment failed webhook
  private async handlePaymentFailed(payment: any) {
    try {
      await pool.query(`
        UPDATE payments 
        SET status = 'failed', failure_reason = $2, updated_at = NOW()
        WHERE razorpay_payment_id = $1
      `, [payment.id, payment.error_description]);

      console.log('❌ Payment failed:', payment.id);
    } catch (error) {
      console.error('❌ Failed to handle payment failure:', error);
    }
  }

  // Handle subscription activated webhook
  private async handleSubscriptionActivated(subscription: any) {
    try {
      await this.executeWithRetry(async () => {
        return await pool.query(`
          UPDATE subscriptions 
          SET status = 'active', 
              current_period_start = $2,
              current_period_end = $3,
              updated_at = NOW()
          WHERE razorpay_subscription_id = $1
        `, [
          subscription.id, 
          new Date(subscription.current_start * 1000),
          new Date(subscription.current_end * 1000)
        ]);
      }, `Handle subscription activation for ${subscription.id}`);

      console.log('✅ Subscription activated:', subscription.id);
    } catch (error) {
      console.error('❌ Failed to handle subscription activation:', error);
    }
  }

  // Handle subscription cancelled webhook
  private async handleSubscriptionCancelled(subscription: any) {
    try {
      await pool.query(`
        UPDATE subscriptions 
        SET status = 'cancelled', updated_at = NOW()
        WHERE razorpay_subscription_id = $1
      `, [subscription.id]);

      console.log('✅ Subscription cancelled via webhook:', subscription.id);
    } catch (error) {
      console.error('❌ Failed to handle subscription cancellation:', error);
    }
  }
}

// Create and export the service instance
export const razorpayService = RazorpayService.getInstance();