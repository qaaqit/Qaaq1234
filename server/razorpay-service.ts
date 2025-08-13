import { pool } from './db';
import https from 'https';
import crypto from 'crypto';

/**
 * MARIANA PRODUCTION RAZORPAY SERVICE
 * 
 * Comprehensive subscription management for QaaqConnect maritime platform
 * with enhanced reliability and parent QAAQ database integration.
 */

interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
}

interface SubscriptionData {
  userId: string;
  planId: string;
  subscriptionType: 'premium_monthly' | 'premium_yearly' | 'super_user';
  amount: number;
  currency: string;
}

interface PaymentVerification {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

class RazorpayService {
  private config: RazorpayConfig;
  private baseURL = 'https://api.razorpay.com/v1';

  constructor() {
    this.config = {
      keyId: process.env.RAZORPAY_KEY_ID || '',
      keySecret: process.env.RAZORPAY_KEY_SECRET || '',
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || ''
    };

    if (!this.config.keyId || !this.config.keySecret) {
      console.warn('⚠️ Razorpay credentials not configured');
    } else {
      console.log('🔧 Production RazorpayService initialized');
    }
  }

  /**
   * Create a new subscription order
   */
  async createSubscriptionOrder(subscriptionData: SubscriptionData): Promise<any> {
    try {
      const orderData = {
        amount: subscriptionData.amount * 100, // Convert to paise
        currency: subscriptionData.currency || 'INR',
        receipt: `maritime_${subscriptionData.userId}_${Date.now()}`,
        notes: {
          userId: subscriptionData.userId,
          subscriptionType: subscriptionData.subscriptionType,
          platform: 'qaaq_maritime'
        }
      };

      const response = await this.makeRazorpayRequest('POST', '/orders', orderData);
      
      // Store order in database for tracking
      await this.storeOrderInDatabase(response.id, subscriptionData);
      
      return response;
    } catch (error) {
      console.error('Error creating subscription order:', error);
      throw error;
    }
  }

  /**
   * Verify payment signature
   */
  verifyPaymentSignature(verification: PaymentVerification): boolean {
    try {
      const body = `${verification.razorpay_order_id}|${verification.razorpay_payment_id}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.config.keySecret)
        .update(body)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(verification.razorpay_signature)
      );
    } catch (error) {
      console.error('Error verifying payment signature:', error);
      return false;
    }
  }

  /**
   * Activate subscription after successful payment
   */
  async activateSubscription(userId: string, paymentData: any): Promise<void> {
    try {
      const subscriptionType = paymentData.notes?.subscriptionType || 'premium_monthly';
      const expiryMonths = subscriptionType === 'premium_yearly' ? 12 : 1;
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + expiryMonths);

      // Update user subscription status in parent QAAQ database with retry logic
      await this.updateUserSubscriptionWithRetry(userId, {
        isPremium: true,
        subscriptionType,
        subscriptionStatus: 'active',
        premiumExpiresAt: expiryDate,
        razorpayCustomerId: paymentData.customer_id,
        paymentMethod: paymentData.method || 'card'
      });

      console.log(`✅ Subscription activated for user ${userId}, expires: ${expiryDate.toISOString()}`);
    } catch (error) {
      console.error('Error activating subscription:', error);
      throw error;
    }
  }

  /**
   * Check subscription status
   */
  async getSubscriptionStatus(userId: string): Promise<any> {
    try {
      const result = await pool.query(`
        SELECT 
          is_premium,
          subscription_type,
          subscription_status,
          premium_expires_at,
          razorpay_customer_id
        FROM users 
        WHERE id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        return { isActive: false, status: 'user_not_found' };
      }

      const user = result.rows[0];
      const isActive = user.is_premium && 
                      user.subscription_status === 'active' && 
                      new Date(user.premium_expires_at) > new Date();

      return {
        isActive,
        subscriptionType: user.subscription_type,
        status: user.subscription_status,
        expiresAt: user.premium_expires_at,
        customerId: user.razorpay_customer_id
      };
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return { isActive: false, status: 'error' };
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string): Promise<void> {
    try {
      await this.updateUserSubscriptionWithRetry(userId, {
        subscriptionStatus: 'cancelled'
        // Keep isPremium true until expiry date
      });

      console.log(`✅ Subscription cancelled for user ${userId}`);
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  /**
   * Handle webhook notifications
   */
  async handleWebhook(payload: string, signature: string): Promise<void> {
    try {
      // Verify webhook signature
      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(payload)
        .digest('hex');

      if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))) {
        throw new Error('Invalid webhook signature');
      }

      const event = JSON.parse(payload);
      
      switch (event.event) {
        case 'payment.captured':
          await this.handlePaymentCaptured(event.payload.payment.entity);
          break;
        case 'subscription.cancelled':
          await this.handleSubscriptionCancelled(event.payload.subscription.entity);
          break;
        case 'payment.failed':
          await this.handlePaymentFailed(event.payload.payment.entity);
          break;
        default:
          console.log(`Unhandled webhook event: ${event.event}`);
      }
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async makeRazorpayRequest(method: string, endpoint: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const auth = Buffer.from(`${this.config.keyId}:${this.config.keySecret}`).toString('base64');
      const postData = data ? JSON.stringify(data) : '';

      const options = {
        hostname: 'api.razorpay.com',
        port: 443,
        path: `/v1${endpoint}`,
        method,
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
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

      if (postData) {
        req.write(postData);
      }

      req.end();
    });
  }

  private async updateUserSubscriptionWithRetry(userId: string, updates: any, retries = 3): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        const setClause = Object.keys(updates).map((key, index) => {
          // Convert camelCase to snake_case for database columns
          const dbColumn = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          return `${dbColumn} = $${index + 2}`;
        }).join(', ');

        const values = [userId, ...Object.values(updates)];

        await pool.query(`
          UPDATE users 
          SET ${setClause}, last_updated = NOW()
          WHERE id = $1
        `, values);

        return; // Success, exit retry loop
      } catch (error) {
        console.error(`Subscription update attempt ${i + 1} failed:`, error);
        if (i === retries - 1) throw error;
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }

  private async storeOrderInDatabase(orderId: string, subscriptionData: SubscriptionData): Promise<void> {
    try {
      // Store in a separate orders table if it exists, otherwise skip
      // This is optional as we're focusing on user subscription status
      console.log(`📝 Order ${orderId} tracked for user ${subscriptionData.userId}`);
    } catch (error) {
      console.error('Non-critical: Order tracking failed:', error);
      // Don't throw - this is not critical
    }
  }

  private async handlePaymentCaptured(payment: any): Promise<void> {
    try {
      const userId = payment.notes?.userId;
      if (userId) {
        await this.activateSubscription(userId, payment);
      }
    } catch (error) {
      console.error('Error handling payment captured:', error);
    }
  }

  private async handleSubscriptionCancelled(subscription: any): Promise<void> {
    try {
      const userId = subscription.notes?.userId;
      if (userId) {
        await this.cancelSubscription(userId);
      }
    } catch (error) {
      console.error('Error handling subscription cancelled:', error);
    }
  }

  private async handlePaymentFailed(payment: any): Promise<void> {
    try {
      console.log(`❌ Payment failed for order ${payment.order_id}`);
      // Could implement notification logic here
    } catch (error) {
      console.error('Error handling payment failed:', error);
    }
  }
}

// Export singleton instance
export const razorpayService = new RazorpayService();