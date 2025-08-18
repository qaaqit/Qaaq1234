import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { PremiumSubscriptionDialog } from "@/components/PremiumSubscriptionDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, Star, Zap, Shield, Users } from "lucide-react";
import { useLocation } from "wouter";

interface User {
  id: string;
  fullName: string;
  email: string;
  isAdmin?: boolean;
}

const features = [
  {
    icon: Crown,
    title: "Premium Maps",
    description: "Access Google Maps with satellite view and enhanced navigation"
  },
  {
    icon: Users,
    title: "Advanced Discovery",
    description: "Enhanced user discovery and networking features"
  },
  {
    icon: Star,
    title: "Priority Support",
    description: "Get priority assistance and faster response times"
  },
  {
    icon: Zap,
    title: "Unlimited QBOT Queries",
    description: "No daily limits on AI-powered maritime assistance"
  },
  {
    icon: Shield,
    title: "Premium Security",
    description: "Enhanced security features and data protection"
  }
];

export default function PremiumPage() {
  const [, setLocation] = useLocation();
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);

  // Fetch current user
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  // Fetch user subscription status
  const { data: userStatus } = useQuery({
    queryKey: ["/api/user/subscription-status"],
  });

  const isPremium = userStatus?.isPremium || userStatus?.isSuperUser || false;

  useEffect(() => {
    // Auto-open subscription dialog when page loads and user is not premium
    if (user && !isPremium) {
      setShowSubscriptionDialog(true);
    }
  }, [user, isPremium]);

  const handleUpgradeClick = () => {
    setShowSubscriptionDialog(true);
  };

  const handleGoBack = () => {
    setLocation("/");
  };

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
                <p className="text-gray-600">Unlock advanced maritime features</p>
              </div>
            </div>
            <Crown className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Current Status */}
        {user && (
          <Card className="mb-8 border-2 border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className={`w-5 h-5 ${isPremium ? 'text-yellow-500' : 'text-gray-400'}`} />
                Your Subscription Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">{user.fullName}</p>
                  <p className="text-gray-600">{user.email}</p>
                </div>
                <div className="text-right">
                  <Badge variant={isPremium ? "default" : "secondary"} className="mb-2">
                    {isPremium ? "Premium Active" : "Free Plan"}
                  </Badge>
                  {isPremium && userStatus?.premiumExpiresAt && (
                    <p className="text-sm text-gray-600">
                      Expires: {new Date(userStatus.premiumExpiresAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Premium Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <Card key={index} className="border-2 border-orange-100 hover:border-orange-300 transition-colors">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Call to Action */}
        <Card className="border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50">
          <CardContent className="text-center py-8">
            <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {isPremium ? "Thank you for being Premium!" : "Ready to Upgrade?"}
            </h2>
            <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
              {isPremium 
                ? "You're enjoying all premium features. Thank you for supporting QaaqConnect!"
                : "Join thousands of maritime professionals who have upgraded to Premium for enhanced features and unlimited access."
              }
            </p>
            {!isPremium && (
              <Button
                onClick={handleUpgradeClick}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-3 text-lg font-semibold"
                data-testid="button-upgrade-premium"
              >
                <Crown className="w-5 h-5 mr-2" />
                Upgrade to Premium
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Pricing Preview */}
        {!isPremium && (
          <div className="mt-8 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Simple, Transparent Pricing</h3>
            <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <Card className="border-2 border-orange-200">
                <CardHeader>
                  <CardTitle className="flex items-center justify-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    Monthly
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-2">₹551</div>
                  <p className="text-gray-600">per month</p>
                </CardContent>
              </Card>
              <Card className="border-2 border-green-200 relative">
                <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-green-500">
                  Best Value
                </Badge>
                <CardHeader>
                  <CardTitle className="flex items-center justify-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    Yearly
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-2">₹2,611</div>
                  <p className="text-gray-600">per year</p>
                  <p className="text-sm text-green-600 font-semibold mt-1">Save 51%</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Premium Subscription Dialog */}
      <PremiumSubscriptionDialog
        open={showSubscriptionDialog}
        onOpenChange={setShowSubscriptionDialog}
      />
    </div>
  );
}