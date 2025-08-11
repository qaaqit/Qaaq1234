import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authApi, setStoredToken, setStoredUser, type User } from "@/lib/auth";
import ForgotPasswordModal from "@/components/forgot-password-modal";
import SignUpModal from "@/components/signup-modal";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { Eye, EyeOff } from "lucide-react";

interface HomeProps {
  onSuccess?: (user: User) => void;
}

export default function Home({ onSuccess }: HomeProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    userId: "",
    password: "",
  });

  // Check for authentication errors in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    
    if (error === 'auth_failed') {
      toast({
        title: "Authentication Failed",
        description: "Google sign-in was not successful. Please try again or use your regular login.",
        variant: "destructive",
      });
      
      // Clean up the URL by removing the error parameter
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      // Try robust authentication first
      const robustResponse = await fetch('/api/auth/login-robust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: formData.userId, password: formData.password })
      });
      
      const robustResult = await robustResponse.json();
      
      if (robustResult.requiresMerge) {
        // Redirect to merge page
        setLocation(`/merge-accounts/${robustResult.mergeSessionId}`);
        toast({
          title: "Multiple accounts found",
          description: "Choose how to proceed with your accounts",
        });
        return;
      }
      
      if (robustResult.success) {
        setStoredToken(robustResult.token);
        setStoredUser(robustResult.user);
        if (onSuccess) onSuccess(robustResult.user);
        setLocation("/");
        toast({
          title: "Welcome back!",
          description: "You're all set to explore",
        });
        return;
      }
      
      // Fallback to original authentication
      const result = await authApi.login(formData.userId, formData.password);
      
      if (result.token) {
        setStoredToken(result.token);
        setStoredUser(result.user);
        if (onSuccess) onSuccess(result.user);
      }
      setLocation("/");
      toast({
        title: "Welcome back!",
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
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-anchor text-2xl text-white"></i>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">QaaqConnect</h1>
          <p className="text-gray-600">Maritime Community Login</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="userId" className="text-sm font-medium text-gray-700 mb-2 block">
              User Name (Country code + WhatsApp number)
            </Label>
            <Input
              id="userId"
              type="text"
              value={formData.userId}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              placeholder="e.g. +919820012345"
              className="w-full h-12 text-base"
              disabled={loading}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="password" className="text-sm font-medium text-gray-700 mb-2 block">
              Password (Your city name)
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="e.g. mumbai"
                className="w-full h-12 text-base pr-10"
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          
          <Button 
            type="submit" 
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold"
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Logging in...
              </>
            ) : (
              "Login to QaaqConnect"
            )}
          </Button>
        </form>

        {/* Google Sign In */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>
          <div className="mt-4">
            <GoogleAuthButton />
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-8 text-center space-y-4">
          <div className="space-x-4">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Forgot Password?
            </button>
            <button
              type="button"
              onClick={() => setShowSignUp(true)}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Sign Up
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Maritime professionals connecting worldwide
          </p>
        </div>
      </div>

      {/* Modals */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
      
      <SignUpModal
        isOpen={showSignUp}
        onClose={() => setShowSignUp(false)}
        onSuccess={onSuccess}
      />
    </div>
  );
}