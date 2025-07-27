import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { authApi, setStoredToken, setStoredUser, type User } from "@/lib/auth";

interface RegisterProps {
  onSuccess: (user: User) => void;
}

export default function Register({ onSuccess }: RegisterProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    userId: "",
    password: "",
    userType: "" as "sailor" | "local" | "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      // Login flow
      if (!formData.userId || !formData.password) {
        toast({
          title: "Login details required",
          description: "Please enter both User ID and Password",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);
      try {
        const result = await authApi.login(formData.userId, formData.password);
        
        // QAAQ login provides immediate access
        if (result.token) {
          setStoredToken(result.token);
          setStoredUser(result.user);
          onSuccess(result.user);
        }
        setLocation("/discover");
        toast({
          title: "Welcome back! 🚢",
          description: "You're all set to explore",
        });
      } catch (error) {
        toast({
          title: "Login failed",
          description: error instanceof Error ? error.message : "Please try again",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    } else {
      // Registration flow
      if (!formData.fullName || !formData.email || !formData.userType) {
        toast({
          title: "Missing information",
          description: "Please fill in all fields",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);
      try {
        const result = await authApi.register(formData);
        
        if (result.token) {
          setStoredToken(result.token);
          setStoredUser(result.user);
          onSuccess(result.user);
        }
        
        setLocation("/discover");
        toast({
          title: "Welcome to QaaqConnect! 🎉",
          description: "You're ready to start exploring",
        });
      } catch (error) {
        toast({
          title: "Registration failed",
          description: error instanceof Error ? error.message : "Please try again",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const selectUserType = (type: "sailor" | "local") => {
    setFormData({ ...formData, userType: type });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md maritime-shadow">
        <CardHeader className="text-center">
          <div className="w-16 h-16 gradient-bg rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-anchor text-2xl text-white"></i>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {isLogin ? "Welcome Back" : "Join QaaqConnect"}
          </CardTitle>
          <p className="text-gray-600">
            {isLogin ? "Liberal login policy - any password works for first 2 logins!" : "Super quick registration - get started in seconds"}
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div>
                <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                  USER NAME (This may be ur country code +91 & whatsapp number )
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. +91 9876543210"
                  className="mt-2"
                  required
                />
              </div>
            )}

            {isLogin ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="userId" className="text-sm font-medium text-gray-700">
                    User ID (Full Name, Email, or Phone)
                  </Label>
                  <Input
                    id="userId"
                    type="text"  
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    placeholder="e.g. Patel, captain.li@qaaq.com, +919920027697"
                    className="mt-2"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password (City name or any password for first 2 logins)
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="e.g. Mumbai, Houston, Singapore"
                    className="mt-2"
                    required
                  />
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your.email@example.com"
                  className="mt-2"
                  required
                />
              </div>
            )}

            {!isLogin && (
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-4 block">
                  I'm a:
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => selectUserType("sailor")}
                    className={`h-auto p-4 flex flex-col items-center space-y-2 ${
                      formData.userType === "sailor"
                        ? "border-navy bg-navy/5 text-navy"
                        : "border-gray-200 hover:border-navy hover:bg-navy/5"
                    }`}
                  >
                    <i className="fas fa-ship text-2xl"></i>
                    <span className="font-medium">Sailor 🚢</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => selectUserType("local")}
                    className={`h-auto p-4 flex flex-col items-center space-y-2 ${
                      formData.userType === "local"
                        ? "border-ocean-teal bg-ocean-teal/5 text-ocean-teal"
                        : "border-gray-200 hover:border-ocean-teal hover:bg-ocean-teal/5"
                    }`}
                  >
                    <i className="fas fa-home text-2xl"></i>
                    <span className="font-medium">Local 🏠</span>
                  </Button>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full gradient-bg text-white hover:shadow-lg transition-all transform hover:scale-[1.02]"
            >
              {loading ? (
                <i className="fas fa-spinner fa-spin mr-2"></i>
              ) : null}
              {isLogin ? "Sign In" : "Let's Go! 🚀"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              {isLogin ? "New to QaaqConnect?" : "Already have an account?"}
              <Button
                variant="link"
                onClick={() => setIsLogin(!isLogin)}
                className="ocean-teal font-medium p-0 ml-1"
              >
                {isLogin ? "Join now" : "Sign in"}
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
