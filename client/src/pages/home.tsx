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
import { Eye, EyeOff, Mail, Shield, Clock } from "lucide-react";

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
  const [loginMode, setLoginMode] = useState<'normal' | 'email-otp'>('normal');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [formData, setFormData] = useState({
    userId: "",
    password: "",
    email: "",
    otpCode: "",
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

  // OTP countdown timer
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  // Send email OTP
  const sendEmailOTP = async () => {
    if (!formData.email || !formData.email.includes('@')) {
      toast({
        title: "Valid email required",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setOtpLoading(true);
    try {
      const response = await fetch('/api/auth/send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          whatsappNumber: formData.userId || formData.email
        })
      });

      const result = await response.json();

      if (result.success) {
        setOtpSent(true);
        setOtpCountdown(600); // 10 minutes countdown
        toast({
          title: "Verification code sent!",
          description: "Check your email for the 6-digit verification code",
        });
      } else {
        toast({
          title: "Failed to send verification code",
          description: result.message || "Please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Email service error",
        description: "Please try again or use regular login",
        variant: "destructive",
      });
    } finally {
      setOtpLoading(false);
    }
  };

  // Verify email OTP
  const verifyEmailOTP = async () => {
    if (!formData.email || !formData.otpCode) {
      toast({
        title: "Verification details required",
        description: "Please enter both email and OTP code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/verify-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          otpCode: formData.otpCode
        })
      });

      const result = await response.json();

      if (result.success) {
        // OTP verified successfully, now create/login user
        // For now, we'll create a basic user session
        const mockUser: User = {
          id: formData.email,
          fullName: "Email Verified User",
          email: formData.email,
          userType: "regular",
          isVerified: true,
          loginCount: 1
        };

        // Generate a basic token (in production, this should come from the server)
        const mockToken = btoa(JSON.stringify({ email: formData.email, verified: true, timestamp: Date.now() }));
        
        setStoredToken(mockToken);
        setStoredUser(mockUser);
        if (onSuccess) onSuccess(mockUser);
        setLocation("/");
        
        toast({
          title: "Welcome to QaaqConnect!",
          description: "Email verification successful",
        });
      } else {
        toast({
          title: "Verification failed",
          description: result.message || "Invalid or expired code",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Verification error",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loginMode === 'email-otp') {
      if (otpSent) {
        await verifyEmailOTP();
      } else {
        await sendEmailOTP();
      }
      return;
    }
    
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

        {/* Login Mode Toggle */}
        <div className="mb-6 flex bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setLoginMode('normal')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              loginMode === 'normal'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Shield className="w-4 h-4 inline mr-2" />
            Regular Login
          </button>
          <button
            type="button"
            onClick={() => setLoginMode('email-otp')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              loginMode === 'email-otp'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Mail className="w-4 h-4 inline mr-2" />
            Email OTP
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {loginMode === 'normal' ? (
            <>
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
            </>
          ) : (
            <>
              {/* Email OTP Mode */}
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 mb-2 block">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your.email@example.com"
                  className="w-full h-12 text-base"
                  disabled={loading || otpLoading || otpSent}
                  required
                />
              </div>

              {otpSent && (
                <div>
                  <Label htmlFor="otpCode" className="text-sm font-medium text-gray-700 mb-2 block">
                    Verification Code
                  </Label>
                  <Input
                    id="otpCode"
                    type="text"
                    value={formData.otpCode}
                    onChange={(e) => setFormData({ ...formData, otpCode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    placeholder="Enter 6-digit code"
                    className="w-full h-12 text-base text-center text-2xl font-mono tracking-widest"
                    disabled={loading}
                    maxLength={6}
                    required
                  />
                  {otpCountdown > 0 && (
                    <div className="flex items-center justify-center mt-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4 mr-1" />
                      Code expires in {Math.floor(otpCountdown / 60)}:{(otpCountdown % 60).toString().padStart(2, '0')}
                    </div>
                  )}
                </div>
              )}

              <Button 
                type="submit" 
                className={`w-full h-12 font-semibold ${
                  otpSent
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                    : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700'
                } text-white`}
                disabled={loading || otpLoading || (otpSent && otpCountdown <= 0)}
              >
                {loading || otpLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    {otpLoading ? 'Sending code...' : 'Verifying...'}
                  </>
                ) : otpSent ? (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Verify Code & Login
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Verification Code
                  </>
                )}
              </Button>

              {otpSent && otpCountdown <= 0 && (
                <Button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setFormData({ ...formData, otpCode: "" });
                    sendEmailOTP();
                  }}
                  variant="outline"
                  className="w-full h-10 text-sm"
                  disabled={otpLoading}
                >
                  Resend Verification Code
                </Button>
              )}
            </>
          )}
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