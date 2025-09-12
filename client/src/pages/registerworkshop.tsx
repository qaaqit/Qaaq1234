import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { authApi, setStoredToken, setStoredUser, type User } from "@/lib/auth";
import { Eye, EyeOff, Mail, Shield, Clock, User as UserIcon, Briefcase, Anchor, ArrowLeft, Phone, Wrench, MapPin, Globe, DollarSign, Loader2, CheckCircle2, Camera, Upload, CreditCard } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import qaaqLogoPath from "@assets/ICON_1754950288816.png";
import { MARITIME_EXPERTISE_CATEGORIES, CLASSIFICATION_SOCIETIES, type MaritimeExpertiseCategory, type ClassificationSociety } from "@shared/maritime-expertise";

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
  
  // Business card scanning states
  const [isScanning, setIsScanning] = useState(false);
  const [scanningLoading, setScanningLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    designation: "",
    countryCode: "+91", // Default to India
    whatsapp: "",
    email: "",
    maritimeRank: "Marine workshop", // Pre-populated for workshop registration
    company: "",
    otherCompany: "",
    password: "",
    otpCode: "",
    // Workshop-specific fields (all shown by default)
    competencyExpertise: [] as string[], // Legacy field - kept for backward compatibility
    maritimeExpertise: ["marine_engineer"] as string[], // Default to Marine Service Engineer
    classificationApprovals: {} as { [expertiseCategory: string]: string[] }, // Classification approvals per expertise
    homePort: "",
    zipCode: "",
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

  // Use static maritime expertise categories instead of fetching SEMM data
  const maritimeExpertiseOptions = MARITIME_EXPERTISE_CATEGORIES.map(category => ({
    id: category.id,
    name: category.name,
    description: category.description,
    icon: category.icon
  }));
  
  const classificationSocieties = CLASSIFICATION_SOCIETIES.map(society => ({
    id: society.id,
    name: society.name,
    fullName: society.fullName,
    flag: society.flag
  }));

  // Visa status options
  const visaStatusOptions = [
    "US B1/B2visa",
    "Schengen Multiple entry",
    "China Visa",
    "Will need to apply"
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
  // Auto-fill form with scanned business card data
  useEffect(() => {
    const scannedData = localStorage.getItem('scannedBusinessCardData');
    if (scannedData) {
      try {
        const data = JSON.parse(scannedData);
        
        // Check if data is recent (within last 5 minutes)
        if (Date.now() - data.scanTimestamp < 5 * 60 * 1000) {
          setFormData(prev => ({
            ...prev,
            firstName: data.firstName || prev.firstName,
            lastName: data.lastName || prev.lastName,
            designation: data.designation || prev.designation,
            company: data.company || prev.company,
            email: data.email || prev.email,
            whatsapp: data.whatsapp || prev.whatsapp,
            officialWebsite: data.officialWebsite || prev.officialWebsite,
          }));
          
          // Show success message
          toast({
            title: "✅ Business card data loaded!",
            description: "Your details have been automatically filled from your scanned business card.",
          });
          
          // Clear the data after use
          localStorage.removeItem('scannedBusinessCardData');
        }
      } catch (error) {
        console.error('Error loading scanned business card data:', error);
      }
    }
  }, [toast]);

  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  // Business card scanning functionality
  const handleBusinessCardScan = async (file: File) => {
    setScanningLoading(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        
        try {
          const response = await fetch('/api/business-card/scan', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageData: base64Data,
              fileName: file.name
            })
          });

          const result = await response.json();
          
          if (result.success && result.data) {
            // Auto-populate form fields with extracted data
            const data = result.data;
            setFormData(prev => ({
              ...prev,
              firstName: data.firstName || prev.firstName,
              lastName: data.lastName || prev.lastName,
              designation: data.designation || prev.designation,
              company: data.company || prev.company,
              email: data.email || prev.email,
              whatsapp: data.phone || prev.whatsapp,
              officialWebsite: data.website || prev.officialWebsite,
            }));

            toast({
              title: "✅ Business card scanned successfully!",
              description: `Extracted ${Object.keys(result.data).filter(k => result.data[k]).length} fields from your business card.`,
            });
          } else {
            throw new Error(result.error || 'Failed to process business card');
          }
        } catch (error) {
          console.error('Business card scan error:', error);
          toast({
            title: "❌ Scan failed",
            description: "Could not extract data from business card. Please fill the form manually.",
            variant: "destructive",
          });
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File read error:', error);
      toast({
        title: "❌ Upload failed",
        description: "Could not read the image file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setScanningLoading(false);
      setIsScanning(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "❌ Invalid file type",
          description: "Please upload a JPEG, PNG, or WebP image file.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "❌ File too large",
          description: "Please upload an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }

      handleBusinessCardScan(file);
    }
  };

  // Handle form data changes
  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === "company" && value === "Other") {
      setShowOtherCompany(true);
    } else if (field === "company" && value !== "Other") {
      setShowOtherCompany(false);
      setFormData(prev => ({ ...prev, otherCompany: "" }));
    }
  };

  // Handle maritime expertise selection (multi-select)
  const handleMaritimeExpertiseChange = (expertiseId: string, isChecked: boolean) => {
    const currentExpertise = formData.maritimeExpertise;
    
    if (isChecked) {
      // Add if not already present and under limit of 5
      if (!currentExpertise.includes(expertiseId) && currentExpertise.length < 5) {
        setFormData(prev => ({
          ...prev,
          maritimeExpertise: [...currentExpertise, expertiseId],
          // Also update legacy field for backward compatibility
          competencyExpertise: [...currentExpertise, expertiseId]
        }));
      }
    } else {
      // Remove if present
      const updatedExpertise = currentExpertise.filter(item => item !== expertiseId);
      setFormData(prev => ({
        ...prev,
        maritimeExpertise: updatedExpertise,
        competencyExpertise: updatedExpertise,
        // Remove classification approvals for this expertise
        classificationApprovals: {
          ...prev.classificationApprovals,
          [expertiseId]: []
        }
      }));
    }
  };
  
  // Handle classification society approval selection
  const handleClassificationApprovalChange = (expertiseId: string, societyId: string, isChecked: boolean) => {
    const currentApprovals = formData.classificationApprovals[expertiseId] || [];
    
    if (isChecked) {
      if (!currentApprovals.includes(societyId)) {
        setFormData(prev => ({
          ...prev,
          classificationApprovals: {
            ...prev.classificationApprovals,
            [expertiseId]: [...currentApprovals, societyId]
          }
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        classificationApprovals: {
          ...prev.classificationApprovals,
          [expertiseId]: currentApprovals.filter(id => id !== societyId)
        }
      }));
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
    if (!formData.homePort) {
      toast({
        title: "Missing Workshop Information", 
        description: "Please enter your port location",
        variant: "destructive",
      });
      return;
    }

    // Validate all required workshop-specific fields
    if (!formData.visaStatus || !formData.companiesWorkedFor || !formData.perDayAttendanceRate || !formData.remoteTroubleshootingRate) {
      toast({
        title: "Registration Failed",
        description: "Marine workshop users must provide all workshop-specific information: Maritime Expertise, Home Port, Visa Status, Companies Worked For, Daily Rate, and Remote Rate",
        variant: "destructive",
      });
      return;
    }

    // Validate maritime expertise
    if (!formData.maritimeExpertise || formData.maritimeExpertise.length === 0) {
      toast({
        title: "Missing Maritime Expertise",
        description: "Please select at least one maritime expertise category",
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
          // Workshop-specific fields - send both legacy and new formats
          competencyExpertise: formData.competencyExpertise.join(", "), // Legacy format
          maritimeExpertise: formData.maritimeExpertise, // New expertise categories
          classificationApprovals: formData.classificationApprovals, // Classification society approvals
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl p-4 sm:p-8 w-full">
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
              <h1 className="text-3xl font-bold text-orange-600">⚓ Qaaqit</h1>
              <p className="text-sm text-orange-600 font-medium">(Quickly Repair It)</p>
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

        <div className="space-y-4 sm:space-y-6">
          {/* Business Card Scanning Section */}
          <div className="border border-blue-200 rounded-lg p-4 sm:p-6 bg-blue-50">
            <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
              <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
              Quick Setup: Scan Business Card
            </h3>
            <div className="space-y-4">
              <p className="text-sm text-blue-700 mb-4">
                📱 Save time! Upload your business card and we'll automatically fill in your details using AI.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="file"
                    id="businessCard"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={scanningLoading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('businessCard')?.click()}
                    disabled={scanningLoading}
                    className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
                    data-testid="button-upload-business-card"
                  >
                    {scanningLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing card...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Business Card
                      </>
                    )}
                  </Button>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsScanning(!isScanning)}
                  disabled={scanningLoading}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  data-testid="button-scan-business-card"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Use Camera
                </Button>
              </div>
              
              {isScanning && (
                <div className="mt-4 p-4 bg-blue-100 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 mb-3">
                    📸 Take a clear photo of your business card or upload an existing image.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-blue-700">
                    <div>✅ Supported: JPEG, PNG, WebP</div>
                    <div>📏 Max size: 5MB</div>
                    <div>🔍 Best quality: Well-lit, clear text</div>
                    <div>🔒 Secure: Processed with AI, not stored</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Company Information Section - Moved to top */}
          <div className="border border-gray-200 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Briefcase className="h-5 w-5 mr-2 text-orange-600" />
              1. Company/Workshop Information
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="company">Company/Workshop Name *</Label>
                <Input
                  id="company"
                  type="text"
                  value={formData.company}
                  onChange={(e) => handleInputChange("company", e.target.value)}
                  placeholder="Enter your company/workshop name"
                  data-testid="input-company"
                />
              </div>
            </div>
          </div>

          {/* Contact Person Information Section */}
          <div className="border border-gray-200 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <UserIcon className="h-5 w-5 mr-2 text-orange-600" />
              2. Contact Person Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              
              <div>
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  type="text"
                  value={formData.designation}
                  onChange={(e) => handleInputChange("designation", e.target.value)}
                  placeholder="e.g., Workshop Manager, Technical Director"
                  data-testid="input-designation"
                />
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="border border-gray-200 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Mail className="h-5 w-5 mr-2 text-orange-600" />
              3. Contact Details
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Primary Email * (This will be your login id)</Label>
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

              <div>
                <Label htmlFor="whatsapp">WhatsApp / Phone (with country code)</Label>
                <div className="flex space-x-2">
                  <Select value={formData.countryCode} onValueChange={(value) => handleInputChange("countryCode", value)}>
                    <SelectTrigger className="w-16" data-testid="select-countryCode">
                      <SelectValue>
                        {countryCodes.find(country => country.code === formData.countryCode)?.flag}
                      </SelectValue>
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
          <div className="border border-orange-200 rounded-lg p-4 sm:p-6 bg-orange-50">
            <h3 className="text-lg font-semibold text-orange-800 mb-4 flex items-center">
              <Wrench className="h-5 w-5 mr-2 text-orange-600" />
              4-9. Workshop Expertise & Details
            </h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label htmlFor="maritimeExpertise">4. Maritime Workshop Expertise (Select up to 5) - Optional</Label>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-700">
                      {formData.maritimeExpertise.length}/5 selected
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
                  {maritimeExpertiseOptions.map((expertise) => {
                    const isSelected = formData.maritimeExpertise.includes(expertise.id);
                    const isDisabled = !isSelected && formData.maritimeExpertise.length >= 5;
                    const approvals = formData.classificationApprovals[expertise.id] || [];
                    
                    return (
                      <div key={expertise.id} className="space-y-3">
                        {/* Expertise Category Selection */}
                        <div 
                          className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer text-center ${
                            isSelected 
                              ? 'border-orange-400 bg-orange-100 shadow-lg transform scale-105' 
                              : isDisabled 
                                ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed' 
                                : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50 hover:shadow-md'
                          }`}
                          onClick={() => !isDisabled && handleMaritimeExpertiseChange(expertise.id, !isSelected)}
                          data-testid={`expertise-${expertise.id}`}
                        >
                          <div className="text-3xl mb-2">{expertise.icon}</div>
                          <div className={`text-sm font-semibold ${isSelected ? 'text-orange-800' : 'text-gray-700'}`}>
                            {expertise.name}
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-bold">✓</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Classification Society Approvals - Don't show for Assistant category */}
                        {isSelected && expertise.id !== "assistant" && (
                          <div className="ml-2 sm:ml-6 pl-2 sm:pl-4 border-l-2 border-orange-200 bg-orange-25 mt-2">
                            <p className="text-sm font-medium text-orange-700 mb-3">Classification Society Approvals (Optional):</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {classificationSocieties.map((society) => (
                                <div key={society.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`approval-${expertise.id}-${society.id}`}
                                    checked={approvals.includes(society.id)}
                                    onCheckedChange={(checked) => handleClassificationApprovalChange(expertise.id, society.id, checked as boolean)}
                                    data-testid={`checkbox-approval-${expertise.id}-${society.id}`}
                                    className="w-4 h-4 sm:w-3 sm:h-3 sm:scale-50"
                                  />
                                  <label 
                                    htmlFor={`approval-${expertise.id}-${society.id}`}
                                    className="text-sm sm:text-xs cursor-pointer"
                                  >
                                    {society.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {formData.maritimeExpertise.length > 0 && (
                  <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-700 font-medium mb-2">Selected Maritime Expertise:</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.maritimeExpertise.map((expertiseId) => {
                        const expertise = maritimeExpertiseOptions.find(e => e.id === expertiseId);
                        const approvals = formData.classificationApprovals[expertiseId] || [];
                        return (
                          <div key={expertiseId} className="inline-flex flex-col">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                              <span className="mr-1">{expertise?.icon}</span>
                              {expertise?.name}
                            </span>
                            {approvals.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {approvals.map(societyId => {
                                  const society = classificationSocieties.find(s => s.id === societyId);
                                  return (
                                    <span key={societyId} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 border border-blue-200">
                                      {society?.name}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-gray-600 mt-2">
                  Select 1-5 maritime job roles that represent your workshop's core expertise. Add classification society approvals to increase trust.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="homePort">6a. Port/City Name *</Label>
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
                  <Label htmlFor="zipCode">6b. ZIP/PIN Code</Label>
                  <Input
                    id="zipCode"
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => handleInputChange("zipCode", e.target.value)}
                    placeholder="e.g., 018989, 3011, 400001"
                    data-testid="input-zipCode"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="visaStatus">7. Service Engineer Visa Status</Label>
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
                <Label htmlFor="companiesWorkedFor">8. Companies worked for (in last 1 year)</Label>
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
                    placeholder="https://www.yourworkshop.com"
                    data-testid="input-officialWebsite"
                  />
                </div>
              </div>

              {/* Daily Rate and Remote Rate Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="perDayAttendanceRate">10. Daily Attendance Rate (USD) *</Label>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-orange-600" />
                    <Input
                      id="perDayAttendanceRate"
                      type="number"
                      value={formData.perDayAttendanceRate}
                      onChange={(e) => handleInputChange("perDayAttendanceRate", e.target.value)}
                      placeholder="e.g., 500"
                      data-testid="input-perDayAttendanceRate"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="remoteTroubleshootingRate">11. Remote Troubleshooting Rate (USD) *</Label>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-orange-600" />
                    <Input
                      id="remoteTroubleshootingRate"
                      type="number"
                      value={formData.remoteTroubleshootingRate}
                      onChange={(e) => handleInputChange("remoteTroubleshootingRate", e.target.value)}
                      placeholder="e.g., 100"
                      data-testid="input-remoteTroubleshootingRate"
                    />
                  </div>
                </div>
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