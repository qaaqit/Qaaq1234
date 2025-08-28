import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Crown,
  Check,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  fullName: string;
  email: string;
  isAdmin?: boolean;
}

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
  super_user: {
    [key: string]: any;
  };
}

interface UserStatus {
  isPremium?: boolean;
  isSuperUser?: boolean;
  premiumExpiresAt?: string | null;
}

const features = [
  "Premium Maps with satellite view",
  "Advanced Discovery features",
  "Priority Support",
  "Unlimited QBOT Queries",
  "Premium Security features",
  "Export chat history",
];

export default function PremiumPage() {
  const [, setLocation] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<"yearly" | "monthly">("yearly");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "upi">("card");
  const { toast } = useToast();

  const queryClient = useQueryClient();

  // Fetch current user
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  // Fetch subscription plans
  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ["/api/subscription-plans"],
  });

  // Check premium status using current user data
  const { data: userStatusData, isLoading: statusLoading } = useQuery<UserStatus>({
    queryKey: ["/api/check-user-status", user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const response = await fetch(`/api/check-user-status/${user.email}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!user?.email,
    retry: 1,
  });

  const userStatus: UserStatus = userStatusData || {};
  const isPremium = userStatus?.isPremium || userStatus?.isSuperUser || false;

  // Redirect premium users to status page
  useEffect(() => {
    if (isPremium && userStatusData) {
      setLocation("/premium-status");
    }
  }, [isPremium, userStatusData, setLocation]);

  const plans: SubscriptionPlans = (plansData as any)?.plans || {
    premium: { 
      monthly: { amount: 45100, displayPrice: "₹451" } as PremiumPlan, 
      yearly: { amount: 261100, displayPrice: "₹2,611" } as PremiumPlan 
    },
    super_user: {},
  };

  const yearlyAmount = plans.premium?.yearly?.amount || 261100;
  const monthlyAmount = plans.premium?.monthly?.amount || 45100;
  const yearlyMonthlyRate = Math.round(yearlyAmount / 100 / 12);
  const monthlySavings = Math.round(((monthlyAmount * 12 - yearlyAmount) / (monthlyAmount * 12)) * 100);

  const handlePayment = () => {
    let paymentUrl = "";
    
    if (selectedPlan === "yearly") {
      paymentUrl = paymentMethod === "card" 
        ? "https://rzp.io/rzp/NAU59cv"
        : "https://rzp.io/rzp/COgnl5fN";
    } else {
      paymentUrl = paymentMethod === "card"
        ? "https://rzp.io/rzp/jwQW9TW"
        : "https://rzp.io/rzp/QACUUpcD";
    }
    
    window.open(paymentUrl, "_blank");
    
    toast({
      title: "Opening payment page",
      description: "Complete your payment in the new tab",
    });
  };

  const getCurrentPlanPrice = () => {
    if (selectedPlan === "yearly") {
      return `₹${(yearlyAmount / 100).toLocaleString("en-IN")} for 12 months`;
    }
    return `₹${(monthlyAmount / 100).toLocaleString("en-IN")} per month`;
  };

  if (plansLoading || statusLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <div className="animate-pulse text-lg text-orange-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-orange-200 shadow-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/")}
          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-6 py-8">
        {/* Title Section */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-8">
            Select your protection plan
          </h1>
          
          {/* Character Illustration Placeholder */}
          <div className="w-48 h-48 mx-auto mb-8 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
            <Crown className="h-20 w-20 text-white" />
          </div>
        </div>

        {/* Plan Selection Cards */}
        <div className="space-y-3 mb-8">
          <RadioGroup value={selectedPlan} onValueChange={(value: "yearly" | "monthly") => setSelectedPlan(value)}>
            {/* Yearly Plan - Pre-selected and highlighted */}
            <Label 
              htmlFor="yearly"
              className={`block cursor-pointer rounded-lg border-2 transition-all ${
                selectedPlan === "yearly" 
                  ? "border-orange-500 bg-orange-50 shadow-md" 
                  : "border-gray-200 bg-white hover:border-orange-300 hover:shadow-sm"
              }`}
              data-testid="plan-yearly"
            >
              <div className="flex items-center p-4">
                <RadioGroupItem value="yearly" id="yearly" className="text-orange-500 border-orange-400" />
                <div className="ml-4 flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-gray-900">1-year plan</div>
                      <div className="text-sm text-gray-600 mt-0.5">
                        ₹{(yearlyAmount / 100).toLocaleString("en-IN")}/year
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-medium text-orange-600">
                        ₹{yearlyMonthlyRate}/mo
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Label>

            {/* Monthly Plan */}
            <Label 
              htmlFor="monthly"
              className={`block cursor-pointer rounded-lg border-2 transition-all ${
                selectedPlan === "monthly" 
                  ? "border-orange-500 bg-orange-50 shadow-md" 
                  : "border-gray-200 bg-white hover:border-orange-300 hover:shadow-sm"
              }`}
              data-testid="plan-monthly"
            >
              <div className="flex items-center p-4">
                <RadioGroupItem value="monthly" id="monthly" className="text-orange-500 border-orange-400" />
                <div className="ml-4 flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-gray-900">1-month plan</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-medium text-gray-700">
                        ₹{(monthlyAmount / 100).toLocaleString("en-IN")}/mo
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Label>
          </RadioGroup>
        </div>

        {/* Savings Badge */}
        {selectedPlan === "yearly" && (
          <div className="text-center mb-6">
            <Badge className="bg-green-100 text-green-700 border-green-200 px-3 py-1">
              Save {monthlySavings}% with annual plan
            </Badge>
          </div>
        )}

        {/* Features List */}
        <Card className="bg-white border-orange-200 shadow-sm mb-6">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50">
            <CardTitle className="text-lg text-gray-900">Premium Features</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-gray-700 text-sm">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Payment Method Selection */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-3">Select payment method:</p>
          <RadioGroup value={paymentMethod} onValueChange={(value: "card" | "upi") => setPaymentMethod(value)}>
            <div className="grid grid-cols-2 gap-3">
              <Label 
                htmlFor="card"
                className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  paymentMethod === "card" 
                    ? "border-orange-500 bg-orange-50" 
                    : "border-gray-200 bg-white hover:border-orange-300"
                }`}
                data-testid="payment-card"
              >
                <RadioGroupItem value="card" id="card" className="sr-only" />
                <span className="text-sm font-medium">Card</span>
              </Label>
              <Label 
                htmlFor="upi"
                className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  paymentMethod === "upi" 
                    ? "border-orange-500 bg-orange-50" 
                    : "border-gray-200 bg-white hover:border-orange-300"
                }`}
                data-testid="payment-upi"
              >
                <RadioGroupItem value="upi" id="upi" className="sr-only" />
                <span className="text-sm font-medium">UPI</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Payment Button */}
        <Button 
          onClick={handlePayment}
          className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white py-6 text-base font-medium shadow-lg"
          data-testid="button-subscribe"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          {getCurrentPlanPrice()}
        </Button>

        {/* Terms */}
        <p className="text-xs text-gray-500 text-center mt-4 px-4">
          The first payment is today. Subscription auto-renews every {selectedPlan === "yearly" ? "year" : "month"} until cancelled.
          By continuing, you agree to our Terms & Conditions and Privacy Policy.
        </p>
      </div>
    </div>
  );
}