import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Anchor, Eye, EyeOff, Mail, Lock } from "lucide-react";
import qaaqLogoPath from "@assets/ICON_1754950288816.png";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { User } from "@/lib/auth";

interface LoginPageProps {
  onSuccess: (user: User) => void;
}

export default function LoginPage({ onSuccess }: LoginPageProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    qaaqId: "",
    password: ""
  });
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

  // Handle Google auth errors from URL params
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
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qaaqId: formData.qaaqId.trim(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token and user data
        localStorage.setItem('qaaq_token', data.token);
        localStorage.setItem('qaaq_user', JSON.stringify(data.user));
        
        onSuccess(data.user);
        
        toast({
          title: "Welcome back!",
          description: `Logged in successfully as ${data.user.fullName}`,
        });
        
        navigate('/qbot');
      } else {
        toast({
          title: "Login Failed",
          description: data.error || "Invalid credentials. Please check your QAAQ ID and password.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Error",
        description: "Unable to connect to server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.qaaqId.trim()) {
      toast({
        title: "QAAQ ID Required",
        description: "Please enter your QAAQ ID first to reset your password",
        variant: "destructive",
      });
      return;
    }

    setForgotPasswordLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qaaqId: formData.qaaqId.trim()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Password Reset Email Sent",
          description: "Check your email for a temporary password to log in",
        });
      } else {
        toast({
          title: "Reset Failed",
          description: data.message || "Unable to send password reset email",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      toast({
        title: "Reset Error",
        description: "Unable to process password reset. Please try again.",
        variant: "destructive",
      });
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <img src={qaaqLogoPath} alt="QAAQ" className="w-12 h-12" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to QaaqConnect</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* QAAQ ID */}
          <div>
            <Label htmlFor="qaaqId" className="text-sm font-medium text-gray-700 mb-2 block">
              QAAQ ID / Username *
            </Label>
            <div className="relative">
              <Input
                id="qaaqId"
                type="text"
                value={formData.qaaqId}
                onChange={(e) => setFormData({ ...formData, qaaqId: e.target.value })}
                placeholder="Enter your QAAQ ID or username"
                className="w-full h-11 text-base pl-10"
                disabled={loading}
                required
              />
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Your username or country code + WhatsApp number
            </p>
          </div>

          {/* Password */}
          <div>
            <Label htmlFor="password" className="text-sm font-medium text-gray-700 mb-2 block">
              Password *
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter your password"
                className="w-full h-11 text-base pl-10 pr-10"
                disabled={loading}
                required
              />
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full h-12 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold"
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Signing in...
              </>
            ) : (
              <>
                <Anchor className="w-4 h-4 mr-2" />
                Sign In
              </>
            )}
          </Button>

          {/* Forgot Password Link */}
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={forgotPasswordLoading}
              className="text-sm text-orange-600 hover:text-orange-700 underline transition-colors disabled:opacity-50"
            >
              {forgotPasswordLoading ? "Sending..." : "Forgot your password?"}
            </button>
          </div>
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

        {/* Register Link */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            New to maritime networking?{" "}
            <button
              onClick={() => navigate('/register')}
              className="text-orange-600 hover:text-orange-800 font-semibold"
            >New User Signup</button>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Connecting maritime professionals worldwide
          </p>
        </div>
      </div>
    </div>
  );
}