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

interface SubscriptionPlan {
  planId: string;
  amount: number;
  period: string;
  interval: number;
  name: string;
  description: string;
}

interface SubscriptionPlans {
  premium: {
    monthly: SubscriptionPlan;
    yearly: SubscriptionPlan;
  };
  super_user: {
    monthly: SubscriptionPlan;
    yearly: SubscriptionPlan;
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

  // Create subscription mutation
  const createSubscriptionMutation = useMutation({
    mutationFn: async ({ planType, billingPeriod }: { planType: string; billingPeriod: string }) => {
      return apiRequest('/api/subscriptions', {
        method: 'POST',
        body: JSON.stringify({ planType, billingPeriod }),
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
    createSubscriptionMutation.mutate({
      planType: selectedPlan,
      billingPeriod: selectedPeriod,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Crown className="h-6 w-6 text-orange-500" />
            Upgrade Your QAAQ Experience
          </DialogTitle>
          <DialogDescription>
            Choose the perfect plan to enhance your maritime networking and learning
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Monthly Plan */}
              <Card className={`${selectedPeriod === 'monthly' ? 'ring-2 ring-orange-500' : ''} cursor-pointer`}
                    onClick={() => setSelectedPeriod('monthly')}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Super User Monthly
                    {selectedPeriod === 'monthly' && <Badge variant="default">Selected</Badge>}
                  </CardTitle>
                  <CardDescription>
                    {formatPrice(plans.super_user?.monthly?.amount || 59900)} per month
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Yearly Plan */}
              <Card className={`${selectedPeriod === 'yearly' ? 'ring-2 ring-orange-500' : ''} cursor-pointer relative`}
                    onClick={() => setSelectedPeriod('yearly')}>
                <Badge className="absolute -top-2 -right-2 bg-green-500">
                  Save {calculateSavings(plans.super_user?.yearly?.amount || 599900, plans.super_user?.monthly?.amount || 59900).percentage}%
                </Badge>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Super User Yearly
                    {selectedPeriod === 'yearly' && <Badge variant="default">Selected</Badge>}
                  </CardTitle>
                  <CardDescription>
                    {formatPrice(plans.super_user?.yearly?.amount || 599900)} per year
                    <span className="block text-sm text-green-600 mt-1">
                      Save {calculateSavings(plans.super_user?.yearly?.amount || 599900, plans.super_user?.monthly?.amount || 59900).savings}
                    </span>
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Super User Features</CardTitle>
                <CardDescription>All premium features plus advanced admin capabilities</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {superUserFeatures.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
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