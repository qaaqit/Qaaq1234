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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Crown, Check, Loader2, Sparkles } from "lucide-react";

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

interface SubscriptionPlans {
  premium: {
    monthly: PremiumPlan;
    yearly: PremiumPlan;
  };
}

interface PremiumSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PremiumSubscriptionDialog({
  open,
  onOpenChange,
}: PremiumSubscriptionDialogProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const queryClient = useQueryClient();

  // Fetch subscription plans
  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ["/api/subscription-plans"],
    enabled: open,
  });

  // Fetch user subscription status
  const { data: userStatusData } = useQuery({
    queryKey: ["/api/user/subscription-status"],
    enabled: open,
  });

  // Create subscription mutation
  const createSubscriptionMutation = useMutation({
    mutationFn: async ({
      planType,
      billingPeriod,
    }: {
      planType: string;
      billingPeriod: string;
    }) => {
      const payload = { planType, billingPeriod };

      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create subscription");
      }

      return response.json();
    },
    onSuccess: (data: any) => {
      // Open Razorpay checkout URL
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, "_blank");
        console.log(
          "Checkout opened - Please complete your payment in the new tab.",
        );
      }
      queryClient.invalidateQueries({
        queryKey: ["/api/user/subscription-status"],
      });
    },
    onError: (error: any) => {
      console.error(
        "Subscription Error:",
        error?.message || "Failed to create subscription",
      );
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

  const plans: SubscriptionPlans = (plansData as any)?.plans || {
    premium: { monthly: {} as PremiumPlan, yearly: {} as PremiumPlan },
  };
  const userStatus = (userStatusData as any) || {
    isPremium: false,
    premiumExpiresAt: null,
  };

  const formatPrice = (amount: number) => {
    return `₹${(amount / 100).toLocaleString("en-IN")}`;
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
    "Ad-free experience",
  ];

  const handleSubscribe = () => {
    createSubscriptionMutation.mutate({
      planType: "premium",
      billingPeriod: selectedPeriod,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Crown className="h-6 w-6 text-orange-500" />
            QaaqConnect Premium
          </DialogTitle>
          <DialogDescription>Unlock advanced maritime features</DialogDescription>
        </DialogHeader>

        {/* Current Status */}
        {userStatus.isPremium && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-green-800">Premium Active</span>
              {userStatus.premiumExpiresAt && (
                <span className="text-sm text-green-600">
                  • Expires{" "}
                  {new Date(userStatus.premiumExpiresAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Monthly Plan */}
            <Card
              className={`${selectedPeriod === "monthly" ? "ring-2 ring-orange-500" : ""} cursor-pointer`}
              onClick={() => setSelectedPeriod("monthly")}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Premium Monthly
                  {selectedPeriod === "monthly" && (
                    <Badge variant="default">Selected</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {formatPrice(plans.premium?.monthly?.amount || 29900)} per
                  month
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Yearly Plan */}
            <Card
              className={`${selectedPeriod === "yearly" ? "ring-2 ring-orange-500" : ""} cursor-pointer relative`}
              onClick={() => setSelectedPeriod("yearly")}
            >
              <Badge className="absolute -top-2 -right-2 bg-green-500">
                Save{" "}
                {
                  calculateSavings(
                    plans.premium?.yearly?.amount || 299900,
                    plans.premium?.monthly?.amount || 29900,
                  ).percentage
                }
                %
              </Badge>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Premium Yearly
                  {selectedPeriod === "yearly" && (
                    <Badge variant="default">Selected</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {formatPrice(plans.premium?.yearly?.amount || 299900)} per
                  year
                  <span className="block text-sm text-green-600 mt-1">
                    Save{" "}
                    {
                      calculateSavings(
                        plans.premium?.yearly?.amount || 299900,
                        plans.premium?.monthly?.amount || 29900,
                      ).savings
                    }
                  </span>
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Premium Features</CardTitle>
              <CardDescription>
                Everything you need for enhanced maritime networking
              </CardDescription>
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
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Secured by Razorpay
          </div>
          
          {!userStatus.isPremium && (
            <Button
              onClick={handleSubscribe}
              disabled={createSubscriptionMutation.isPending}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              data-testid="button-subscribe-premium"
            >
              {createSubscriptionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Crown className="mr-2 h-4 w-4" />
                  Subscribe to Premium
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}