// FRONTEND PAYMENT INTEGRATION GUIDE
// Complete React components and hooks for Razorpay integration

export const FRONTEND_INTEGRATION_CODE = `
// 1. Install Razorpay Frontend SDK (if not already installed)
// npm install @razorpay/razorpay-js

// 2. Payment Hook (hooks/useRazorpay.ts)
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface SubscriptionPlan {
  planId: string;
  amount: number;
  name: string;
  description: string;
  displayPrice: string;
}

interface PaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_subscription_id?: string;
  razorpay_signature: string;
}

export const useRazorpay = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  // Get subscription plans
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['/api/subscription-plans'],
  });

  // Get user subscription status
  const { data: subscriptionStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/user/subscription-status'],
  });

  // Create subscription mutation
  const createSubscription = useMutation({
    mutationFn: async (planData: {
      planType: 'premium' | 'super_user';
      billingPeriod?: string;
      topupPlan?: string;
    }) => {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('qaaq_token'),
        },
        body: JSON.stringify(planData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/subscription-status'] });
    },
  });

  // Process payment
  const processPayment = async (planData: any) => {
    setIsProcessing(true);
    
    try {
      // Create subscription/order
      const subscriptionResult = await createSubscription.mutateAsync(planData);
      
      if (!subscriptionResult.success) {
        throw new Error(subscriptionResult.message);
      }

      // Initialize Razorpay
      const razorpay = new (window as any).Razorpay({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: subscriptionResult.subscription.amount,
        currency: 'INR',
        name: 'QaaqConnect',
        description: subscriptionResult.subscription.description || 'Maritime Professional Subscription',
        order_id: subscriptionResult.razorpayOrderId,
        subscription_id: subscriptionResult.razorpaySubscriptionId,
        handler: async (response: PaymentResponse) => {
          // Verify payment on backend
          try {
            const verifyResponse = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('qaaq_token'),
              },
              body: JSON.stringify({
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                subscriptionId: response.razorpay_subscription_id,
                signature: response.razorpay_signature,
              }),
            });

            const result = await verifyResponse.json();
            
            if (result.success) {
              queryClient.invalidateQueries({ queryKey: ['/api/user/subscription-status'] });
              return { success: true, message: 'Payment successful!' };
            } else {
              throw new Error(result.message);
            }
          } catch (error) {
            console.error('Payment verification failed:', error);
            throw error;
          }
        },
        prefill: {
          name: 'Maritime Professional',
          email: 'user@qaaq.app',
        },
        notes: {
          platform: 'QaaqConnect',
          planType: planData.planType,
        },
        theme: {
          color: '#ea580c', // QaaqConnect orange theme
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      });

      razorpay.open();
    } catch (error) {
      console.error('Payment initiation failed:', error);
      setIsProcessing(false);
      throw error;
    }
  };

  return {
    plans,
    subscriptionStatus,
    processPayment,
    isProcessing,
    plansLoading: plansLoading || statusLoading,
  };
};

// 3. Subscription Plans Component (components/SubscriptionPlans.tsx)
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown } from 'lucide-react';
import { useRazorpay } from '../hooks/useRazorpay';
import { useToast } from '@/hooks/use-toast';

export const SubscriptionPlans: React.FC = () => {
  const { plans, subscriptionStatus, processPayment, isProcessing } = useRazorpay();
  const { toast } = useToast();

  const handleSubscribe = async (planType: 'premium' | 'super_user', planVariant?: string) => {
    try {
      let planData;
      
      if (planType === 'premium') {
        planData = {
          planType: 'premium',
          billingPeriod: planVariant // 'monthly' or 'yearly'
        };
      } else {
        planData = {
          planType: 'super_user',
          topupPlan: planVariant // 'topup_451' or 'topup_4510'
        };
      }

      await processPayment(planData);
      
      toast({
        title: "Payment Initiated",
        description: "Please complete the payment process.",
      });
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!plans) {
    return <div>Loading subscription plans...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Choose Your Plan
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Enhance your maritime networking experience
        </p>
      </div>

      {/* Current Status */}
      {subscriptionStatus && (
        <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-orange-500" />
            <span className="font-medium">
              Current Status: {subscriptionStatus.isPremium ? 'Premium Active' : 'Free Plan'}
            </span>
            {subscriptionStatus.validUntil && (
              <span className="text-sm text-gray-600">
                Valid until: {new Date(subscriptionStatus.validUntil).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Premium Monthly */}
        <Card className="relative border-2 hover:border-orange-500 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-orange-500" />
              Premium Monthly
            </CardTitle>
            <CardDescription>Perfect for trying premium features</CardDescription>
            <div className="text-2xl font-bold text-orange-600">
              {plans.premium.monthly.displayPrice}
              <span className="text-sm font-normal text-gray-500">/month</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-4">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Enhanced QBOT features
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Priority support
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Advanced networking
              </li>
            </ul>
            <Button 
              onClick={() => handleSubscribe('premium', 'monthly')}
              disabled={isProcessing}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              {isProcessing ? 'Processing...' : 'Subscribe Monthly'}
            </Button>
          </CardContent>
        </Card>

        {/* Premium Yearly */}
        <Card className="relative border-2 border-orange-500 hover:border-orange-600 transition-colors">
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-orange-600 text-white">Best Value</Badge>
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-orange-500" />
              Premium Yearly
            </CardTitle>
            <CardDescription>Save ₹2,801 with annual billing</CardDescription>
            <div className="text-2xl font-bold text-orange-600">
              {plans.premium.yearly.displayPrice}
              <span className="text-sm font-normal text-gray-500">/year</span>
            </div>
            <div className="text-sm text-green-600 font-medium">
              {plans.premium.yearly.savings}
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-4">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                All Premium features
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                6+ months free
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Maximum savings
              </li>
            </ul>
            <Button 
              onClick={() => handleSubscribe('premium', 'yearly')}
              disabled={isProcessing}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              {isProcessing ? 'Processing...' : 'Subscribe Yearly'}
            </Button>
          </CardContent>
        </Card>

        {/* Super User Starter */}
        <Card className="relative border-2 hover:border-red-500 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-red-500" />
              Super User Starter
            </CardTitle>
            <CardDescription>Pay per question model</CardDescription>
            <div className="text-2xl font-bold text-red-600">
              {plans.super_user.topup_451.displayPrice}
            </div>
            <div className="text-sm text-gray-600">
              {plans.super_user.topup_451.questions} questions included
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-4">
              {plans.super_user.topup_451.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button 
              onClick={() => handleSubscribe('super_user', 'topup_451')}
              disabled={isProcessing}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? 'Processing...' : 'Buy Starter Pack'}
            </Button>
          </CardContent>
        </Card>

        {/* Super User Max */}
        <Card className="relative border-2 hover:border-red-500 transition-colors">
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-red-600 text-white">Maximum Value</Badge>
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-red-500" />
              Super User Max
            </CardTitle>
            <CardDescription>Maximum question pack</CardDescription>
            <div className="text-2xl font-bold text-red-600">
              {plans.super_user.topup_4510.displayPrice}
            </div>
            <div className="text-sm text-gray-600">
              {plans.super_user.topup_4510.questions} questions included
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-4">
              {plans.super_user.topup_4510.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button 
              onClick={() => handleSubscribe('super_user', 'topup_4510')}
              disabled={isProcessing}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? 'Processing...' : 'Buy Max Pack'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Questions Remaining Counter for Super Users */}
      {subscriptionStatus?.subscriptionType === 'super_user' && (
        <div className="mt-8 text-center">
          <Card className="inline-block px-6 py-4 bg-red-50 dark:bg-red-900/20">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-red-500" />
              <span className="font-medium">
                Questions Remaining: {subscriptionStatus.questionsRemaining || 0}
              </span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

// 4. Add Payment Verification Endpoint (server/routes.ts)
// Add this endpoint to handle payment verification:

app.post('/api/payments/verify', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.userId;
    const { paymentId, orderId, subscriptionId, signature } = req.body;

    if (!paymentId || !signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment details'
      });
    }

    // For subscriptions, use subscription ID; for orders, use order ID
    const verificationId = subscriptionId || orderId;
    
    const result = await razorpayService.processPayment(paymentId, verificationId, signature, userId);
    
    res.json({
      success: true,
      message: 'Payment verified successfully',
      payment: result
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Payment verification failed'
    });
  }
});

// 5. Add Razorpay Script to HTML (client/index.html)
// Add this script tag before closing </body>:
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>

// 6. Environment Variables (.env)
// Add to your environment variables:
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id_here

// 7. Usage Example in App.tsx or any component
import { SubscriptionPlans } from './components/SubscriptionPlans';

// In your routing:
<Route path="/subscriptions" component={SubscriptionPlans} />
`;

console.log('📱 Frontend Payment Integration Code Generated');
console.log('Copy the above code to implement Razorpay payments in your React frontend');