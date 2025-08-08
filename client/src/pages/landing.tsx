import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, MapPin, Users, Anchor, ArrowRight, Zap, Globe, ShieldCheck } from "lucide-react";
import { type User } from "@/lib/auth";
import UserDropdown from "@/components/user-dropdown";
import BottomNav from "@/components/bottom-nav";
import qaaqLogo from "@/assets/qaaq-logo.png";

interface LandingProps {
  user: User;
}

export default function Landing({ user }: LandingProps) {
  const [, setLocation] = useLocation();

  const features = [
    {
      icon: MessageCircle,
      title: "QBOT AI Assistant",
      description: "Get instant maritime technical support and answers",
      action: "Start Chat",
      path: "/qbot",
      gradient: "from-orange-500 to-red-500",
      bgColor: "bg-gradient-to-br from-orange-50 to-red-50"
    },
    {
      icon: MapPin,
      title: "Map Radar Discovery",
      description: "Find nearby sailors and maritime professionals",
      action: "Discover Now",
      path: "/discover",
      gradient: "from-blue-500 to-teal-500",
      bgColor: "bg-gradient-to-br from-blue-50 to-teal-50"
    },
    {
      icon: Users,
      title: "Questions & Answers",
      description: "Browse 1200+ authentic maritime Q&A from professionals",
      action: "Browse Q&A",
      path: "/my-questions",
      gradient: "from-green-500 to-emerald-500",
      bgColor: "bg-gradient-to-br from-green-50 to-emerald-50"
    }
  ];

  const stats = [
    { label: "Maritime Professionals", value: "1000+", icon: Users },
    { label: "Technical Questions", value: "1200+", icon: MessageCircle },
    { label: "Global Ports", value: "500+", icon: Globe },
    { label: "AI Responses", value: "24/7", icon: Zap }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-orange-200 sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
                <img src={qaaqLogo} alt="QAAQ Logo" className="w-full h-full object-cover rounded-full" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                  QaaqConnect
                </h1>
                <p className="text-sm text-gray-600">Maritime Community</p>
              </div>
            </div>
            <UserDropdown user={user} onLogout={() => window.location.reload()} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 pb-20">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <Badge variant="secondary" className="mb-3">
              <Anchor className="w-4 h-4 mr-1" />
              Welcome aboard, {user.fullName || 'Maritime Professional'}!
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            Your Maritime Hub Awaits
          </h2>
          <p className="text-gray-600 max-w-md mx-auto text-sm sm:text-base">
            Connect, discover, and get instant AI assistance for all your maritime needs
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="text-center bg-white/70 backdrop-blur-sm border-orange-100">
              <CardContent className="p-3">
                <stat.icon className="w-5 h-5 mx-auto mb-1 text-orange-600" />
                <div className="text-lg font-bold text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-600">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Features */}
        <div className="space-y-4 mb-8">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className={`${feature.bgColor} border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer`}
              onClick={() => setLocation(feature.path)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {feature.title}
                      </CardTitle>
                      <CardDescription className="text-sm text-gray-600">
                        {feature.description}
                      </CardDescription>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  className={`w-full bg-gradient-to-r ${feature.gradient} hover:opacity-90 text-white shadow-sm`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocation(feature.path);
                  }}
                >
                  {feature.action}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Access Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-orange-100">
          <div className="flex items-center space-x-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Maritime Professional</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            You're connected to the QAAQ maritime database with 1200+ authentic Q&A from industry professionals.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setLocation('/profile')}
              className="border-orange-200 hover:bg-orange-50"
            >
              View Profile
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setLocation('/chat')}
              className="border-orange-200 hover:bg-orange-50"
            >
              Direct Messages
            </Button>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav currentPath="/" />
    </div>
  );
}