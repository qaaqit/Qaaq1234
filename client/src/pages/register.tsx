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
        setLocation("/");
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
        
        setLocation("/");
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
            {isLogin ? "Connect with maritime professionals worldwide" : "Super quick registration - get started in seconds"}
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
                    USER NAME (This may be ur country code +91 & whatsapp number )
                  </Label>
                  <Input
                    id="userId"
                    type="text"  
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    placeholder="e.g. Patel, captain.li@qaaq.com, +91 9800898008"
                    className="mt-2"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter your password"
                    className="mt-2"
                    required
                  />
                </div>
                <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                  <p><strong>New users:</strong> Default password is <code className="bg-blue-100 px-1 rounded">1234koihai</code></p>
                  <p className="text-xs mt-1">You'll need to change this at your 3rd login.</p>
                </div>
              </div>
            ) : (
              <>
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

                <div>
                  <Label htmlFor="userType" className="text-sm font-medium text-gray-700">
                    Are you a sailor or local maritime professional?
                  </Label>
                  <div className="mt-2 relative">
                    <select
                      id="userType"
                      value={formData.userType}
                      onChange={(e) => setFormData({ ...formData, userType: e.target.value as "sailor" | "local" })}
                      className="w-full bg-gray-100 bg-opacity-50 backdrop-blur-sm border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-teal focus:border-transparent appearance-none"
                      required
                    >
                      <option value="">Select your role...</option>
                      <option value="sailor">🚢 Sailor (working on ships)</option>
                      <option value="local">🏠 Local (port agent, supplier, etc.)</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </>
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
