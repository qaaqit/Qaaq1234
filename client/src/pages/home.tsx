import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { authApi, setStoredToken, setStoredUser, type User } from "@/lib/auth";
import ForgotPasswordModal from "@/components/forgot-password-modal";
import SignUpModal from "@/components/signup-modal";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { Eye, EyeOff, Mail, Shield, Clock, User as UserIcon, Briefcase, Anchor } from "lucide-react";

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
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [showOtherCompany, setShowOtherCompany] = useState(false);
  const [telegraphPosition, setTelegraphPosition] = useState(0);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    whatsapp: "",
    email: "",
    maritimeRank: "",
    company: "",
    otherCompany: "",
    password: "",
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

  // Telegraph lever positions and animations
  const telegraphPositions = [
    { id: 0, label: "Blow Through", angle: -90, color: "#dc2626" },
    { id: 1, label: "STBY", angle: -45, color: "#f59e0b" },
    { id: 2, label: "Dead Slow", angle: 0, color: "#10b981" },
    { id: 3, label: "Slow", angle: 30, color: "#10b981" },
    { id: 4, label: "Half", angle: 60, color: "#10b981" },
    { id: 5, label: "Full Ahead", angle: 90, color: "#10b981" }
  ];

  // Telegraph animation effect
  useEffect(() => {
    if (loading || otpLoading) {
      const interval = setInterval(() => {
        setTelegraphPosition((prev) => (prev + 1) % telegraphPositions.length);
      }, 800);
      return () => clearInterval(interval);
    } else {
      setTelegraphPosition(otpSent ? 5 : 1); // Full Ahead when verified, STBY when ready
    }
  }, [loading, otpLoading, otpSent]);

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
          whatsappNumber: formData.whatsapp || formData.email
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
        // OTP verified successfully, now create user registration
        const registrationData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          whatsapp: formData.whatsapp,
          email: formData.email,
          maritimeRank: formData.maritimeRank,
          company: formData.company === "Other" ? formData.otherCompany : formData.company,
          password: formData.password
        };

        // Create user account
        try {
          const registerResponse = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registrationData)
          });

          const registerResult = await registerResponse.json();

          if (registerResult.success) {
            const newUser: User = {
              id: registerResult.user.id,
              fullName: `${formData.firstName} ${formData.lastName}`,
              email: formData.email,
              userType: "sailor",
              isVerified: true,
              loginCount: 1
            };

            setStoredToken(registerResult.token);
            setStoredUser(newUser);
            if (onSuccess) onSuccess(newUser);
            setLocation("/qbot");
            
            toast({
              title: `Welcome to QaaqConnect, ${formData.firstName}!`,
              description: "Your maritime professional account has been created successfully",
            });
          } else {
            throw new Error(registerResult.message || "Registration failed");
          }
        } catch (regError) {
          // If registration API fails, create a basic verified session
          const newUser: User = {
            id: formData.email,
            fullName: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
            userType: "sailor",
            isVerified: true,
            loginCount: 1
          };

          const basicToken = btoa(JSON.stringify({ 
            email: formData.email, 
            verified: true, 
            fullName: `${formData.firstName} ${formData.lastName}`,
            timestamp: Date.now() 
          }));
          
          setStoredToken(basicToken);
          setStoredUser(newUser);
          if (onSuccess) onSuccess(newUser);
          setLocation("/qbot");
          
          toast({
            title: `Welcome to QaaqConnect, ${formData.firstName}!`,
            description: "Your account has been verified successfully",
          });
        }
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
    
    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.maritimeRank || !formData.company || !formData.password) {
      toast({
        title: "Registration details required",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Check if Other company is selected but no text provided
    if (formData.company === "Other" && !formData.otherCompany.trim()) {
      toast({
        title: "Company name required",
        description: "Please specify your company name",
        variant: "destructive",
      });
      return;
    }

    if (otpSent) {
      await verifyEmailOTP();
    } else {
      await sendEmailOTP();
    }

    // This will never run in registration mode as we handle form submission above
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Anchor className="text-2xl text-white" size={28} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Join QaaqConnect</h1>
          <p className="text-gray-600">Maritime Professional Registration</p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName" className="text-sm font-medium text-gray-700 mb-2 block">
                First Name *
              </Label>
              <Input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="John"
                className="w-full h-11 text-base"
                disabled={loading || otpLoading}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName" className="text-sm font-medium text-gray-700 mb-2 block">
                Last Name *
              </Label>
              <Input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Smith"
                className="w-full h-11 text-base"
                disabled={loading || otpLoading}
                required
              />
            </div>
          </div>

          {/* WhatsApp Number */}
          <div>
            <Label htmlFor="whatsapp" className="text-sm font-medium text-gray-700 mb-2 block">
              WhatsApp Number
            </Label>
            <Input
              id="whatsapp"
              type="tel"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              placeholder="+919820012345"
              className="w-full h-11 text-base"
              disabled={loading || otpLoading}
            />
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email" className="text-sm font-medium text-gray-700 mb-2 block">
              Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john.smith@example.com"
              className="w-full h-11 text-base"
              disabled={loading || otpLoading || otpSent}
              required
            />
          </div>

          {/* Maritime Rank */}
          <div>
            <Label htmlFor="maritimeRank" className="text-sm font-medium text-gray-700 mb-2 block">
              Maritime Rank *
            </Label>
            <Select 
              value={formData.maritimeRank} 
              onValueChange={(value) => setFormData({ ...formData, maritimeRank: value })}
              disabled={loading || otpLoading}
              required
            >
              <SelectTrigger className="w-full h-11">
                <SelectValue placeholder="Select your rank" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cap">Captain</SelectItem>
                <SelectItem value="CO">Chief Officer</SelectItem>
                <SelectItem value="2O">Second Officer</SelectItem>
                <SelectItem value="3O">Third Officer</SelectItem>
                <SelectItem value="CE">Chief Engineer</SelectItem>
                <SelectItem value="2E">Second Engineer</SelectItem>
                <SelectItem value="3E">Third Engineer</SelectItem>
                <SelectItem value="4E">Fourth Engineer</SelectItem>
                <SelectItem value="Cadet">Cadet</SelectItem>
                <SelectItem value="Student">Student</SelectItem>
                <SelectItem value="ETO">Electro Technical Officer</SelectItem>
                <SelectItem value="ElecSupdt">Electrical Superintendent</SelectItem>
                <SelectItem value="TSI">Technical Superintendent</SelectItem>
                <SelectItem value="MSI">Marine Superintendent</SelectItem>
                <SelectItem value="FM">Fleet Manager</SelectItem>
                <SelectItem value="Maritime professional">Maritime Professional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Company */}
          <div>
            <Label htmlFor="company" className="text-sm font-medium text-gray-700 mb-2 block">
              Company *
            </Label>
            <Select 
              value={formData.company} 
              onValueChange={(value) => {
                setFormData({ ...formData, company: value, otherCompany: "" });
                setShowOtherCompany(value === "Other");
              }}
              disabled={loading || otpLoading}
              required
            >
              <SelectTrigger className="w-full h-11">
                <SelectValue placeholder="Select your company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Anglo">Anglo Eastern</SelectItem>
                <SelectItem value="GESCO">GESCO</SelectItem>
                <SelectItem value="MSC">MSC</SelectItem>
                <SelectItem value="Maersk">Maersk</SelectItem>
                <SelectItem value="BSM">BSM</SelectItem>
                <SelectItem value="Fleet Mgmt">Fleet Management</SelectItem>
                <SelectItem value="SCI">Shipping Corporation of India</SelectItem>
                <SelectItem value="Synergy">Synergy</SelectItem>
                <SelectItem value="Scorpio">Scorpio</SelectItem>
                <SelectItem value="VGroup">V.Group</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            
            {showOtherCompany && (
              <Input
                type="text"
                value={formData.otherCompany}
                onChange={(e) => setFormData({ ...formData, otherCompany: e.target.value })}
                placeholder="Enter your company name"
                className="w-full h-11 text-base mt-2"
                disabled={loading || otpLoading}
                required
              />
            )}
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
                placeholder="Create a secure password"
                className="w-full h-11 text-base pr-10"
                disabled={loading || otpLoading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* OTP Code (if email verification is required) */}
          {otpSent && (
            <div>
              <Label htmlFor="otpCode" className="text-sm font-medium text-gray-700 mb-2 block">
                Email Verification Code *
              </Label>
              <Input
                id="otpCode"
                type="text"
                value={formData.otpCode}
                onChange={(e) => setFormData({ ...formData, otpCode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                placeholder="Enter 6-digit code"
                className="w-full h-11 text-base text-center text-xl font-mono tracking-widest"
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

          {/* Telegraph Lever Submit Button */}
          <div className="relative">
            <button
              type="submit"
              className={`w-full h-20 relative overflow-hidden rounded-2xl font-bold text-white text-lg transition-all duration-300 transform hover:scale-105 ${
                otpSent
                  ? 'bg-gradient-to-br from-green-600 via-emerald-600 to-green-700 shadow-lg shadow-green-500/25'
                  : 'bg-gradient-to-br from-orange-600 via-red-600 to-orange-700 shadow-lg shadow-orange-500/25'
              } ${loading || otpLoading ? 'animate-pulse' : ''}`}
              disabled={loading || otpLoading || (otpSent && otpCountdown <= 0)}
            >
              {/* Telegraph Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent transform -skew-x-12 animate-pulse"></div>
              </div>
              
              {/* Telegraph Lever Visual */}
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <div className="relative w-12 h-12">
                  {/* Telegraph Base */}
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-3 bg-gray-800 rounded-full shadow-inner"></div>
                  
                  {/* Telegraph Lever */}
                  <div 
                    className="absolute bottom-1 left-1/2 transform -translate-x-1/2 origin-bottom transition-transform duration-500 ease-in-out"
                    style={{
                      transform: `translateX(-50%) rotate(${telegraphPositions[telegraphPosition].angle}deg)`,
                    }}
                  >
                    <div className="w-1 h-8 bg-gradient-to-t from-gray-600 to-gray-300 rounded-full shadow-md"></div>
                    <div 
                      className="absolute -top-1 -left-1 w-3 h-3 rounded-full shadow-lg transition-colors duration-300"
                      style={{ backgroundColor: telegraphPositions[telegraphPosition].color }}
                    ></div>
                  </div>
                  
                  {/* Position Markers */}
                  <div className="absolute inset-0">
                    {telegraphPositions.map((pos, index) => (
                      <div
                        key={pos.id}
                        className={`absolute w-1 h-1 rounded-full transition-all duration-300 ${
                          index === telegraphPosition ? 'bg-white scale-150' : 'bg-gray-400 scale-75'
                        }`}
                        style={{
                          bottom: '12px',
                          left: '50%',
                          transform: `translateX(-50%) rotate(${pos.angle}deg) translateY(-16px)`,
                        }}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Button Content */}
              <div className="flex items-center justify-center space-x-3 ml-8">
                {loading || otpLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{otpLoading ? 'SENDING SIGNAL...' : 'PROCESSING...'}</span>
                  </>
                ) : otpSent ? (
                  <>
                    <Shield className="w-5 h-5" />
                    <span>FULL AHEAD - VERIFY & REGISTER</span>
                  </>
                ) : (
                  <>
                    <Anchor className="w-5 h-5" />
                    <span>SEND VERIFICATION SIGNAL</span>
                  </>
                )}
              </div>

              {/* Telegraph Position Label */}
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <div className="text-xs font-mono opacity-80">
                  {telegraphPositions[telegraphPosition].label}
                </div>
              </div>
            </button>

            {/* Telegraph Position Indicator */}
            <div className="absolute -bottom-6 left-4 text-xs text-gray-500 font-mono">
              Engine: {telegraphPositions[telegraphPosition].label}
            </div>
          </div>

          {/* Resend OTP */}
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

        {/* Footer */}
        <div className="mt-10 text-center">
          <p className="text-xs text-gray-500">
            Join the global maritime professional community
          </p>
        </div>
      </div>
    </div>
  );
}