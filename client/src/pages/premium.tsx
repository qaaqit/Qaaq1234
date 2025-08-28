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
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/")}
          className="text-gray-400 hover:text-white hover:bg-gray-800 px-2"
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-6 py-8">
        {/* Title Section */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold mb-8">
            Select your protection plan
          </h1>
          
          {/* Character Illustration Placeholder */}
          <div className="w-48 h-48 mx-auto mb-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
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
                  ? "border-blue-500 bg-gray-800" 
                  : "border-gray-700 bg-gray-850 hover:border-gray-600"
              }`}
              data-testid="plan-yearly"
            >
              <div className="flex items-center p-4">
                <RadioGroupItem value="yearly" id="yearly" className="text-blue-500" />
                <div className="ml-4 flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-white">1-year plan</div>
                      <div className="text-sm text-gray-400 mt-0.5">
                        ₹{(yearlyAmount / 100).toLocaleString("en-IN")}/year
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-medium text-white">
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
                  ? "border-blue-500 bg-gray-800" 
                  : "border-gray-700 bg-gray-850 hover:border-gray-600"
              }`}
              data-testid="plan-monthly"
            >
              <div className="flex items-center p-4">
                <RadioGroupItem value="monthly" id="monthly" className="text-blue-500" />
                <div className="ml-4 flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-white">1-month plan</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-medium text-white">
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
            <Badge className="bg-green-600 text-white px-3 py-1">
              Save {monthlySavings}% with annual plan
            </Badge>
          </div>
        )}

        {/* Features List */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="text-lg text-white">Premium Features</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-gray-300 text-sm">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Payment Method Selection */}
        <div className="mb-6">
          <p className="text-sm text-gray-400 mb-3">Select payment method:</p>
          <RadioGroup value={paymentMethod} onValueChange={(value: "card" | "upi") => setPaymentMethod(value)}>
            <div className="grid grid-cols-2 gap-3">
              <Label 
                htmlFor="card"
                className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${
                  paymentMethod === "card" 
                    ? "border-blue-500 bg-gray-800" 
                    : "border-gray-700 hover:border-gray-600"
                }`}
                data-testid="payment-card"
              >
                <RadioGroupItem value="card" id="card" className="sr-only" />
                <span className="text-sm">Card</span>
              </Label>
              <Label 
                htmlFor="upi"
                className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${
                  paymentMethod === "upi" 
                    ? "border-blue-500 bg-gray-800" 
                    : "border-gray-700 hover:border-gray-600"
                }`}
                data-testid="payment-upi"
              >
                <RadioGroupItem value="upi" id="upi" className="sr-only" />
                <span className="text-sm">UPI</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Payment Button */}
        <Button 
          onClick={handlePayment}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-base font-medium"
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