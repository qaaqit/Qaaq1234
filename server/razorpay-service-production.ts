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
  checkoutUrl?: string; // Fixed subscription link
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
      planId: 'plan_R6tDNXxZMxBIJR', // Real Razorpay plan ID created
      amount: 45100, // ₹451 in paise
      period: 'monthly',
      interval: 1,
      name: 'Premium Monthly Plan',
      description: 'Enhanced QBOT features and priority support',
      displayPrice: '₹451',
      checkoutUrl: 'https://rzp.io/rzp/jwQW9TW' // Fixed subscription link
    },
    yearly: {
      planId: 'plan_premium_yearly',
      amount: 261100, // ₹2611 in paise
      period: 'yearly',
      interval: 1,
      name: 'Premium Yearly Plan',
      description: 'Enhanced QBOT features and priority support - Save ₹2,801',
      displayPrice: '₹2,611',
      savings: '₹2,801 (6+ months free)',
      checkoutUrl: 'https://rzp.io/rzp/NAU59cv' // Fixed yearly subscription link
    }
  },
  super_user: {
    topup_451: {
      planId: 'plan_super_topup_451',
      amount: 55100, // ₹551 in paise (minimum topup)
      name: 'Super User Starter Pack',
      description: 'Pay per question - 122 questions included',
      displayPrice: '₹451',
      questions: 122, // ₹551 ÷ ₹4.51 = 122 questions
      perQuestionRate: 4.51,
      validityMonths: 1,
      features: ['122 questions', '1 month validity', '₹4.51 per question']
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
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 ${description} (attempt ${attempt}/${maxRetries})`);
        const result = await operation();
        console.log(`✅ ${description} completed successfully`);
        return result;
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ ${description} failed (attempt ${attempt}):`, (error as Error).message);
        
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
    
    throw new Error(`${description} failed after ${maxRetries} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
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

      // For premium subscriptions, use the fixed checkout URL
      const premiumPlanConfig = planConfig as PremiumPlan;
      
      // Use fixed checkout URL if available, otherwise create subscription
      if (premiumPlanConfig.checkoutUrl) {
        // Generate a unique subscription ID for tracking
        const subscriptionId = `fixed_sub_${userId}_${Date.now()}`;
        
        // Store the subscription in our database with the fixed checkout URL
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
            subscriptionId, // Use our generated ID
            planId,
            'created', // Initial status
            planConfig.amount,
            'INR',
            premiumPlanConfig.checkoutUrl, // Use fixed URL
            JSON.stringify({ userId, planType, billingPeriod, source: 'fixed_checkout' })
          ]);
        }, `Create subscription for user ${userId}`);

        console.log('✅ Subscription created with fixed checkout URL:', subscriptionId);

        return {
          subscription: result.rows[0],
          checkoutUrl: premiumPlanConfig.checkoutUrl, // Use your provided URL
          razorpaySubscriptionId: subscriptionId,
          razorpayOrderId: null,
          planType: planType,
          amount: planConfig.amount,
          status: 'created'
        };
      }

      // Fallback: create dynamic subscription if no fixed URL
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

  // Check user's premium status - production ready
  async checkUserPremiumStatus(userId: string): Promise<{
    isPremium: boolean,
    isSuperUser: boolean,
    subscriptionType: string | null, 
    premiumExpiresAt: string | null, 
    questionsRemaining: number | null
  }> {
    try {
      console.log(`🔍 Checking premium status for user: ${userId}`);
      
      // Check user_subscription_status table first
      const statusResult = await pool.query(`
        SELECT 
          is_premium,
          COALESCE(is_super_user, false) as is_super_user,
          premium_expires_at,
          COALESCE(super_user_expires_at, NULL) as super_user_expires_at,
          COALESCE(questions_remaining, 0) as questions_remaining,
          subscription_type
        FROM user_subscription_status 
        WHERE user_id = $1
      `, [userId]);

      if (statusResult.rows.length > 0) {
        const status = statusResult.rows[0];
        const now = new Date();
        
        // Check if premium is still valid
        const isPremiumValid = status.is_premium && 
          (!status.premium_expires_at || new Date(status.premium_expires_at) > now);
        
        // Check if super user is still valid
        const isSuperUserValid = status.is_super_user && 
          (!status.super_user_expires_at || new Date(status.super_user_expires_at) > now);

        return {
          isPremium: isPremiumValid || false,
          isSuperUser: isSuperUserValid || false,
          subscriptionType: status.subscription_type,
          premiumExpiresAt: status.premium_expires_at,
          questionsRemaining: status.questions_remaining
        };
      }

      // Fallback: check subscriptions table for active subscriptions
      const subscriptionResult = await pool.query(`
        SELECT 
          subscription_type,
          status,
          created_at,
          notes
        FROM subscriptions 
        WHERE user_id = $1 AND status = 'active'
        ORDER BY created_at DESC 
        LIMIT 1
      `, [userId]);

      if (subscriptionResult.rows.length > 0) {
        const subscription = subscriptionResult.rows[0];
        return {
          isPremium: subscription.subscription_type === 'premium',
          isSuperUser: subscription.subscription_type === 'super_user',
          subscriptionType: subscription.subscription_type,
          premiumExpiresAt: null,
          questionsRemaining: null
        };
      }

      // No subscription found
      return {
        isPremium: false,
        isSuperUser: false,
        subscriptionType: null,
        premiumExpiresAt: null,
        questionsRemaining: null
      };
      
    } catch (error: any) {
      console.error('❌ Error checking premium status:', error);
      
      // Return safe default on error
      return {
        isPremium: false,
        isSuperUser: false,
        subscriptionType: null,
        premiumExpiresAt: null,
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

  // Admin method to manually link QR payment to user
  async linkQRPaymentToUser(paymentId: string, userId: string): Promise<boolean> {
    try {
      console.log(`🔗 Linking QR payment ${paymentId} to user ${userId}`);
      
      // Find the pending subscription
      const pendingResult = await pool.query(`
        SELECT * FROM subscriptions 
        WHERE razorpay_payment_id = $1 AND status = 'qr_pending'
      `, [paymentId]);

      if (pendingResult.rows.length === 0) {
        throw new Error('No pending QR subscription found for this payment');
      }

      const subscription = pendingResult.rows[0];
      const notes = JSON.parse(subscription.notes || '{}');
      const billingPeriod = notes.billingPeriod;
      
      // Update subscription with user ID and activate it
      await this.executeWithRetry(async () => {
        return await pool.query(`
          UPDATE subscriptions 
          SET user_id = $1, status = 'active',
              current_period_start = NOW(),
              current_period_end = NOW() + INTERVAL '1 ${billingPeriod === 'yearly' ? 'year' : 'month'}'
          WHERE razorpay_payment_id = $2
        `, [userId, paymentId]);
      }, `Link QR payment ${paymentId} to user ${userId}`);

      // Update user premium status
      const expiryInterval = billingPeriod === 'yearly' ? '1 year' : '1 month';
      await this.executeWithRetry(async () => {
        return await pool.query(`
          INSERT INTO user_subscription_status (
            user_id, is_premium, premium_expires_at
          ) VALUES ($1, true, NOW() + INTERVAL '${expiryInterval}')
          ON CONFLICT (user_id) DO UPDATE SET
            is_premium = true,
            premium_expires_at = NOW() + INTERVAL '${expiryInterval}'
        `, [userId]);
      }, `Update premium status for user ${userId}`);

      // Link the payment to the user
      await pool.query(`
        UPDATE payments 
        SET user_id = $1 
        WHERE razorpay_payment_id = $2
      `, [userId, paymentId]);

      console.log(`✅ Successfully linked QR payment ${paymentId} to user ${userId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to link QR payment to user:`, error);
      return false;
    }
  }

  // Get pending QR payments (admin function)
  async getPendingQRPayments() {
    try {
      const result = await pool.query(`
        SELECT 
          s.id,
          s.razorpay_payment_id,
          s.subscription_type,
          s.amount,
          s.currency,
          s.notes,
          p.method,
          p.created_at,
          p.contact
        FROM subscriptions s
        JOIN payments p ON s.razorpay_payment_id = p.razorpay_payment_id
        WHERE s.status = 'qr_pending'
        ORDER BY p.created_at DESC
      `);

      return result.rows.map(row => ({
        id: row.id,
        paymentId: row.razorpay_payment_id,
        subscriptionType: row.subscription_type,
        amount: row.amount,
        currency: row.currency,
        method: row.method,
        contact: row.contact,
        createdAt: row.created_at,
        notes: JSON.parse(row.notes || '{}')
      }));
    } catch (error) {
      console.error('❌ Error fetching pending QR payments:', error);
      return [];
    }
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
        case 'qr_code.credited':
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

  // Handle payment captured webhook - includes Card and UPI payments
  async handlePaymentCaptured(payment: any) {
    try {
      console.log('📨 Processing payment capture webhook:', {
        paymentId: payment.id,
        amount: payment.amount,
        email: payment.email,
        contact: payment.contact,
        method: payment.method
      });

      // Check if this is a payment that matches subscription amounts
      const amount = payment.amount;
      let subscriptionType = null;
      let billingPeriod = null;
      
      // Match payment amount to subscription plans
      if (amount === 45100) { // ₹451 monthly premium
        subscriptionType = 'premium';
        billingPeriod = 'monthly';
      } else if (amount === 261100) { // ₹2611 yearly premium
        subscriptionType = 'premium';
        billingPeriod = 'yearly';
      }

      // Try to identify user by email from payment details
      let userId = null;
      if (payment.email) {
        try {
          const userResult = await pool.query(`
            SELECT id, full_name, email FROM users WHERE email = $1 LIMIT 1
          `, [payment.email]);
          
          if (userResult.rows.length > 0) {
            userId = userResult.rows[0].id;
            console.log('✅ Found user by email:', {
              userId,
              email: payment.email,
              name: userResult.rows[0].full_name
            });
          } else {
            console.log('⚠️ No user found with email:', payment.email);
          }
        } catch (error) {
          console.error('❌ Error looking up user by email:', error);
        }
      }

      // Store the payment record
      await pool.query(`
        INSERT INTO payments (
          user_id, razorpay_payment_id, amount, currency, status, method, 
          description, payment_source, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
        ON CONFLICT (razorpay_payment_id) DO UPDATE SET
          status = 'captured', updated_at = NOW()
      `, [
        userId, // Include user_id if found
        payment.id,
        payment.amount,
        payment.currency,
        'captured',
        payment.method,
        subscriptionType ? `Premium Payment - ${subscriptionType} ${billingPeriod}` : 'Payment via Razorpay',
        payment.method === 'upi' ? 'upi' : 'card',
        JSON.stringify({
          subscriptionType,
          billingPeriod,
          contact: payment.contact,
          email: payment.email,
          vpa: payment.vpa,
          paymentMethod: payment.method
        })
      ]);

      // If this matches a subscription plan and we found the user, activate premium
      if (subscriptionType && userId) {
        console.log(`🎯 Premium payment matched for user ${userId}: ${billingPeriod} ${subscriptionType}`);
        
        // Create or update subscription record
        const subscriptionResult = await this.executeWithRetry(async () => {
          return await pool.query(`
            INSERT INTO subscriptions (
              user_id, subscription_type, razorpay_payment_id, amount, currency, 
              status, notes, razorpay_plan_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            ON CONFLICT (razorpay_payment_id) 
            DO UPDATE SET 
              user_id = $1,
              amount = $4,
              status = 'active',
              updated_at = NOW()
            RETURNING *
          `, [
            userId,
            subscriptionType,
            payment.id,
            payment.amount,
            payment.currency,
            'active',
            JSON.stringify({
              billingPeriod,
              paymentMethod: payment.method,
              email: payment.email,
              activatedAt: new Date()
            }),
            billingPeriod === 'monthly' ? 'plan_R6tDNXxZMxBIJR' : 'plan_premium_yearly'
          ]);
        }, `Create/update subscription for user ${userId}`);

        // Update user premium status
        const expiryDate = billingPeriod === 'yearly' ? 
          'NOW() + INTERVAL \'1 year\'' : 
          'NOW() + INTERVAL \'1 month\'';

        await this.executeWithRetry(async () => {
          return await pool.query(`
            INSERT INTO user_subscription_status (
              user_id, is_premium, premium_expires_at, subscription_type, updated_at
            ) VALUES ($1, true, ${expiryDate}, $2, NOW())
            ON CONFLICT (user_id) 
            DO UPDATE SET 
              is_premium = true, 
              premium_expires_at = ${expiryDate},
              subscription_type = $2,
              updated_at = NOW()
          `, [userId, subscriptionType]);
        }, `Update user premium status for user ${userId}`);

        console.log('✅ User upgraded to premium:', {
          userId,
          email: payment.email,
          plan: `${billingPeriod} ${subscriptionType}`,
          amount: `₹${payment.amount / 100}`
        });

      } else if (subscriptionType && !userId) {
        // Payment matches subscription but no user found - create pending record
        console.log(`⚠️ Premium payment without user match - creating pending record`);
        
        await pool.query(`
          INSERT INTO subscriptions (
            subscription_type, razorpay_payment_id, amount, currency, 
            status, notes, razorpay_plan_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          subscriptionType,
          payment.id,
          payment.amount,
          payment.currency,
          'pending_user', // Status indicating payment captured but user not identified
          JSON.stringify({
            billingPeriod,
            paymentMethod: payment.method,
            email: payment.email,
            contact: payment.contact,
            awaitingUserLink: true,
            paymentCapturedAt: new Date()
          }),
          billingPeriod === 'monthly' ? 'plan_R6tDNXxZMxBIJR' : 'plan_premium_yearly'
        ]);

        console.log('📋 Pending subscription created - admin can manually link to user');
      }

      console.log('✅ Payment captured and processed:', payment.id);
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