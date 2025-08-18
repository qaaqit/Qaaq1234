import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Crown,
  Check,
  Star,
  Zap,
  Shield,
  Users,
  Loader2,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { useLocation } from "wouter";

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

interface UserStatus {
  isPremium?: boolean;
  isSuperUser?: boolean;
  premiumExpiresAt?: string | null;
}

const features = [
  {
    icon: Crown,
    title: "Premium Maps",
    description:
      "Access Google Maps with satellite view and enhanced navigation",
  },
  {
    icon: Users,
    title: "Advanced Discovery",
    description: "Enhanced user discovery and networking features",
  },
  {
    icon: Star,
    title: "Priority Support",
    description: "Get priority assistance and faster response times",
  },
  {
    icon: Zap,
    title: "Unlimited QBOT Queries",
    description: "No daily limits on AI-powered maritime assistance",
  },
  {
    icon: Shield,
    title: "Premium Security",
    description: "Enhanced security features and data protection",
  },
];

export default function PremiumPage() {
  const [, setLocation] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<"premium" | "super_user">(
    "premium",
  );
  const [selectedPeriod, setSelectedPeriod] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [selectedTopup, setSelectedTopup] = useState<string>("topup_451");

  const queryClient = useQueryClient();

  // Fetch current user
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  // Fetch subscription plans
  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ["/api/subscription-plans"],
  });

  // Fetch user subscription status
  const { data: userStatusData } = useQuery({
    queryKey: ["/api/user/subscription-status"],
  });

  const userStatus: UserStatus = userStatusData || {};
  const isPremium = userStatus?.isPremium || userStatus?.isSuperUser || false;

  // Create subscription/topup mutation
  const createSubscriptionMutation = useMutation({
    mutationFn: async ({
      planType,
      billingPeriod,
      topupPlan,
    }: {
      planType: string;
      billingPeriod?: string;
      topupPlan?: string;
    }) => {
      const payload =
        planType === "super_user" && topupPlan
          ? { planType: "super_user", topupPlan }
          : { planType, billingPeriod };

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

  const handleGoBack = () => {
    setLocation("/");
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

  const handleSubscribe = () => {
    if (selectedPlan === "super_user") {
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

  if (plansLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const plans: SubscriptionPlans = (plansData as any)?.plans || {
    premium: { monthly: {} as PremiumPlan, yearly: {} as PremiumPlan },
    super_user: {},
  };

  const premiumFeatures = [
    "Enhanced QBOT responses with advanced AI",
    "Priority chat support",
    "Advanced search filters",
    "Export chat history",
    "Premium maritime knowledge base",
    "Ad-free experience",
  ];

  const superUserFeatures = [
    ...premiumFeatures,
    "Admin analytics dashboard",
    "User management tools",
    "Advanced reporting features",
    "API access for integrations",
    "Custom branding options",
    "Dedicated support line",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b-2 border-orange-400">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                onClick={handleGoBack}
                className="text-orange-600 hover:bg-orange-50"
              >
                ← Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                  Premium Subscription
                </h1>
                <p className="text-gray-600">
                  Unlock advanced maritime features
                </p>
              </div>
            </div>
            <Crown className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Plan Selection Tabs */}
        {!isPremium && (
          <div className="mb-8">
            <Tabs
              value={selectedPeriod}
              onValueChange={(value) => setSelectedPeriod(value as "monthly" | "yearly")}
              className="flex flex-col"
            >
              {/* Tab Navigation - Red/Orange Signature Bar */}
              <div className="bg-gradient-to-r from-red-500 to-orange-500 shadow-lg rounded-t-lg">
                <div className="px-4 py-3">
                  <TabsList className="grid w-full grid-cols-2 bg-white/10 backdrop-blur-sm border-0 rounded-lg p-1">
                    <TabsTrigger 
                      value="monthly" 
                      className="data-[state=active]:bg-white data-[state=active]:text-red-600 text-white hover:bg-white/20 font-semibold transition-all duration-200 rounded-md py-2"
                      data-testid="tab-monthly"
                    >
                      Monthly
                    </TabsTrigger>
                    <TabsTrigger 
                      value="yearly" 
                      className="data-[state=active]:bg-white data-[state=active]:text-red-600 text-white hover:bg-white/20 font-semibold transition-all duration-200 rounded-md py-2 relative"
                      data-testid="tab-yearly"
                    >
                      Yearly
                      <Badge className="ml-1 text-xs bg-[#3b82f6]">Save 60%</Badge>
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>

              {/* Payment Options Card */}
              <TabsContent value="monthly" className="mt-0">
                <Card className="border-2 border-orange-200 rounded-t-none">
                  <CardHeader>
                    <CardTitle className="text-center">Payment Options</CardTitle>
                    <p className="text-center text-gray-600">
                      Monthly Plan - ₹451 (Billed monthly)
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <a
                        href="https://rzp.io/rzp/jwQW9TW"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg text-lg font-medium transition-colors w-full justify-center"
                        data-testid="button-pay-card-monthly-top"
                      >
                        <ExternalLink className="h-5 w-5" />
                        Pay via Card - ₹451
                      </a>
                      <a
                        href="https://rzp.io/rzp/QACUUpcD"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg text-lg font-medium transition-colors w-full justify-center"
                        data-testid="button-pay-upi-monthly-top"
                      >
                        <ExternalLink className="h-5 w-5" />
                        Pay via UPI - ₹451
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="yearly" className="mt-0">
                <Card className="border-2 border-orange-200 rounded-t-none">
                  <CardHeader>
                    <CardTitle className="text-center">Payment Options</CardTitle>
                    <p className="text-center text-gray-600">
                      Yearly Plan - ₹2,611 (Billed annually • Save ₹2,801 per year)
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <a
                        href="https://rzp.io/rzp/NAU59cv"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg text-lg font-medium transition-colors w-full justify-center"
                        data-testid="button-pay-card-yearly-top"
                      >
                        <ExternalLink className="h-5 w-5" />
                        Pay via Card - ₹2,611
                      </a>
                      <a
                        href="https://rzp.io/rzp/COgnl5fN"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg text-lg font-medium transition-colors w-full justify-center"
                        data-testid="button-pay-upi-yearly-top"
                      >
                        <ExternalLink className="h-5 w-5" />
                        Pay via UPI - ₹2,611
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Current Status */}
        {user && (
          <Card className="mb-8 border-2 border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Crown className="h-6 w-6 text-orange-500" />
                QAAQ CHIEF (Most Advanced Version)
              </CardTitle>
              <p className="text-gray-600">Advanced reasoning model</p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">{user.fullName}</p>
                  <p className="text-gray-600">{user.email}</p>
                </div>
                <div className="text-right">
                  <Badge
                    variant={isPremium ? "default" : "secondary"}
                    className="mb-2"
                  >
                    {isPremium ? "Premium Active" : "Free Plan"}
                  </Badge>
                  {isPremium && userStatus?.premiumExpiresAt && (
                    <p className="text-sm text-gray-600">
                      Expires:{" "}
                      {new Date(
                        userStatus.premiumExpiresAt,
                      ).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Current Status Alert */}
              {(userStatus.isPremium || userStatus.isSuperUser) && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-800">
                      {userStatus.isSuperUser
                        ? "Super User Active"
                        : "Premium Active"}
                    </span>
                    {userStatus.premiumExpiresAt && (
                      <span className="text-sm text-green-600">
                        • Expires{" "}
                        {new Date(
                          userStatus.premiumExpiresAt,
                        ).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Subscription Plans */}
        <Tabs
          value={selectedPlan}
          onValueChange={(value) => setSelectedPlan(value as any)}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="premium" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Premium
            </TabsTrigger>
            <TabsTrigger value="super_user" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Coming Soon plans
            </TabsTrigger>
          </TabsList>

          <TabsContent value="premium" className="space-y-4">
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
                    {formatPrice(plans.premium?.monthly?.amount || 55100)} per
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
                      plans.premium?.yearly?.amount || 261100,
                      plans.premium?.monthly?.amount || 55100,
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
                    {formatPrice(plans.premium?.yearly?.amount || 261100)} per
                    year
                    <span className="block text-sm text-green-600 mt-1">
                      Save{" "}
                      {
                        calculateSavings(
                          plans.premium?.yearly?.amount || 261100,
                          plans.premium?.monthly?.amount || 55100,
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

            {/* Premium Payment Options */}
            <Card className="border-2 border-orange-200">
              <CardHeader>
                <CardTitle className="text-center">
                  {selectedPeriod === "monthly"
                    ? "Pay ₹451 - Monthly Premium"
                    : "Pay ₹2,611 - Yearly Premium"}
                </CardTitle>
                <CardDescription className="text-center">
                  Payment Options
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedPeriod === "monthly" ? (
                    <>
                      <a
                        href="https://rzp.io/rzp/jwQW9TW"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full justify-center"
                        data-testid="button-pay-card-monthly"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Pay via Card - ₹451
                      </a>
                      <a
                        href="https://rzp.io/rzp/QACUUpcD"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full justify-center"
                        data-testid="button-pay-upi-monthly"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Pay via UPI - ₹451
                      </a>
                    </>
                  ) : (
                    <>
                      <a
                        href="https://rzp.io/rzp/NAU59cv"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full justify-center"
                        data-testid="button-pay-card-yearly"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Pay via Card - ₹2,611
                      </a>
                      <a
                        href="https://rzp.io/rzp/COgnl5fN"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full justify-center"
                        data-testid="button-pay-upi-yearly"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Pay via UPI - ₹2,611
                      </a>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="super_user" className="space-y-4">
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">
                Pay Per Question - Prepaid Topup
              </h3>
              <p className="text-sm text-blue-700">
                Super User plans work on a prepaid topup system. Pay ₹4.51 per
                question with flexible validity periods.
              </p>
            </div>

            {/* Column Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {plans.super_user &&
                Object.entries(plans.super_user).map(([key, topup]) => (
                  <Card
                    key={key}
                    className={`${selectedTopup === key ? "ring-2 ring-orange-500" : ""} cursor-pointer transition-all hover:shadow-md relative ${
                      key === "topup_451"
                        ? "border-orange-300"
                        : "border-green-300"
                    }`}
                    onClick={() => setSelectedTopup(key)}
                  >
                    {key === "topup_4510" && (
                      <Badge className="absolute -top-2 -right-2 bg-green-500">
                        Best Value
                      </Badge>
                    )}
                    {key === "topup_451" && (
                      <Badge className="absolute -top-2 -right-2 bg-orange-500">
                        Starter
                      </Badge>
                    )}

                    <CardHeader className="text-center pb-4">
                      <CardTitle className="text-xl mb-2">
                        {key === "topup_451" ? "Starter Pack" : "Max Pack"}
                      </CardTitle>
                      <div className="space-y-2">
                        <div className="text-3xl font-bold text-orange-600">
                          {topup.displayPrice}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {topup.description}
                        </div>
                      </div>
                      {selectedTopup === key && (
                        <Badge variant="default" className="mt-2">
                          Selected
                        </Badge>
                      )}
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {/* Key Metrics */}
                        <div className="grid grid-cols-1 gap-3 p-4 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">
                              Questions
                            </span>
                            <span className="text-lg font-bold text-orange-600">
                              {topup.questions}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">
                              Validity
                            </span>
                            <span className="text-lg font-bold text-green-600">
                              {topup.validityMonths === 1
                                ? "1 Month"
                                : "2 Years"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">
                              Per Question
                            </span>
                            <span className="text-lg font-bold">
                              ₹{topup.perQuestionRate}
                            </span>
                          </div>
                        </div>

                        {/* Pack-specific highlights */}
                        <div className="space-y-2">
                          {key === "topup_451" ? (
                            <>
                              <div className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-orange-500" />
                                <span>
                                  Perfect for trying out Super User features
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-orange-500" />
                                <span>
                                  Short-term validity for immediate needs
                                </span>
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
                                <span>
                                  Best for regular maritime professionals
                                </span>
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
                <CardDescription>
                  All Super User packs include these premium features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">
                      Expert AI- detailed analysis
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">
                      Priority support and faster response{" "}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">
                      Advanced maritime knowledge base access
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">
                      Technical diagrams and visual explanations
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">
                      Question balance tracking and usage analytics
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">
                      Ad-free enhanced QBOT experience
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">
                      Export chat history and responses
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">
                      Premium maritime content download
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Super User Subscribe Button */}
            <Card className="border-2 border-orange-200">
              <CardContent className="text-center py-6">
                <Button
                  onClick={handleSubscribe}
                  disabled={createSubscriptionMutation.isPending}
                  className="bg-orange-500 hover:bg-orange-600 px-8 py-3"
                >
                  {createSubscriptionMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Coming Soon
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">Secured by Razorpay</p>
        </div>
      </div>
    </div>
  );
}
