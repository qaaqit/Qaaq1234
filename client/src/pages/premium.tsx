import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Crown, Zap, Shield, Clock, Users } from "lucide-react";
import { PremiumSubscriptionDialog } from "@/components/PremiumSubscriptionDialog";
import { useState } from "react";
import { getStoredUser } from "@/lib/auth";

interface PremiumFeature {
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const premiumFeatures: PremiumFeature[] = [
  {
    name: "Unlimited Q&A Access",
    description: "Ask unlimited questions and get expert answers from maritime professionals worldwide",
    icon: Zap
  },
  {
    name: "Priority Support",
    description: "Get faster responses and priority handling for all your queries",
    icon: Crown
  },
  {
    name: "Advanced Analytics",
    description: "Track your learning progress and get insights into your maritime knowledge",
    icon: Shield
  },
  {
    name: "Extended Chat History",
    description: "Access your complete chat history with QBOT and never lose important conversations",
    icon: Clock
  },
  {
    name: "Exclusive Groups",
    description: "Join premium-only discussion groups with top maritime professionals",
    icon: Users
  }
];

export default function PremiumPage() {
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const user = getStoredUser();

  const { data: subscriptionStatus } = useQuery({
    queryKey: ['/api/user/subscription-status'],
    enabled: !!user
  });

  const { data: plans } = useQuery({
    queryKey: ['/api/subscription-plans']
  });

  const isPremium = (subscriptionStatus as any)?.isPremium || false;
  const premiumPlan = (plans as any)?.premium;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-full">
            <Crown className="h-6 w-6" />
            <span className="font-bold text-lg">QaaqConnect Premium</span>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900">
            Unlock Your Maritime Potential
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get unlimited access to expert knowledge, priority support, and exclusive features designed for maritime professionals
          </p>
        </div>

        {/* Current Status */}
        {user && (
          <Card className="border-2 border-orange-200 bg-white">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2">
                {isPremium ? (
                  <>
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                    <span className="text-green-700">Premium Active</span>
                  </>
                ) : (
                  <>
                    <Crown className="h-6 w-6 text-gray-400" />
                    <span className="text-gray-700">Free Plan</span>
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {isPremium
                  ? `You have access to all premium features. Your subscription expires on ${(subscriptionStatus as any)?.premiumExpiresAt ? new Date((subscriptionStatus as any).premiumExpiresAt).toLocaleDateString() : 'N/A'}`
                  : "Upgrade to Premium to unlock all features and get unlimited access"
                }
              </CardDescription>
            </CardHeader>
            
            {!isPremium && (
              <CardContent className="text-center">
                <Button 
                  onClick={() => setShowSubscriptionDialog(true)}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-3 text-lg font-semibold"
                  data-testid="button-upgrade-premium"
                >
                  Upgrade to Premium
                </Button>
              </CardContent>
            )}
          </Card>
        )}

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {premiumFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="h-full hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="bg-orange-100 p-2 rounded-lg">
                      <Icon className="h-6 w-6 text-orange-600" />
                    </div>
                    <CardTitle className="text-lg">{feature.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Pricing Plans */}
        {premiumPlan && (
          <Card className="bg-white border-2 border-orange-200">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-900">Premium Plans</CardTitle>
              <CardDescription>Choose the plan that works best for you</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {Object.entries(premiumPlan).map(([planKey, plan]: [string, any]) => (
                  <div key={planKey} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="text-center space-y-4">
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                        {planKey.includes('yearly') ? 'Best Value' : 'Popular'}
                      </Badge>
                      
                      <div>
                        <h3 className="text-xl font-bold">
                          {planKey.includes('yearly') ? 'Yearly Plan' : 'Monthly Plan'}
                        </h3>
                        <div className="text-3xl font-bold text-orange-600 mt-2">
                          {plan.displayPrice}
                        </div>
                        {planKey.includes('yearly') && (
                          <p className="text-sm text-green-600 font-medium">
                            Save {Math.round(((premiumPlan.premium_monthly?.amount * 12 - plan.amount) / (premiumPlan.premium_monthly?.amount * 12)) * 100)}%
                          </p>
                        )}
                      </div>

                      <ul className="space-y-2 text-left">
                        {plan.features?.map((feature: string, index: number) => (
                          <li key={index} className="flex items-center space-x-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {!isPremium && (
                        <Button 
                          onClick={() => setShowSubscriptionDialog(true)}
                          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                          data-testid={`button-subscribe-${planKey}`}
                        >
                          Get Started
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Free Plan Limitations */}
        <Card className="bg-gray-50 border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl text-gray-800">Free Plan Limitations</CardTitle>
            <CardDescription>What you're missing without Premium</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {[
                "Limited to 5 questions per day",
                "Basic support response time (24-48 hours)",
                "No access to premium-only discussion groups",
                "Limited chat history (last 30 days)",
                "No learning progress analytics"
              ].map((limitation, index) => (
                <li key={index} className="flex items-center space-x-3 text-gray-600">
                  <div className="w-2 h-2 bg-red-400 rounded-full flex-shrink-0"></div>
                  <span>{limitation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Dialog */}
      {showSubscriptionDialog && user && (
        <PremiumSubscriptionDialog
          open={showSubscriptionDialog}
          onOpenChange={setShowSubscriptionDialog}
        />
      )}
    </div>
  );
}