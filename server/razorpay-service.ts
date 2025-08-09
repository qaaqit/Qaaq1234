import { db } from "./db";
import { subscriptions, payments, userSubscriptionStatus, users } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

// Razorpay configuration
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.warn('⚠️ Razorpay credentials not found. Payment features will be disabled.');
}

// Subscription plans configuration
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

// Mock Razorpay client for development (will be replaced with real client when package is installed)
const createMockRazorpayClient = () => ({
  plans: {
    create: async (planData: any) => ({
      id: `plan_mock_${Date.now()}`,
      entity: 'plan',
      interval: planData.interval,
      period: planData.period,
      item: planData.item,
      notes: planData.notes,
      created_at: Math.floor(Date.now() / 1000)
    }),
    fetch: async (planId: string) => ({
      id: planId,
      entity: 'plan',
      interval: 1,
      period: 'monthly',
      item: { name: 'Mock Plan', amount: 29900, currency: 'INR' }
    })
  },
  subscriptions: {
    create: async (subscriptionData: any) => ({
      id: `sub_mock_${Date.now()}`,
      entity: 'subscription',
      status: 'created',
      current_start: Math.floor(Date.now() / 1000),
      current_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
      plan_id: subscriptionData.plan_id,
      customer_id: subscriptionData.customer_id,
      short_url: `https://rzp.io/mock_${Date.now()}`,
      notes: subscriptionData.notes
    }),
    fetch: async (subscriptionId: string) => ({
      id: subscriptionId,
      entity: 'subscription',
      status: 'active',
      current_start: Math.floor(Date.now() / 1000),
      current_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000)
    }),
    cancel: async (subscriptionId: string) => ({
      id: subscriptionId,
      entity: 'subscription',
      status: 'cancelled'
    })
  },
  payments: {
    fetch: async (paymentId: string) => ({
      id: paymentId,
      entity: 'payment',
      status: 'captured',
      amount: 29900,
      currency: 'INR',
      method: 'card'
    })
  }
});

// Initialize Razorpay client
let razorpayClient: any;
try {
  // This will work when razorpay package is properly installed
  const Razorpay = require('razorpay');
  razorpayClient = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
} catch (error) {
  console.log('📦 Using mock Razorpay client for development');
  razorpayClient = createMockRazorpayClient();
}

export class RazorpayService {
  
  // Create a subscription or topup for a user
  async createSubscription(userId: string, planType: 'premium' | 'super_user', billingPeriod?: 'monthly' | 'yearly', topupPlan?: string) {
    try {
      let plan: any;
      
      if (planType === 'premium') {
        if (!billingPeriod) {
          throw new Error('Billing period required for premium subscriptions');
        }
        plan = SUBSCRIPTION_PLANS.premium[billingPeriod];
      } else if (planType === 'super_user') {
        if (!topupPlan) {
          throw new Error('Topup plan required for super user');
        }
        plan = SUBSCRIPTION_PLANS.super_user[topupPlan];
      }
      
      if (!plan) {
        throw new Error('Invalid plan configuration');
      }

      // Get user details
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        throw new Error('User not found');
      }

      // Create subscription/topup in Razorpay
      const subscriptionData = {
        plan_id: plan.planId,
        customer_notify: 1,
        total_count: planType === 'premium' && billingPeriod === 'yearly' ? 1 : 12,
        quantity: 1,
        notes: {
          userId: userId,
          planType: planType,
          billingPeriod: billingPeriod || 'topup',
          topupPlan: topupPlan,
          userEmail: user.email,
          questions: plan.questions || 0,
          validityMonths: plan.validityMonths || (billingPeriod === 'yearly' ? 12 : 1)
        }
      };

      const razorpaySubscription = await razorpayClient.subscriptions.create(subscriptionData);

      // Store subscription in database
      const [subscription] = await db.insert(subscriptions).values({
        userId: userId,
        subscriptionType: planType,
        razorpaySubscriptionId: razorpaySubscription.id,
        razorpayPlanId: plan.planId,
        status: razorpaySubscription.status,
        currentPeriodStart: razorpaySubscription.current_start ? new Date(razorpaySubscription.current_start * 1000) : undefined,
        currentPeriodEnd: razorpaySubscription.current_end ? new Date(razorpaySubscription.current_end * 1000) : undefined,
        totalCount: subscriptionData.total_count,
        shortUrl: razorpaySubscription.short_url,
        amount: plan.amount,
        currency: 'INR',
        notes: subscriptionData.notes
      }).returning();

      return {
        success: true,
        subscription: subscription,
        checkoutUrl: razorpaySubscription.short_url,
        razorpaySubscriptionId: razorpaySubscription.id
      };

    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  // Handle Razorpay webhook events
  async handleWebhook(body: any, signature: string) {
    try {
      // Verify webhook signature
      if (RAZORPAY_WEBHOOK_SECRET) {
        const expectedSignature = crypto
          .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
          .update(JSON.stringify(body))
          .digest('hex');

        if (signature !== expectedSignature) {
          throw new Error('Invalid webhook signature');
        }
      }

      const event = body.event;
      const payload = body.payload;

      switch (event) {
        case 'subscription.activated':
          await this.handleSubscriptionActivated(payload.subscription.entity);
          break;
        
        case 'subscription.charged':
          await this.handleSubscriptionCharged(payload.payment.entity);
          break;
        
        case 'subscription.cancelled':
          await this.handleSubscriptionCancelled(payload.subscription.entity);
          break;
        
        case 'subscription.completed':
          await this.handleSubscriptionCompleted(payload.subscription.entity);
          break;
        
        case 'payment.captured':
          await this.handlePaymentCaptured(payload.payment.entity);
          break;
        
        case 'payment.failed':
          await this.handlePaymentFailed(payload.payment.entity);
          break;
      }

      return { success: true };
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }

  // Handle subscription activation
  private async handleSubscriptionActivated(subscriptionData: any) {
    const [subscription] = await db
      .update(subscriptions)
      .set({
        status: 'active',
        currentPeriodStart: new Date(subscriptionData.current_start * 1000),
        currentPeriodEnd: new Date(subscriptionData.current_end * 1000),
        updatedAt: new Date()
      })
      .where(eq(subscriptions.razorpaySubscriptionId, subscriptionData.id))
      .returning();

    if (subscription) {
      await this.updateUserSubscriptionStatus(subscription.userId, subscription.subscriptionType as 'premium' | 'super_user', true);
    }
  }

  // Handle successful payment
  private async handleSubscriptionCharged(paymentData: any) {
    // Create payment record
    const [payment] = await db.insert(payments).values({
      userId: paymentData.notes?.userId || '',
      razorpayPaymentId: paymentData.id,
      razorpayOrderId: paymentData.order_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: paymentData.status,
      method: paymentData.method,
      description: paymentData.description
    }).returning();

    // Update subscription paid count
    if (paymentData.subscription_id) {
      await db
        .update(subscriptions)
        .set({
          paidCount: db.select().from(subscriptions).where(eq(subscriptions.razorpaySubscriptionId, paymentData.subscription_id)),
          updatedAt: new Date()
        })
        .where(eq(subscriptions.razorpaySubscriptionId, paymentData.subscription_id));
    }
  }

  // Handle subscription cancellation
  private async handleSubscriptionCancelled(subscriptionData: any) {
    const [subscription] = await db
      .update(subscriptions)
      .set({
        status: 'cancelled',
        updatedAt: new Date()
      })
      .where(eq(subscriptions.razorpaySubscriptionId, subscriptionData.id))
      .returning();

    if (subscription) {
      await this.updateUserSubscriptionStatus(subscription.userId, subscription.subscriptionType as 'premium' | 'super_user', false);
    }
  }

  // Handle subscription completion
  private async handleSubscriptionCompleted(subscriptionData: any) {
    const [subscription] = await db
      .update(subscriptions)
      .set({
        status: 'completed',
        updatedAt: new Date()
      })
      .where(eq(subscriptions.razorpaySubscriptionId, subscriptionData.id))
      .returning();

    if (subscription) {
      await this.updateUserSubscriptionStatus(subscription.userId, subscription.subscriptionType as 'premium' | 'super_user', false);
    }
  }

  // Handle payment capture
  private async handlePaymentCaptured(paymentData: any) {
    await db
      .update(payments)
      .set({
        status: 'captured',
        updatedAt: new Date()
      })
      .where(eq(payments.razorpayPaymentId, paymentData.id));
  }

  // Handle payment failure
  private async handlePaymentFailed(paymentData: any) {
    await db
      .update(payments)
      .set({
        status: 'failed',
        failureReason: paymentData.error_description,
        updatedAt: new Date()
      })
      .where(eq(payments.razorpayPaymentId, paymentData.id));
  }

  // Update user subscription status
  private async updateUserSubscriptionStatus(userId: string, subscriptionType: 'premium' | 'super_user', isActive: boolean) {
    const expirationField = subscriptionType === 'premium' ? 'premiumExpiresAt' : 'superUserExpiresAt';
    const statusField = subscriptionType === 'premium' ? 'isPremium' : 'isSuperUser';
    const subscriptionIdField = subscriptionType === 'premium' ? 'currentPremiumSubscriptionId' : 'currentSuperUserSubscriptionId';

    // Get current subscription details
    const [activeSubscription] = await db
      .select()
      .from(subscriptions)
      .where(and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.subscriptionType, subscriptionType),
        eq(subscriptions.status, 'active')
      ))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    const expiresAt = isActive && activeSubscription?.currentPeriodEnd ? activeSubscription.currentPeriodEnd : null;

    // Upsert user subscription status
    await db
      .insert(userSubscriptionStatus)
      .values({
        userId: userId,
        [statusField]: isActive,
        [expirationField]: expiresAt,
        [subscriptionIdField]: isActive ? activeSubscription?.id : null,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: userSubscriptionStatus.userId,
        set: {
          [statusField]: isActive,
          [expirationField]: expiresAt,
          [subscriptionIdField]: isActive ? activeSubscription?.id : null,
          updatedAt: new Date()
        }
      });
  }

  // Get user's current subscription status
  async getUserSubscriptionStatus(userId: string) {
    const [status] = await db
      .select()
      .from(userSubscriptionStatus)
      .where(eq(userSubscriptionStatus.userId, userId));

    return status || {
      isPremium: false,
      isSuperUser: false,
      premiumExpiresAt: null,
      superUserExpiresAt: null
    };
  }

  // Get user's subscription history
  async getUserSubscriptions(userId: string) {
    return await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt));
  }

  // Get user's payment history
  async getUserPayments(userId: string) {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt));
  }

  // Cancel a subscription
  async cancelSubscription(userId: string, subscriptionId: string) {
    try {
      // Verify subscription belongs to user
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(and(
          eq(subscriptions.id, subscriptionId),
          eq(subscriptions.userId, userId)
        ));

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (!subscription.razorpaySubscriptionId) {
        throw new Error('Razorpay subscription ID not found');
      }

      // Cancel in Razorpay
      await razorpayClient.subscriptions.cancel(subscription.razorpaySubscriptionId);

      // Update local database
      await db
        .update(subscriptions)
        .set({
          status: 'cancelled',
          updatedAt: new Date()
        })
        .where(eq(subscriptions.id, subscriptionId));

      // Update user status
      await this.updateUserSubscriptionStatus(userId, subscription.subscriptionType as 'premium' | 'super_user', false);

      return { success: true, message: 'Subscription cancelled successfully' };
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  // Check if user has active premium or super user status
  async checkUserPremiumStatus(userId: string) {
    const status = await this.getUserSubscriptionStatus(userId);
    const now = new Date();

    const isPremiumActive = status.isPremium && (!status.premiumExpiresAt || status.premiumExpiresAt > now);
    const isSuperUserActive = status.isSuperUser && (!status.superUserExpiresAt || status.superUserExpiresAt > now);

    return {
      isPremium: isPremiumActive,
      isSuperUser: isSuperUserActive,
      premiumExpiresAt: status.premiumExpiresAt,
      superUserExpiresAt: status.superUserExpiresAt
    };
  }
}

export const razorpayService = new RazorpayService();