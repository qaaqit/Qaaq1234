import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Crown, 
  User, 
  Calendar, 
  CreditCard, 
  CheckCircle,
  ArrowLeft,
  Sparkles
} from "lucide-react";
import { useLocation } from "wouter";

interface User {
  id: string;
  fullName: string;
  email: string;
  isAdmin?: boolean;
}

interface UserStatus {
  isPremium?: boolean;
  isSuperUser?: boolean;
  premiumExpiresAt?: string | null;
  subscriptionType?: string;
  subscriptionStatus?: string;
}

export default function PremiumStatusPage() {
  const [, setLocation] = useLocation();

  // DISABLED FOR TESTING STABILITY - no auth requests
  // const { data: user } = useQuery<User>({
  //   queryKey: ["/api/auth/user"],
  // });
  const user = null;

  // Fetch user subscription status
  const { data: userStatusData, isLoading } = useQuery({
    queryKey: ["/api/user/subscription-status"],
    enabled: false, // DISABLED for stability testing
  });

  const userStatus = userStatusData as UserStatus;
  const isPremium = userStatus?.isPremium || false;
  const isSuperUser = userStatus?.isSuperUser || false;

  const formatExpiryDate = (dateString: string | null) => {
    if (!dateString) return "No expiry date";
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return "Invalid date";
    }
  };

  const getPlanType = () => {
    if (isSuperUser) return "Super User";
    if (isPremium) return "Premium";
    return "Free";
  };

  const getPlanBadgeVariant = () => {
    if (isSuperUser) return "default";
    if (isPremium) return "secondary";
    return "outline";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your subscription status...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-orange-100">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/qbot")}
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to QBOT
              </Button>
              <div className="flex items-center gap-2">
                <Crown className="h-6 w-6 text-orange-500" />
                <h1 className="text-xl font-bold text-gray-900">Subscription Status</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* User Profile Card */}
          <Card className="border-2 border-orange-200">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-t-lg">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-full">
                  <User className="h-8 w-8" />
                </div>
                <div>
                  <CardTitle className="text-xl">{user?.fullName || "User"}</CardTitle>
                  <p className="text-orange-100">{user?.email}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-medium text-gray-900">Current Plan:</span>
                  <Badge 
                    variant={getPlanBadgeVariant()}
                    className={`text-lg px-4 py-2 ${
                      isPremium || isSuperUser 
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white border-0' 
                        : 'bg-gray-100 text-gray-700'
                    }`}
                    data-testid="badge-plan-type"
                  >
                    {isPremium || isSuperUser ? (
                      <Crown className="h-4 w-4 mr-2" />
                    ) : null}
                    {getPlanType()} Plan
                  </Badge>
                </div>
                {(isPremium || isSuperUser) && (
                  <Sparkles className="h-6 w-6 text-orange-500" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Subscription Details Card */}
          {(isPremium || isSuperUser) && (
            <Card className="border-2 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  Premium Active
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Expires On</p>
                      <p className="font-medium" data-testid="text-expiry-date">
                        {formatExpiryDate(userStatus?.premiumExpiresAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Subscription Type</p>
                      <p className="font-medium" data-testid="text-subscription-type">
                        {userStatus?.subscriptionType ?? "Premium"}
                      </p>
                    </div>
                  </div>
                </div>
                
                {userStatus?.subscriptionStatus && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={userStatus.subscriptionStatus === 'active' ? 'default' : 'secondary'}
                        className={userStatus.subscriptionStatus === 'active' ? 'bg-green-500' : ''}
                        data-testid="badge-subscription-status"
                      >
                        {userStatus.subscriptionStatus}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Free Plan Info */}
          {!isPremium && !isSuperUser && (
            <Card className="border-2 border-gray-200">
              <CardContent className="p-6 text-center">
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="h-8 w-8 text-gray-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Free Plan</h3>
                    <p className="text-gray-600 mt-2">
                      You're currently on the free plan. Upgrade to Premium for enhanced features and unlimited access.
                    </p>
                  </div>
                  <Button
                    onClick={() => setLocation("/premium")}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                    data-testid="button-upgrade-premium"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Premium
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Premium Features List */}
          {(isPremium || isSuperUser) && (
            <Card className="border-2 border-orange-200">
              <CardHeader>
                <CardTitle className="text-orange-700">Your Premium Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    "Premium Google Maps access",
                    "Unlimited QBOT queries",
                    "Advanced user discovery",
                    "Priority support",
                    "Enhanced security features",
                    "Premium maritime tools"
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <Button
              variant="outline"
              onClick={() => setLocation("/qbot")}
              className="border-orange-200 text-orange-600 hover:bg-orange-50"
              data-testid="button-go-qbot"
            >
              Go to QBOT Chat
            </Button>
            {!isPremium && !isSuperUser && (
              <Button
                onClick={() => setLocation("/premium")}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                data-testid="button-view-premium"
              >
                View Premium Plans
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}