import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { authApi, setStoredToken, setStoredUser, type User } from "@/lib/auth";
import { Eye, EyeOff, Mail, Shield, Clock, User as UserIcon, Briefcase, Anchor, ArrowLeft, Phone, Wrench, MapPin, Globe, DollarSign, Loader2 } from "lucide-react";
import qaaqLogoPath from "@assets/ICON_1754950288816.png";

interface RegisterWorkshopProps {
  onSuccess: (user: User) => void;
}

export default function RegisterWorkshop({ onSuccess }: RegisterWorkshopProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [showOtherCompany, setShowOtherCompany] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    countryCode: "+91", // Default to India
    whatsapp: "",
    email: "",
    maritimeRank: "Marine workshop", // Pre-populated for workshop registration
    company: "",
    otherCompany: "",
    password: "",
    otpCode: "",
    // Workshop-specific fields (all shown by default)
    competencyExpertise: "",
    homePort: "",
    visaStatus: "",
    companiesWorkedFor: "",
    officialWebsite: "",
    perDayAttendanceRate: "",
    remoteTroubleshootingRate: "",
  });

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

  // Fetch SEMM systems from API
  const { data: semmData, isLoading: semmLoading, error: semmError } = useQuery({
    queryKey: ['/api/dev/semm-cards'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  // Extract systems from SEMM data for workshop competency
  const semmSystems = (semmData as any)?.data || [];
  const competencyOptions = semmSystems.map((system: any) => ({
    value: system.title,
    label: system.title,
    code: system.code
  }));

  // Visa status options
  const visaStatusOptions = [
    "Valid Multiple Entry Visa",
    "Single Entry Visa",
    "Transit Visa Only",
    "Visa on Arrival Eligible", 
    "No Visa Required (Local)",
    "Visa Processing Required"
  ];

  // Maritime companies for dropdown
  const maritimeCompanies = [
    "Maersk Line", "MSC", "CMA CGM", "COSCO Shipping", "Hapag-Lloyd",
    "Evergreen Marine", "ONE (Ocean Network Express)", "Yang Ming",
    "HMM", "PIL (Pacific International Lines)", "OOCL", "MOL",
    "K Line", "NYK Line", "Zim", "Wan Hai Lines", "Matson",
    "Crowley Maritime", "Stena Line", "DFDS", "Grimaldi Lines",
    "Brittany Ferries", "P&O Ferries", "Anglo-Eastern", "Bernhard Schulte",
    "Wilhelmsen", "V.Ships", "Synergy Marine", "OSM Maritime",
    "Columbia Shipmanagement", "Thome Group", "Fleet Management Limited",
    "Wallem Group", "Zodiac Maritime", "Other"
  ];

  // OTP countdown timer
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  // Handle form data changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === "company" && value === "Other") {
      setShowOtherCompany(true);
    } else if (field === "company" && value !== "Other") {
      setShowOtherCompany(false);
      setFormData(prev => ({ ...prev, otherCompany: "" }));
    }
  };

  // Send verification email
  const sendVerificationEmail = async () => {
    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.company || !formData.password) {
      toast({
        title: "Missing Basic Information",
        description: "Please fill in all basic required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate workshop-specific fields
    if (!formData.competencyExpertise || !formData.homePort || !formData.visaStatus || 
        !formData.companiesWorkedFor || !formData.perDayAttendanceRate || !formData.remoteTroubleshootingRate) {
      toast({
        title: "Missing Workshop Information",
        description: "Please fill in all workshop-specific fields",
        variant: "destructive",
      });
      return;
    }

    // Validate password strength
    if (formData.password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setOtpLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          whatsapp: formData.countryCode + formData.whatsapp,
          maritimeRank: formData.maritimeRank,
          company: showOtherCompany ? formData.otherCompany : formData.company,
          password: formData.password,
          // Workshop-specific fields
          competencyExpertise: formData.competencyExpertise,
          homePort: formData.homePort,
          visaStatus: formData.visaStatus,
          companiesWorkedFor: formData.companiesWorkedFor,
          officialWebsite: formData.officialWebsite,
          perDayAttendanceRate: formData.perDayAttendanceRate,
          remoteTroubleshootingRate: formData.remoteTroubleshootingRate,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setOtpSent(true);
        setOtpCountdown(60);
        toast({
          title: "Workshop Registration Initiated!",
          description: "Please check your email for the verification link. Your workshop profile will be created automatically after verification.",
        });
      } else {
        toast({
          title: "Registration Failed",
          description: data.message || "Failed to register workshop. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Network Error",
        description: "Please check your internet connection and try again.",
        variant: "destructive",
      });
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <button
              onClick={() => setLocation("/")}
              className="absolute left-8 top-8 p-2 text-gray-600 hover:text-orange-600 transition-colors"
              data-testid="back-button"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <img 
              src={qaaqLogoPath} 
              alt="QAAQ Logo" 
              className="h-12 w-12 mr-3"
            />
            <div>
              <h1 className="text-3xl font-bold text-orange-600">⚓ QaaqConnect</h1>
              <p className="text-sm text-gray-600">Maritime Workshop Registration</p>
            </div>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center mb-2">
              <Wrench className="h-6 w-6 text-orange-600 mr-2" />
              <h2 className="text-xl font-semibold text-orange-800">Marine Repair Workshop Onboarding</h2>
            </div>
            <p className="text-orange-700 text-sm">
              Join the global maritime workshop network. Connect with ships, provide repair services, and grow your business.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic Information Section */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <UserIcon className="h-5 w-5 mr-2 text-orange-600" />
              1. Contact Person Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  placeholder="Enter first name"
                  data-testid="input-firstName"
                />
              </div>
              
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  placeholder="Enter last name"
                  data-testid="input-lastName"
                />
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Mail className="h-5 w-5 mr-2 text-orange-600" />
              2. Contact Details
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Primary Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="workshop@company.com"
                  data-testid="input-email"
                />
              </div>

              <div>
                <Label htmlFor="whatsapp">5. WhatsApp / Phone (with country code)</Label>
                <div className="flex space-x-2">
                  <Select value={formData.countryCode} onValueChange={(value) => handleInputChange("countryCode", value)}>
                    <SelectTrigger className="w-32" data-testid="select-countryCode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countryCodes.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.flag} {country.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="whatsapp"
                    type="tel"
                    value={formData.whatsapp}
                    onChange={(e) => handleInputChange("whatsapp", e.target.value)}
                    placeholder="Enter phone number"
                    className="flex-1"
                    data-testid="input-whatsapp"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Workshop Details Section */}
          <div className="border border-orange-200 rounded-lg p-6 bg-orange-50">
            <h3 className="text-lg font-semibold text-orange-800 mb-4 flex items-center">
              <Wrench className="h-5 w-5 mr-2 text-orange-600" />
              3-9. Workshop Expertise & Details
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="competencyExpertise">3. Workshop Competency / Expertise (Please select only 1) *</Label>
                <Select value={formData.competencyExpertise} onValueChange={(value) => handleInputChange("competencyExpertise", value)} disabled={semmLoading}>
                  <SelectTrigger data-testid="select-competencyExpertise">
                    <SelectValue placeholder={semmLoading ? "Loading maritime systems..." : "Select your primary expertise system"} />
                  </SelectTrigger>
                  <SelectContent>
                    {semmLoading ? (
                      <SelectItem value="" disabled>
                        <div className="flex items-center">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading SEMM systems...
                        </div>
                      </SelectItem>
                    ) : semmError ? (
                      <SelectItem value="" disabled>
                        Error loading systems. Please refresh.
                      </SelectItem>
                    ) : competencyOptions.length === 0 ? (
                      <SelectItem value="" disabled>
                        No systems available
                      </SelectItem>
                    ) : (
                      competencyOptions.map((option: any) => (
                        <SelectItem key={option.code} value={option.value}>
                          <div className="flex items-center">
                            <span className="font-mono text-xs text-gray-500 mr-2">{option.code}.</span>
                            <span>{option.label}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {semmError && (
                  <p className="text-sm text-red-600 mt-1">
                    Failed to load maritime systems. Please refresh the page.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="homePort">6. Port where your branch is located? (Write only one city) *</Label>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-orange-600" />
                  <Input
                    id="homePort"
                    type="text"
                    value={formData.homePort}
                    onChange={(e) => handleInputChange("homePort", e.target.value)}
                    placeholder="e.g., Singapore, Rotterdam, Mumbai"
                    data-testid="input-homePort"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="visaStatus">7. Service Engineer Visa Status *</Label>
                <Select value={formData.visaStatus} onValueChange={(value) => handleInputChange("visaStatus", value)}>
                  <SelectTrigger data-testid="select-visaStatus">
                    <SelectValue placeholder="Select visa status" />
                  </SelectTrigger>
                  <SelectContent>
                    {visaStatusOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="companiesWorkedFor">8. Companies worked for (in last 1 year) *</Label>
                <Input
                  id="companiesWorkedFor"
                  type="text"
                  value={formData.companiesWorkedFor}
                  onChange={(e) => handleInputChange("companiesWorkedFor", e.target.value)}
                  placeholder="e.g., Maersk, MSC, COSCO Shipping"
                  data-testid="input-companiesWorkedFor"
                />
              </div>

              <div>
                <Label htmlFor="officialWebsite">9. Your workshop's official website</Label>
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4 text-orange-600" />
                  <Input
                    id="officialWebsite"
                    type="url"
                    value={formData.officialWebsite}
                    onChange={(e) => handleInputChange("officialWebsite", e.target.value)}
                    placeholder="https://www.yourworkshop.com (optional)"
                    data-testid="input-officialWebsite"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="border border-green-200 rounded-lg p-6 bg-green-50">
            <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-green-600" />
              Service Rates (USD)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="perDayAttendanceRate">Per Day Attendance Rate (USD) *</Label>
                <div className="flex items-center space-x-2">
                  <span className="text-green-600 font-bold">$</span>
                  <Input
                    id="perDayAttendanceRate"
                    type="number"
                    value={formData.perDayAttendanceRate}
                    onChange={(e) => handleInputChange("perDayAttendanceRate", e.target.value)}
                    placeholder="e.g., 150"
                    data-testid="input-perDayAttendanceRate"
                  />
                  <span className="text-sm text-gray-600">USD</span>
                </div>
              </div>

              <div>
                <Label htmlFor="remoteTroubleshootingRate">Remote Troubleshooting Rate/Hour (USD) *</Label>
                <div className="flex items-center space-x-2">
                  <span className="text-green-600 font-bold">$</span>
                  <Input
                    id="remoteTroubleshootingRate"
                    type="number"
                    value={formData.remoteTroubleshootingRate}
                    onChange={(e) => handleInputChange("remoteTroubleshootingRate", e.target.value)}
                    placeholder="e.g., 75"
                    data-testid="input-remoteTroubleshootingRate"
                  />
                  <span className="text-sm text-gray-600">USD/hr</span>
                </div>
              </div>
            </div>
          </div>

          {/* Company Information Section */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Briefcase className="h-5 w-5 mr-2 text-orange-600" />
              Company Information
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="company">Company/Workshop Name *</Label>
                <Select value={formData.company} onValueChange={(value) => handleInputChange("company", value)}>
                  <SelectTrigger data-testid="select-company">
                    <SelectValue placeholder="Select or enter your company" />
                  </SelectTrigger>
                  <SelectContent>
                    {maritimeCompanies.map((company) => (
                      <SelectItem key={company} value={company}>
                        {company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showOtherCompany && (
                <div>
                  <Label htmlFor="otherCompany">Specify Company Name *</Label>
                  <Input
                    id="otherCompany"
                    type="text"
                    value={formData.otherCompany}
                    onChange={(e) => handleInputChange("otherCompany", e.target.value)}
                    placeholder="Enter your company name"
                    data-testid="input-otherCompany"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Security Section */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-orange-600" />
              Account Security
            </h3>
            
            <div>
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  placeholder="Create a secure password (min 6 characters)"
                  className="pr-10"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  data-testid="toggle-password"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Submit Section */}
          <div className="space-y-4">
            {!otpSent ? (
              <Button
                onClick={sendVerificationEmail}
                disabled={otpLoading}
                className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white py-3"
                data-testid="button-register"
              >
                {otpLoading ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Sending Verification Email...
                  </>
                ) : (
                  <>
                    <Wrench className="h-4 w-4 mr-2" />
                    Register Workshop
                  </>
                )}
              </Button>
            ) : (
              <div className="text-center p-6 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-center mb-3">
                  <Mail className="h-8 w-8 text-green-600 mr-2" />
                  <h3 className="text-lg font-semibold text-green-800">Verification Email Sent!</h3>
                </div>
                <p className="text-green-700 mb-4">
                  We've sent a verification email to <strong>{formData.email}</strong>
                </p>
                <p className="text-green-600 text-sm mb-4">
                  Click the link in your email to complete registration. Your workshop profile will be created automatically.
                </p>
                
                {otpCountdown > 0 ? (
                  <p className="text-gray-600 text-sm">
                    Resend email in {otpCountdown} seconds
                  </p>
                ) : (
                  <Button
                    onClick={() => {
                      setOtpSent(false);
                      sendVerificationEmail();
                    }}
                    variant="outline"
                    className="border-green-600 text-green-600 hover:bg-green-50"
                    disabled={otpLoading}
                    data-testid="button-resend"
                  >
                    Resend Verification Email
                  </Button>
                )}
              </div>
            )}

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <button
                  onClick={() => setLocation("/login")}
                  className="text-orange-600 hover:text-orange-700 font-semibold"
                  data-testid="link-login"
                >
                  Sign In
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}