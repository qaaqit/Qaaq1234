import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crown, Check, Loader2, ExternalLink, Sparkles } from "lucide-react";

import { apiRequest } from "@/lib/queryClient";

interface PremiumPlan {
  planId: string;
  amount: number;
  period: string;
  interval: number;
  name: string;
  description: string;
  displayPrice: string;
  savings?: string;
}

interface SuperUserTopup {
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

interface SubscriptionPlans {
  premium: {
    monthly: PremiumPlan;
    yearly: PremiumPlan;
  };
  super_user: {
    [key: string]: SuperUserTopup;
  };
}

interface PremiumSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPlanType?: 'premium' | 'super_user';
}

export function PremiumSubscriptionDialog({ 
  open, 
  onOpenChange, 
  defaultPlanType = 'premium' 
}: PremiumSubscriptionDialogProps) {
  const [selectedPlan, setSelectedPlan] = useState<'premium' | 'super_user'>(defaultPlanType);
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedTopup, setSelectedTopup] = useState<string>('topup_451');

  const queryClient = useQueryClient();

  // Fetch subscription plans
  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['/api/subscription-plans'],
    enabled: open,
  });

  // Fetch user subscription status
  const { data: userStatusData } = useQuery({
    queryKey: ['/api/user/subscription-status'],
    enabled: open,
  });

  // Create subscription/topup mutation
  const createSubscriptionMutation = useMutation({
    mutationFn: async ({ planType, billingPeriod, topupPlan }: { planType: string; billingPeriod?: string; topupPlan?: string }) => {
      const payload = planType === 'super_user' && topupPlan 
        ? { planType: 'super_user', topupPlan } 
        : { planType, billingPeriod };
      
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create subscription');
      }
      
      return response.json();
    },
    onSuccess: (data: any) => {
      // Open Razorpay checkout URL
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank');
        console.log("Checkout opened - Please complete your payment in the new tab.");
      }
      queryClient.invalidateQueries({ queryKey: ['/api/user/subscription-status'] });
    },
    onError: (error: any) => {
      console.error("Subscription Error:", error?.message || "Failed to create subscription");
    },
  });

  if (plansLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const plans: SubscriptionPlans = (plansData as any)?.plans || { premium: { monthly: {} as PremiumPlan, yearly: {} as PremiumPlan }, super_user: {} };
  const userStatus = (userStatusData as any) || { isPremium: false, isSuperUser: false, premiumExpiresAt: null };

  const formatPrice = (amount: number) => {
    return `₹${(amount / 100).toLocaleString('en-IN')}`;
  };

  const calculateSavings = (yearly: number, monthly: number) => {
    const yearlyEquivalent = monthly * 12;
    const savings = yearlyEquivalent - yearly;
    const percentage = Math.round((savings / yearlyEquivalent) * 100);
    return { savings: formatPrice(savings), percentage };
  };

  const premiumFeatures = [
    "Enhanced QBOT responses with advanced AI",
    "Priority chat support",
    "Advanced search filters",
    "Export chat history",
    "Premium maritime knowledge base",
    "Ad-free experience"
  ];

  const superUserFeatures = [
    ...premiumFeatures,
    "Admin analytics dashboard",
    "User management tools",
    "Advanced reporting features",
    "API access for integrations",
    "Custom branding options",
    "Dedicated support line"
  ];

  const handleSubscribe = () => {
    if (selectedPlan === 'super_user') {
      createSubscriptionMutation.mutate({
        planType: selectedPlan,
        topupPlan: selectedTopup,
      });
    } else {
      createSubscriptionMutation.mutate({
        planType: selectedPlan,
        billingPeriod: selectedPeriod,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Crown className="h-6 w-6 text-orange-500" />
            QAAQ CHIEF (GPT5)
          </DialogTitle>
          <DialogDescription>
            Advanced reasoning model 
          </DialogDescription>
        </DialogHeader>

        {/* Current Status */}
        {(userStatus.isPremium || userStatus.isSuperUser) && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-green-800">
                {userStatus.isSuperUser ? 'Super User Active' : 'Premium Active'}
              </span>
              {userStatus.premiumExpiresAt && (
                <span className="text-sm text-green-600">
                  • Expires {new Date(userStatus.premiumExpiresAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        )}

        <Tabs value={selectedPlan} onValueChange={(value) => setSelectedPlan(value as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="premium" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Premium
            </TabsTrigger>
            <TabsTrigger value="super_user" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Super User
            </TabsTrigger>
          </TabsList>

          <TabsContent value="premium" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Monthly Plan */}
              <Card className={`${selectedPeriod === 'monthly' ? 'ring-2 ring-orange-500' : ''} cursor-pointer`}
                    onClick={() => setSelectedPeriod('monthly')}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Premium Monthly
                    {selectedPeriod === 'monthly' && <Badge variant="default">Selected</Badge>}
                  </CardTitle>
                  <CardDescription>
                    {formatPrice(plans.premium?.monthly?.amount || 29900)} per month
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Yearly Plan */}
              <Card className={`${selectedPeriod === 'yearly' ? 'ring-2 ring-orange-500' : ''} cursor-pointer relative`}
                    onClick={() => setSelectedPeriod('yearly')}>
                <Badge className="absolute -top-2 -right-2 bg-green-500">
                  Save {calculateSavings(plans.premium?.yearly?.amount || 299900, plans.premium?.monthly?.amount || 29900).percentage}%
                </Badge>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Premium Yearly
                    {selectedPeriod === 'yearly' && <Badge variant="default">Selected</Badge>}
                  </CardTitle>
                  <CardDescription>
                    {formatPrice(plans.premium?.yearly?.amount || 299900)} per year
                    <span className="block text-sm text-green-600 mt-1">
                      Save {calculateSavings(plans.premium?.yearly?.amount || 299900, plans.premium?.monthly?.amount || 29900).savings}
                    </span>
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Premium Features</CardTitle>
                <CardDescription>Everything you need for enhanced maritime networking</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {premiumFeatures.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="super_user" className="space-y-4">
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Pay Per Question - Prepaid Topup</h3>
              <p className="text-sm text-blue-700">
                Super User plans work on a prepaid topup system. Pay ₹4.51 per question with flexible validity periods.
              </p>
            </div>

            {/* Column Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {plans.super_user && Object.entries(plans.super_user).map(([key, topup]) => (
                <Card 
                  key={key}
                  className={`${selectedTopup === key ? 'ring-2 ring-orange-500' : ''} cursor-pointer transition-all hover:shadow-md relative ${
                    key === 'topup_451' ? 'border-orange-300' : 'border-green-300'
                  }`}
                  onClick={() => setSelectedTopup(key)}
                >
                  {key === 'topup_4510' && (
                    <Badge className="absolute -top-2 -right-2 bg-green-500">Best Value</Badge>
                  )}
                  {key === 'topup_451' && (
                    <Badge className="absolute -top-2 -right-2 bg-orange-500">Starter</Badge>
                  )}
                  
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-xl mb-2">
                      {key === 'topup_451' ? 'Starter Pack' : 'Max Pack'}
                    </CardTitle>
                    <div className="space-y-2">
                      <div className="text-3xl font-bold text-orange-600">{topup.displayPrice}</div>
                      <div className="text-sm text-muted-foreground">{topup.description}</div>
                    </div>
                    {selectedTopup === key && (
                      <Badge variant="default" className="mt-2">Selected</Badge>
                    )}
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {/* Key Metrics */}
                      <div className="grid grid-cols-1 gap-3 p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Questions</span>
                          <span className="text-lg font-bold text-orange-600">{topup.questions}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Validity</span>
                          <span className="text-lg font-bold text-green-600">
                            {topup.validityMonths === 1 ? '1 Month' : '2 Years'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Per Question</span>
                          <span className="text-lg font-bold">₹{topup.perQuestionRate}</span>
                        </div>
                      </div>

                      {/* Pack-specific highlights */}
                      <div className="space-y-2">
                        {key === 'topup_451' ? (
                          <>
                            <div className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-orange-500" />
                              <span>Perfect for trying out Super User features</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-orange-500" />
                              <span>Short-term validity for immediate needs</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-orange-500" />
                              <span>Minimum commitment required</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-green-500" />
                              <span>Maximum value with bulk questions</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-green-500" />
                              <span>Extended 2-year validity period</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-green-500" />
                              <span>Best for regular maritime professionals</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Common Premium Features */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Common Premium Features</CardTitle>
                <CardDescription>All Super User packs include these premium features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Expert AI- detailed analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Priority support and faster response </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Advanced maritime knowledge base access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Technical diagrams and visual explanations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Question balance tracking and usage analytics</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Ad-free enhanced QBOT experience</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Export chat history and responses</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Premium maritime content download</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between pt-4 pb-8 border-t mt-6 mb-4">
          <div className="text-sm text-muted-foreground">Secured by Razorpay</div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubscribe}
              disabled={createSubscriptionMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {createSubscriptionMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Subscribe Now
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}