import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { authApi, setStoredToken, setStoredUser, type User } from "@/lib/auth";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { Eye, EyeOff, Mail, Shield, Clock, User as UserIcon, Briefcase, Anchor, ArrowLeft } from "lucide-react";

interface RegisterProps {
  onSuccess: (user: User) => void;
}

export default function Register({ onSuccess }: RegisterProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
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

  // Telegraph lever positions and animations (semicircle layout)
  const telegraphPositions = [
    { id: 0, label: "FULL ASTERN", angle: 0, color: "#dc2626" },
    { id: 1, label: "HALF ASTERN", angle: 30, color: "#ea580c" },
    { id: 2, label: "SLOW ASTERN", angle: 60, color: "#f59e0b" },
    { id: 3, label: "STOP", angle: 90, color: "#6b7280" },
    { id: 4, label: "SLOW AHEAD", angle: 120, color: "#10b981" },
    { id: 5, label: "FULL AHEAD", angle: 150, color: "#059669" }
  ];

  // Telegraph position based on form completion
  useEffect(() => {
    if (loading || otpLoading) {
      const interval = setInterval(() => {
        setTelegraphPosition((prev) => (prev + 1) % telegraphPositions.length);
      }, 600);
      return () => clearInterval(interval);
    } else {
      // Calculate form completion and set telegraph position accordingly
      const fields = [
        formData.firstName,
        formData.lastName, 
        formData.email,
        formData.maritimeRank,
        formData.company,
        formData.password
      ];
      
      const filledFields = fields.filter(field => field.trim() !== '').length;
      const completionPosition = Math.min(filledFields, 5); // Max position is 5 (Full Ahead)
      
      if (otpSent) {
        setTelegraphPosition(5); // Full Ahead when OTP sent
      } else {
        setTelegraphPosition(completionPosition);
      }
    }
  }, [loading, otpLoading, otpSent, formData.firstName, formData.lastName, formData.email, formData.maritimeRank, formData.company, formData.password]);

  // Send email OTP
  const sendEmailOTP = async () => {
    if (!formData.email || !formData.email.includes('@')) {
      toast({
        title: "Email Required",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setOtpLoading(true);
    try {
      const response = await fetch('/api/auth/send-email-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setOtpSent(true);
        setOtpCountdown(300); // 5 minutes
        toast({
          title: "Verification Code Sent!",
          description: `Check your email at ${formData.email}`,
        });
      } else {
        toast({
          title: "Failed to Send Code",
          description: data.error || "Unable to send verification code. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Email OTP error:', error);
      toast({
        title: "Email Error",
        description: "Unable to send verification code. Please check your internet connection.",
        variant: "destructive",
      });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email || 
        !formData.maritimeRank || !formData.company || !formData.password) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // If OTP not sent yet, send it first
    if (!otpSent) {
      await sendEmailOTP();
      return;
    }

    // If OTP sent but not entered
    if (!formData.otpCode || formData.otpCode.length !== 6) {
      toast({
        title: "Verification Required",
        description: "Please enter the 6-digit verification code sent to your email",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Verify OTP and complete registration
      const response = await fetch('/api/auth/complete-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          whatsapp: formData.whatsapp.trim(),
          email: formData.email.trim(),
          maritimeRank: formData.maritimeRank,
          company: formData.company === "Other" ? formData.otherCompany.trim() : formData.company,
          password: formData.password,
          otpCode: formData.otpCode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token and user data
        setStoredToken(data.token);
        setStoredUser(data.user);
        
        onSuccess(data.user);
        
        toast({
          title: "Welcome to QaaqConnect! 🚢",
          description: `Registration successful! Welcome aboard, ${formData.firstName}`,
        });
        
        setLocation('/qbot');
      } else {
        toast({
          title: "Registration Failed",
          description: data.error || "Unable to complete registration. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Error",
        description: "Unable to connect to server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center p-2">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-4 border border-gray-200 overflow-hidden">
        {/* Back Button */}
        <div className="flex items-center mb-3">
          <button
            onClick={() => setLocation('/login')}
            className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span className="text-xs font-medium">Back</span>
          </button>
        </div>

        {/* Header with Telegraph */}
        <div className="text-center mb-4">
          {/* Title */}
          <h1 className="font-bold text-gray-900 mb-1 text-[24px]">MV QaaqConnect</h1>
          <p className="text-xs text-gray-600 mb-3">Welcome to our Gangway!</p>
          
          {/* Maritime Telegraph Display */}
          <div className="mb-3">
            <div className="relative w-64 h-32 mx-auto">
              {/* Telegraph Base Platform */}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-48 h-6 bg-gradient-to-b from-gray-600 to-gray-800 rounded shadow-lg"></div>
              
              {/* Semicircle Brass Frame */}
              <div 
                className="absolute bottom-3 left-1/2 transform -translate-x-1/2 w-44 h-22 bg-gradient-to-br from-yellow-600 via-yellow-500 to-yellow-700 shadow-xl border-4 border-yellow-800"
                style={{
                  borderRadius: '240px 240px 0 0',
                  height: '88px'
                }}
              >
                {/* Inner Brass Ring */}
                <div 
                  className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-40 h-20 bg-gradient-to-br from-yellow-500 via-yellow-400 to-yellow-600 shadow-inner border-2 border-yellow-700"
                  style={{
                    borderRadius: '200px 200px 0 0'
                  }}
                >
                  {/* Black Face Semicircle */}
                  <div 
                    className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-36 h-18 bg-black shadow-inner"
                    style={{
                      borderRadius: '180px 180px 0 0'
                    }}
                  >
                    {/* Telegraph Sections SVG */}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 144 72">
                      {/* Section Dividers and Labels */}
                      {telegraphPositions.map((pos, index) => {
                        const angleRad = (pos.angle * Math.PI) / 180;
                        const x1 = 72 + Math.cos(angleRad) * 56;
                        const y1 = 72 - Math.sin(angleRad) * 56;
                        const x2 = 72 + Math.cos(angleRad) * 44;
                        const y2 = 72 - Math.sin(angleRad) * 44;
                        const textX = 72 + Math.cos(angleRad) * 32;
                        const textY = 72 - Math.sin(angleRad) * 32;
                        
                        return (
                          <g key={pos.id}>
                            {/* Divider Line */}
                            <line
                              x1={x1}
                              y1={y1}
                              x2={x2}
                              y2={y2}
                              stroke="white"
                              strokeWidth="1"
                            />
                            {/* Position Indicator Dot */}
                            <circle
                              cx={x1}
                              cy={y1}
                              r={index === telegraphPosition ? "2" : "1"}
                              fill={index === telegraphPosition ? pos.color : "#666"}
                              className="transition-all duration-300"
                            />
                            {/* Section Labels */}
                            <text
                              x={textX}
                              y={textY + 2}
                              fill="white"
                              fontSize="5"
                              fontWeight="bold"
                              textAnchor="middle"
                              fontFamily="Arial, sans-serif"
                            >
                              {pos.label.split(' ').map((word, i) => (
                                <tspan key={i} x={textX} dy={i === 0 ? 0 : "5"}>
                                  {word}
                                </tspan>
                              ))}
                            </text>
                          </g>
                        );
                      })}
                      
                      {/* Center Text */}
                      <text x="72" y="56" fill="white" fontSize="4" fontWeight="bold" textAnchor="middle" fontFamily="serif">
                        ENGINE TELEGRAPH
                      </text>
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Telegraph Lever Handle (Protruding) */}
              <div 
                className="absolute bottom-3 left-1/2 transform-gpu transition-transform duration-700 ease-out z-20"
                style={{
                  transformOrigin: '0 88px',
                  transform: `translateX(-50%) rotate(${telegraphPositions[telegraphPosition].angle - 90}deg)`,
                }}
              >
                {/* Lever Shaft */}
                <div className="w-4 h-20 bg-gradient-to-t from-gray-800 via-gray-600 to-gray-500 rounded-full shadow-lg"></div>
                
                {/* Lever Handle (Chrome Knob) */}
                <div className="absolute -top-4 -left-1 w-6 h-8 bg-gradient-to-br from-gray-300 via-gray-200 to-gray-400 rounded-full shadow-lg border-2 border-gray-500">
                  <div className="absolute inset-1 bg-gradient-to-br from-white to-gray-300 rounded-full"></div>
                  {/* Chrome Highlight */}
                  <div className="absolute top-1 left-1 w-2 h-2 bg-white rounded-full opacity-80"></div>
                </div>
              </div>
              
              {/* Center Pivot */}
              <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-gradient-to-br from-yellow-400 to-yellow-700 rounded-full shadow-lg border-2 border-yellow-800 z-10"></div>
            </div>
            
            {/* Telegraph Status Panel */}
            <div className="mt-0">
              <div className="bg-gradient-to-br from-gray-700 to-gray-900 text-white text-sm font-bold px-4 py-2 rounded-b border-2 border-gray-600 shadow-lg">
                <div className="text-center font-mono">
                  {telegraphPositions[telegraphPosition].label}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="firstName" className="text-xs font-medium text-gray-700 mb-1 block">
                First Name *
              </Label>
              <Input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="Krish"
                className="w-full h-8 text-sm"
                disabled={loading || otpLoading}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName" className="text-xs font-medium text-gray-700 mb-1 block">
                Last Name *
              </Label>
              <Input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Kapoor"
                className="w-full h-8 text-sm"
                disabled={loading || otpLoading}
                required
              />
            </div>
          </div>

          {/* WhatsApp Number */}
          <div>
            <Label htmlFor="whatsapp" className="text-xs font-medium text-gray-700 mb-1 block">
              WhatsApp Number
            </Label>
            <Input
              id="whatsapp"
              type="tel"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              placeholder="+919820012345"
              className="w-full h-8 text-sm"
              disabled={loading || otpLoading}
            />
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email" className="text-xs font-medium text-gray-700 mb-1 block">
              Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="krish.kapoor@example.com"
              className="w-full h-8 text-sm"
              disabled={loading || otpLoading || otpSent}
              required
            />
          </div>

          {/* Maritime Rank */}
          <div>
            <Label htmlFor="maritimeRank" className="text-xs font-medium text-gray-700 mb-1 block">
              Maritime Rank *
            </Label>
            <Select 
              value={formData.maritimeRank} 
              onValueChange={(value) => setFormData({ ...formData, maritimeRank: value })}
              disabled={loading || otpLoading}
              required
            >
              <SelectTrigger className="w-full h-8 text-sm">
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
            <Label htmlFor="company" className="text-xs font-medium text-gray-700 mb-1 block">
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
              <SelectTrigger className="w-full h-8 text-sm">
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
                className="w-full h-8 text-sm mt-1"
                disabled={loading || otpLoading}
                required
              />
            )}
          </div>

          {/* Password */}
          <div>
            <Label htmlFor="password" className="text-xs font-medium text-gray-700 mb-1 block">
              Password *
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Create a secure password"
                className="w-full h-8 text-sm pr-8"
                disabled={loading || otpLoading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* OTP Code (if email verification is required) */}
          {otpSent && (
            <div>
              <Label htmlFor="otpCode" className="text-xs font-medium text-gray-700 mb-1 block">
                Email Verification Code *
              </Label>
              <Input
                id="otpCode"
                type="text"
                value={formData.otpCode}
                onChange={(e) => setFormData({ ...formData, otpCode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                placeholder="Enter 6-digit code"
                className="w-full h-8 text-sm text-center font-mono tracking-widest"
                disabled={loading}
                maxLength={6}
                required
              />
              {otpCountdown > 0 && (
                <div className="flex items-center justify-center mt-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3 mr-1" />
                  Code expires in {Math.floor(otpCountdown / 60)}:{(otpCountdown % 60).toString().padStart(2, '0')}
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            className={`w-full h-9 text-sm font-semibold transition-all duration-300 ${
              otpSent
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700'
            } text-white`}
            disabled={loading || otpLoading || (otpSent && otpCountdown <= 0)}
          >
            {loading || otpLoading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                {otpLoading ? 'Sending verification...' : 'Completing registration...'}
              </>
            ) : otpSent ? (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Verify & Complete Registration
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send Verification Code
              </>
            )}
          </Button>

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

        {/* Login Link */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <button
              onClick={() => setLocation('/login')}
              className="text-orange-600 hover:text-orange-800 font-semibold"
            >
              Sign In
            </button>
          </p>
        </div>

        
      </div>
    </div>
  );
}