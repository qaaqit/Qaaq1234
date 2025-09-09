import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { authApi, setStoredToken, setStoredUser, type User } from "@/lib/auth";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { Eye, EyeOff, Mail, Shield, Clock, User as UserIcon, Briefcase, Anchor, ArrowLeft, Phone } from "lucide-react";
import qaaqLogoPath from "@assets/ICON_1754950288816.png";

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
    countryCode: "+91", // Default to India
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

  // Common country codes for maritime professionals
  const countryCodes = [
    { code: "+91", country: "India", flag: "🇮🇳" },
    { code: "+90", country: "Turkey", flag: "🇹🇷" },
    { code: "+63", country: "Philippines", flag: "🇵🇭" },
    { code: "+380", country: "Ukraine", flag: "🇺🇦" },
    { code: "+7", country: "Russia", flag: "🇷🇺" },
    { code: "+86", country: "China", flag: "🇨🇳" },
    { code: "+30", country: "Greece", flag: "🇬🇷" },
    { code: "+49", country: "Germany", flag: "🇩🇪" },
    { code: "+47", country: "Norway", flag: "🇳🇴" },
    { code: "+45", country: "Denmark", flag: "🇩🇰" },
    { code: "+31", country: "Netherlands", flag: "🇳🇱" },
    { code: "+44", country: "UK", flag: "🇬🇧" },
    { code: "+1", country: "USA/Canada", flag: "🇺🇸" },
    { code: "+33", country: "France", flag: "🇫🇷" },
    { code: "+39", country: "Italy", flag: "🇮🇹" },
    { code: "+34", country: "Spain", flag: "🇪🇸" },
    { code: "+351", country: "Portugal", flag: "🇵🇹" },
    { code: "+81", country: "Japan", flag: "🇯🇵" },
    { code: "+82", country: "South Korea", flag: "🇰🇷" },
    { code: "+65", country: "Singapore", flag: "🇸🇬" },
    { code: "+60", country: "Malaysia", flag: "🇲🇾" },
    { code: "+66", country: "Thailand", flag: "🇹🇭" },
    { code: "+84", country: "Vietnam", flag: "🇻🇳" },
    { code: "+62", country: "Indonesia", flag: "🇮🇩" },
    { code: "+971", country: "UAE", flag: "🇦🇪" },
    { code: "+974", country: "Qatar", flag: "🇶🇦" },
    { code: "+965", country: "Kuwait", flag: "🇰🇼" },
    { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
    { code: "+20", country: "Egypt", flag: "🇪🇬" },
    { code: "+27", country: "South Africa", flag: "🇿🇦" },
    { code: "+55", country: "Brazil", flag: "🇧🇷" },
    { code: "+52", country: "Mexico", flag: "🇲🇽" },
    { code: "+54", country: "Argentina", flag: "🇦🇷" },
    { code: "+56", country: "Chile", flag: "🇨🇱" },
    { code: "+57", country: "Colombia", flag: "🇨🇴" },
    { code: "+51", country: "Peru", flag: "🇵🇪" },
    { code: "+61", country: "Australia", flag: "🇦🇺" },
    { code: "+64", country: "New Zealand", flag: "🇳🇿" },
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

  // Send verification email
  const sendVerificationEmail = async () => {
    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.maritimeRank || !formData.company || !formData.password) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!formData.email.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setOtpLoading(true);
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          whatsapp: formData.countryCode + formData.whatsapp,
          maritimeRank: formData.maritimeRank,
          company: formData.company === 'Other' ? formData.otherCompany : formData.company,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setOtpSent(true);
        toast({
          title: "Verification Email Sent!",
          description: `Your User ID: ${data.userId || 'N/A'}. Check your inbox at ${formData.email} and click the verification link. If you don't see it, please check your junk/spam folder.`,
        });
      } else {
        console.error('Registration failed:', response.status, data);
        toast({
          title: "Registration Failed",
          description: data.message || "Unable to send verification email. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Error",
        description: "Unable to send verification email. Please check your internet connection.",
        variant: "destructive",
      });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('Form submitted with data:', formData);

    // Validation
    const finalCompany = formData.company === 'Other' ? formData.otherCompany : formData.company;
    if (!formData.firstName || !formData.lastName || !formData.email || 
        !formData.maritimeRank || !finalCompany || !formData.password) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Send verification email if not sent yet
    if (!otpSent) {
      await sendVerificationEmail();
      return;
    }

    // Email verification is handled via email link - nothing to do here
    toast({
      title: "Check Your Email",
      description: "Please click the verification link in your email to complete registration",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center p-2">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-4 border border-gray-200 overflow-hidden">
        {/* Header with Telegraph */}
        <div className="text-center mb-2">
          {/* Title with Back Arrow */}
          <div className="relative mb-1">
            <button
              onClick={() => setLocation('/login')}
              className="absolute left-0 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center justify-center gap-2">
              <img src={qaaqLogoPath} alt="QAAQ" className="w-10 h-10" />
              <h1 className="font-bold text-gray-900 text-[24px]">QaaqConnect</h1>
            </div>
          </div>
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
        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
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

          {/* WhatsApp Number with Country Code */}
          <div>
            <Label htmlFor="whatsapp" className="text-xs font-medium text-gray-700 mb-1 block">
              <Phone className="inline w-3 h-3 mr-1" />
              WhatsApp Number
            </Label>
            <div className="flex gap-2">
              {/* Country Code Dropdown */}
              <div className="w-32">
                <Select
                  value={formData.countryCode}
                  onValueChange={(value) => setFormData({ ...formData, countryCode: value })}
                  disabled={loading || otpLoading}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    {countryCodes.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        <span className="text-xs">
                          {country.flag} {country.code} {country.country}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Phone Number Input */}
              <div className="flex-1">
                <Input
                  id="whatsapp"
                  type="tel"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value.replace(/[^0-9]/g, '') })}
                  placeholder="example:9820012345"
                  className="h-8 text-sm"
                  disabled={loading || otpLoading}
                  maxLength={15}
                />
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Complete number: {formData.countryCode}{formData.whatsapp}
            </div>
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
                <SelectItem value="TSI">Technical Superintendent</SelectItem>
                <SelectItem value="Marine workshop">Marine workshop</SelectItem>
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

          {/* Email Verification Message */}
          {otpSent && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center">
                <Mail className="w-4 h-4 text-blue-600 mr-2" />
                <div>
                  <p className="text-xs font-medium text-blue-800">Verification Email Sent!</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Check your inbox and click the verification link to complete registration.
                  </p>
                </div>
              </div>
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
            disabled={loading || otpLoading || otpSent}
          >
            {loading || otpLoading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                {otpLoading ? 'Sending verification email...' : 'Processing...'}
              </>
            ) : otpSent ? (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Verification Email Sent
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send Verification Email
              </>
            )}
          </Button>

          {/* Resend Email */}
          {otpSent && (
            <Button
              type="button"
              onClick={() => {
                setOtpSent(false);
                sendVerificationEmail();
              }}
              variant="outline"
              className="w-full h-9 text-sm"
              disabled={otpLoading}
            >
              Resend Verification Email
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