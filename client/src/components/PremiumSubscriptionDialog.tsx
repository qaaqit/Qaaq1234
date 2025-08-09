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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PostpaidPlan {
  planId: string;
  amount: number;
  period: string;
  interval: number;
  name: string;
  description: string;
  displayPrice: string;
  savings?: string;
}

interface PrepaidTopup {
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
  postpaid: {
    monthly: PostpaidPlan;
    yearly: PostpaidPlan;
  };
  prepaid: {
    [key: string]: PrepaidTopup;
  };
}

interface PremiumSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPlanType?: 'postpaid' | 'prepaid';
}

export function PremiumSubscriptionDialog({ 
  open, 
  onOpenChange, 
  defaultPlanType = 'postpaid' 
}: PremiumSubscriptionDialogProps) {
  const [selectedPlan, setSelectedPlan] = useState<'postpaid' | 'prepaid'>(defaultPlanType as 'postpaid' | 'prepaid');
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedTopup, setSelectedTopup] = useState<string>('topup_451');
  const { toast } = useToast();
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
      const payload = planType === 'prepaid' && topupPlan 
        ? { planType: 'prepaid', topupPlan } 
        : { planType, billingPeriod };
      return apiRequest('/api/subscriptions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (data) => {
      // Open Razorpay checkout URL
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank');
        toast({
          title: "Checkout Opened",
          description: "Please complete your payment in the new tab.",
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/user/subscription-status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Subscription Error",
        description: error?.message || "Failed to create subscription",
        variant: "destructive",
      });
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

  const plans: SubscriptionPlans = plansData?.plans || {};
  const userStatus = userStatusData || {};

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
    if (selectedPlan === 'prepaid') {
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
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Crown className="h-6 w-6 text-orange-500" />
            Activate Qaaq Chief BOT
          </DialogTitle>
          <DialogDescription>
            Choose your preferred payment method to access the most advanced Marine GPT
          </DialogDescription>
        </DialogHeader>

        {/* Current Status */}
        {(userStatus.isPremium || userStatus.isSuperUser) && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-green-800">
                Qaaq Chief BOT Active - {userStatus.isSuperUser ? 'Prepaid Plan' : 'Postpaid Plan'}
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
            <TabsTrigger value="postpaid" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Postpaid (Advance Rental)
            </TabsTrigger>
            <TabsTrigger value="prepaid" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Prepaid (Pay per Question)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="postpaid" className="space-y-4">
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Qaaq Chief BOT - Advance Rental Model
              </h3>
              <p className="text-sm text-green-700">
                Unlimited access to the most advanced Marine GPT with monthly or yearly billing.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Monthly Plan */}
              <Card className={`${selectedPeriod === 'monthly' ? 'ring-2 ring-orange-500' : ''} cursor-pointer`}
                    onClick={() => setSelectedPeriod('monthly')}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Postpaid Monthly
                    {selectedPeriod === 'monthly' && <Badge variant="default">Selected</Badge>}
                  </CardTitle>
                  <CardDescription>
                    {formatPrice(plans.postpaid?.monthly?.amount || 45100)} per month
                    <br />
                    <span className="text-orange-600 font-medium">Qaaq Chief BOT activated</span>
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Yearly Plan */}
              <Card className={`${selectedPeriod === 'yearly' ? 'ring-2 ring-orange-500' : ''} cursor-pointer relative`}
                    onClick={() => setSelectedPeriod('yearly')}>
                <Badge className="absolute -top-2 -right-2 bg-green-500">
                  Save {calculateSavings(plans.postpaid?.yearly?.amount || 261100, plans.postpaid?.monthly?.amount || 45100).percentage}%
                </Badge>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Postpaid Yearly
                    {selectedPeriod === 'yearly' && <Badge variant="default">Selected</Badge>}
                  </CardTitle>
                  <CardDescription>
                    {formatPrice(plans.postpaid?.yearly?.amount || 261100)} per year
                    <br />
                    <span className="text-orange-600 font-medium">Qaaq Chief BOT activated</span>
                    <span className="block text-sm text-green-600 mt-1">
                      Save {calculateSavings(plans.postpaid?.yearly?.amount || 261100, plans.postpaid?.monthly?.amount || 45100).savings}
                    </span>
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-orange-500" />
                  Qaaq Chief BOT Features
                </CardTitle>
                <CardDescription>Most advanced Marine GPT with unlimited access</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Unlimited Qaaq Chief responses</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Advanced Maritime AI analysis</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Priority support and faster responses</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Advanced search filters and tools</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Export chat history and reports</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Ad-free premium experience</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prepaid" className="space-y-4">
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Qaaq Chief BOT - Pay Per Question
              </h3>
              <p className="text-sm text-blue-700">
                Prepaid plans activate Qaaq Chief BOT. Pay ₹4.51 per question with flexible validity periods.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.prepaid && Object.entries(plans.prepaid).map(([key, topup]) => (
                <Card 
                  key={key}
                  className={`${selectedTopup === key ? 'ring-2 ring-orange-500' : ''} cursor-pointer transition-all hover:shadow-md ${
                    key === 'topup_451' ? 'border-orange-300 bg-orange-50' : 
                    key === 'topup_4510' ? 'border-green-300 bg-green-50 relative' : ''
                  }`}
                  onClick={() => setSelectedTopup(key)}
                >
                  {key === 'topup_4510' && (
                    <Badge className="absolute -top-2 -right-2 bg-green-500">Best Value</Badge>
                  )}
                  {key === 'topup_451' && (
                    <Badge className="absolute -top-2 -right-2 bg-orange-500">Minimum</Badge>
                  )}
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-lg">
                      {topup.name}
                      {selectedTopup === key && <Badge variant="default">Selected</Badge>}
                    </CardTitle>
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-orange-600">{topup.displayPrice}</div>
                      <div className="text-sm text-muted-foreground">{topup.description}</div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Questions included:</span>
                        <span className="font-semibold">{topup.questions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Validity:</span>
                        <span className="font-semibold">
                          {topup.validityMonths === 1 ? '1 month' : 
                           topup.validityMonths === 24 ? '2 years' : 
                           `${topup.validityMonths} months`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Per question:</span>
                        <span className="font-semibold">₹{topup.perQuestionRate}</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <ul className="space-y-1">
                        {topup.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-xs">
                            <Crown className="h-3 w-3 text-orange-500 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-orange-500" />
                  Qaaq Chief BOT Features
                </CardTitle>
                <CardDescription>Pay-per-question model with the most advanced Marine GPT</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <li className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    <span className="text-sm">Qaaq Chief responses with detailed analysis</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    <span className="text-sm">Most advanced Marine GPT technology</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    <span className="text-sm">Advanced maritime knowledge base access</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    <span className="text-sm">Technical diagrams and visual explanations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    <span className="text-sm">Question balance tracking and usage analytics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    <span className="text-sm">Extended validity periods for bulk purchases</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Secure payment powered by Razorpay
          </div>
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