import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronUp,
  ChevronDown,
  Crown,
  Search,
  Eye,
  EyeOff,
  Camera,
  Upload,
  CreditCard,
  Loader2,
  Crop,
  Check,
  X,
} from "lucide-react";
import qaaqLogoPath from "@assets/ICON_1754950288816.png";
import qaaqLogo from "@assets/qaaq-logo.png";
import { User } from "@/lib/auth";

import { useAuth } from "@/contexts/AuthContext";

// JWT Login Form Component
function JWTLoginForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    userId: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.userId || !formData.password) {
      toast({
        title: "Missing Information",
        description: "Please enter both User ID and Password",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const success = await login({
        userId: formData.userId,
        password: formData.password,
      });

      if (success) {
        // Navigate to QBOT after successful login
        navigate("/qbot");

        toast({
          title: "Welcome back!",
          description: "Login successful",
        });
      } else {
        toast({
          title: "Login failed",
          description: "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Connection error",
        description: "Please check your connection and try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* User ID Field */}
      <div className="space-y-2">
        <Label htmlFor="userId" className="text-sm font-medium text-gray-700">
          USER NAME (This may be ur Email or country code & whatsapp number )
        </Label>
        <Input
          id="userId"
          type="text"
          value={formData.userId}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, userId: e.target.value }))
          }
          placeholder="Enter ur Email"
          className="h-12 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
          data-testid="input-user-id"
        />
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-sm font-medium text-gray-700">
            PASSWORD
          </Label>
          <Button
            type="button"
            variant="link"
            className="p-0 h-auto text-xs text-orange-600 hover:text-orange-700"
            onClick={() => navigate("/forgot-password")}
            data-testid="link-forgot-password"
          >
            (forgot password?)
          </Button>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, password: e.target.value }))
            }
            placeholder="Enter your password"
            className="h-12 border-gray-300 focus:border-orange-500 focus:ring-orange-500 pr-12"
            data-testid="input-password"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            onClick={() => setShowPassword(!showPassword)}
            data-testid="toggle-password-visibility"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Login Button */}
      <Button
        type="submit"
        disabled={loading}
        className="w-full h-12 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold"
        data-testid="button-jwt-login"
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            Signing in...
          </div>
        ) : (
          "Sign In"
        )}
      </Button>

      {/* New User Signup Links */}
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">New to QaaqConnect?</p>
        <div className="flex flex-col space-y-2">
          <Button
            type="button"
            variant="link"
            className="p-0 h-auto text-orange-600 hover:text-orange-700 font-semibold"
            onClick={() => navigate("/register")}
            data-testid="link-user-signup"
          >
            Create an User account
          </Button>
          <Button
            type="button"
            variant="link"
            className="p-0 h-auto text-orange-600 hover:text-orange-700 font-semibold"
            onClick={() => navigate("/registerworkshop")}
            data-testid="link-workshop-signup"
          >
            Create a Workshop Account
          </Button>
        </div>
      </div>
    </form>
  );
}

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isMinimized, setIsMinimized] = useState(false);
  const [glossaryEntries, setGlossaryEntries] = useState<any[]>([]);
  const [glossaryLoading, setGlossaryLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [displayCount, setDisplayCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Business card scanning states
  const [scanningLoading, setScanningLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Handle Google auth errors from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");

    if (error === "auth_failed") {
      toast({
        title: "Authentication Failed",
        description:
          "Google sign-in was not successful. Please try again or use your regular login.",
        variant: "destructive",
      });

      // Clean up the URL by removing the error parameter
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [toast]);

  const fetchGlossaryEntries = async () => {
    setGlossaryLoading(true);
    try {
      const response = await fetch("/api/glossary/what-is");
      const data = await response.json();

      if (data.success) {
        const sortedEntries = data.entries.sort((a: any, b: any) => {
          const termA = extractTerm(a.question);
          const termB = extractTerm(b.question);
          return termA.localeCompare(termB);
        });
        setGlossaryEntries(sortedEntries);
      }
    } catch (error) {
      console.error("Error fetching glossary:", error);
    } finally {
      setGlossaryLoading(false);
    }
  };

  const extractTerm = (question: string): string => {
    const match = question
      .toLowerCase()
      .match(/what\s+is\s+(?:a\s+|an\s+|the\s+)?(.+?)(?:\?|$)/);
    return match ? match[1].trim() : question;
  };

  const filteredEntries = glossaryEntries.filter((entry) => {
    if (!searchTerm) return true;
    return (
      entry.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.answer.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const loadMoreEntries = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayCount((prev) => Math.min(prev + 20, filteredEntries.length));
      setIsLoadingMore(false);
    }, 500);
  };

  // Reset display count when search term changes
  useEffect(() => {
    setDisplayCount(20);
  }, [searchTerm]);

  // Load glossary entries on component mount
  useEffect(() => {
    if (glossaryEntries.length === 0) {
      fetchGlossaryEntries();
    }
  }, []);

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
            // Navigate to workshop registration with pre-filled data
            const data = result.data;
            const queryParams = new URLSearchParams();
            
            // Add extracted data as query parameters
            if (data.firstName) queryParams.set('firstName', data.firstName);
            if (data.lastName) queryParams.set('lastName', data.lastName);
            if (data.designation) queryParams.set('designation', data.designation);
            if (data.company) queryParams.set('company', data.company);
            if (data.email) queryParams.set('email', data.email);
            if (data.phone) queryParams.set('whatsapp', data.phone);
            if (data.website) queryParams.set('officialWebsite', data.website);

            navigate(`/registerworkshop?${queryParams.toString()}`);

            toast({
              title: "✅ Business card scanned successfully!",
              description: `Extracted ${Object.keys(result.data).filter(k => result.data[k]).length} fields. Redirecting to workshop registration...`,
            });
          } else {
            throw new Error(result.error || 'Failed to process business card');
          }
        } catch (error) {
          console.error('Business card scan error:', error);
          toast({
            title: "❌ Scan failed",
            description: "Could not extract data from business card. You can still register manually.",
            variant: "destructive",
          });
          // Navigate to registration page anyway
          navigate('/registerworkshop');
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

      // Check if this is from camera (capture input) or upload
      const inputId = event.target.id;
      if (inputId === 'businessCardCamera') {
        // Show crop interface for camera captures
        const reader = new FileReader();
        reader.onload = (e) => {
          setCapturedImage(e.target?.result as string);
          setShowCropModal(true);
        };
        reader.readAsDataURL(file);
      } else {
        // Direct processing for uploaded files
        handleBusinessCardScan(file);
      }
    }
  };

  // Crop functionality
  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.target as HTMLImageElement;
    const rect = img.getBoundingClientRect();
    
    // Initialize crop area to center 80% of the image
    const width = rect.width * 0.8;
    const height = rect.height * 0.6;
    const x = (rect.width - width) / 2;
    const y = (rect.height - height) / 2;
    
    setCropArea({ x, y, width, height });
    setImageLoaded(true);
  };

  const handleCropConfirm = async () => {
    if (!capturedImage) return;
    
    try {
      setScanningLoading(true);
      
      // Create canvas to crop the image
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        // Calculate actual image dimensions vs displayed dimensions
        const displayImg = document.getElementById('cropImage') as HTMLImageElement;
        const scaleX = img.naturalWidth / displayImg.offsetWidth;
        const scaleY = img.naturalHeight / displayImg.offsetHeight;
        
        // Set canvas size to cropped area
        canvas.width = cropArea.width * scaleX;
        canvas.height = cropArea.height * scaleY;
        
        // Draw cropped portion
        ctx.drawImage(
          img,
          cropArea.x * scaleX,
          cropArea.y * scaleY,
          cropArea.width * scaleX,
          cropArea.height * scaleY,
          0,
          0,
          canvas.width,
          canvas.height
        );
        
        // Convert to blob and process
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], 'cropped-business-card.jpg', { type: 'image/jpeg' });
            setShowCropModal(false);
            setCapturedImage(null);
            await handleBusinessCardScan(file);
          }
        }, 'image/jpeg', 0.9);
      };
      
      img.src = capturedImage;
    } catch (error) {
      console.error('Crop error:', error);
      toast({
        title: "❌ Crop failed",
        description: "Could not crop image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setCapturedImage(null);
    setImageLoaded(false);
  };

  const GlossaryContent = ({ isMinimized }: { isMinimized: boolean }) => (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50">
      {/* Header */}
      <header className="bg-white text-black shadow-md relative overflow-hidden border-b-2 border-orange-400">
        <div className="absolute inset-0 bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 opacity-50"></div>

        <div className="relative z-10 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden">
                <img
                  src={qaaqLogo}
                  alt="QAAQ Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                  Maritime Dictionary
                </h1>
                <p className="text-sm text-gray-600">
                  Browse definitions •{" "}
                  {isMinimized
                    ? "Login for full features"
                    : "Click minimize to browse freely"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Input
              placeholder="Search maritime terms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-orange-300 focus:border-orange-500 pl-10"
              disabled={!isMinimized}
            />
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={18}
            />
          </div>
        </div>

        {/* Glossary Entries */}
        {glossaryLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="flex items-center justify-between py-2 border-b border-gray-100"
              >
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-48" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEntries.slice(0, displayCount).map((entry, index) => {
              const previewText =
                entry.answer.split(" ").slice(0, 10).join(" ") +
                (entry.answer.split(" ").length > 10 ? "..." : "");
              return (
                <Dialog key={`entry-${entry.id}-${index}`}>
                  <DialogTrigger asChild disabled={!isMinimized}>
                    <div
                      className={`py-3 px-4 bg-white rounded-lg shadow-sm border border-gray-200 transition-colors ${isMinimized ? "hover:border-orange-300 cursor-pointer" : "cursor-default"}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-orange-700">
                          {extractTerm(entry.question).toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          📖 Definition
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {previewText}
                      </p>
                    </div>
                  </DialogTrigger>
                  {isMinimized && (
                    <DialogContent
                      className="max-w-2xl max-h-[80vh] overflow-y-auto"
                      aria-describedby="definition-content"
                    >
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-gray-900 mb-2">
                          {extractTerm(entry.question).toUpperCase()}
                        </DialogTitle>
                      </DialogHeader>
                      <div id="definition-content" className="space-y-4">
                        <div className="text-sm text-gray-600 bg-orange-50 p-3 rounded-lg">
                          <strong>Question:</strong> {entry.question}
                        </div>
                        <div className="prose prose-sm max-w-none text-gray-700">
                          {entry.answer
                            .split("\n")
                            .map((line: string, idx: number) => (
                              <p
                                key={`line-${entry.id}-${idx}`}
                                className="mb-2 last:mb-0"
                              >
                                {line.startsWith("•") ? (
                                  <span className="flex items-start gap-2">
                                    <span className="text-orange-600 font-bold">
                                      •
                                    </span>
                                    <span>{line.substring(1).trim()}</span>
                                  </span>
                                ) : (
                                  line
                                )}
                              </p>
                            ))}
                        </div>
                      </div>
                    </DialogContent>
                  )}
                </Dialog>
              );
            })}

            {filteredEntries.length === 0 && !glossaryLoading && (
              <div className="text-center py-12">
                <h3 className="text-base font-semibold text-gray-900 mb-2">
                  No Terms Found
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Try a different search term
                </p>
              </div>
            )}

            {/* Load More Button */}
            {displayCount < filteredEntries.length && isMinimized && (
              <div className="text-center py-6">
                <Button
                  onClick={loadMoreEntries}
                  disabled={isLoadingMore}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2"
                >
                  {isLoadingMore
                    ? "Loading..."
                    : `Load More (${filteredEntries.length - displayCount} remaining)`}
                </Button>
              </div>
            )}

            {displayCount >= filteredEntries.length &&
              filteredEntries.length > 20 && (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">
                    All {filteredEntries.length} terms displayed
                  </p>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Background Glossary Content - always visible */}
      <div className={isMinimized ? "" : "pointer-events-none"}>
        <GlossaryContent isMinimized={isMinimized} />
      </div>
      {/* Minimized state - floating login button */}
      {isMinimized && (
        <div className="fixed top-4 right-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMinimized(false)}
            className="bg-white shadow-lg border-orange-200 hover:bg-orange-50 flex items-center gap-3 pr-2"
            data-testid="expand-login-roadblock"
          >
            <Crown className="h-4 w-4 text-orange-600" />
            <span>Login Required</span>
            <div className="w-8 h-8 bg-orange-100 hover:bg-orange-200 rounded-full flex items-center justify-center transition-colors">
              <ChevronDown className="h-6 w-6 text-orange-600" />
            </div>
          </Button>
        </div>
      )}
      {/* Full login form overlay - only show when not minimized */}
      {!isMinimized && (
        <div className="fixed inset-0 bg-gradient-to-br from-orange-50/80 to-red-100/80 backdrop-blur-[2px] flex items-center justify-center p-4 z-40">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-200 relative">
            {/* Minimize Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 p-1"
              data-testid="minimize-login-roadblock"
            >
              <div className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
                <ChevronUp className="h-6 w-6" />
              </div>
            </Button>

            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <img src={qaaqLogoPath} alt="QAAQ" className="w-14 h-14" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome onboard<br />
                MV Qaaq
              </h1>
              <p className="text-gray-600">This is our Gangway.</p>
            </div>

            {/* Business Card Quick Registration */}
            <div className="mb-6">
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center">
                  <CreditCard className="h-4 w-4 mr-2 text-blue-600" />
                  Quick Workshop Registration
                </h3>
                <p className="text-xs text-blue-700 mb-4">
                  📱 Scan your business card to instantly create a workshop account with AI
                </p>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <input
                      type="file"
                      id="businessCardLogin"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={scanningLoading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('businessCardLogin')?.click()}
                      disabled={scanningLoading}
                      className="w-full h-10 border-blue-300 text-blue-700 hover:bg-blue-100 text-sm"
                      data-testid="button-upload-business-card-login"
                    >
                      {scanningLoading ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-3 w-3 mr-2" />
                          Upload Business Card
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <input
                    type="file"
                    id="businessCardCamera"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={scanningLoading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('businessCardCamera')?.click()}
                    disabled={scanningLoading}
                    className="h-10 border-blue-300 text-blue-700 hover:bg-blue-100 text-sm"
                    data-testid="button-camera-business-card-login"
                  >
                    <Camera className="h-3 w-3 mr-1" />
                    Camera
                  </Button>
                </div>
              </div>
            </div>

            {/* Primary Authentication Options */}
            <div className="space-y-4 mb-6">
              {/* Replit Auth Button - 1st Option */}
              <Button
                type="button"
                onClick={() => {
                  const returnUrl = localStorage.getItem("login_return_url");
                  const loginUrl = returnUrl
                    ? `/api/login?returnUrl=${encodeURIComponent(returnUrl)}`
                    : "/api/login";
                  window.location.href = loginUrl;
                }}
                className="w-full h-12 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 font-semibold"
                data-testid="button-replit-auth"
              >
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 mr-3 bg-gray-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">R</span>
                  </div>
                  Easy Login
                </div>
              </Button>

              {/* Google Auth Button - 2nd Option */}
              <Button
                type="button"
                onClick={() => {
                  const returnUrl = localStorage.getItem("login_return_url");
                  const googleAuthUrl = returnUrl
                    ? `/api/auth/google?returnUrl=${encodeURIComponent(returnUrl)}`
                    : "/api/auth/google";
                  window.location.href = googleAuthUrl;
                }}
                className="w-full h-12 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-semibold shadow-sm"
                data-testid="button-google-auth"
              >
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </div>
              </Button>
            </div>

            {/* Email Login Form - 3rd Option, Minimized */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 text-gray-600 border-gray-300 font-medium hover:bg-gray-50"
                  data-testid="button-email-toggle"
                >
                  SignIn with Email
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-gray-900">
                    Email Login
                  </DialogTitle>
                </DialogHeader>
                <JWTLoginForm />
              </DialogContent>
            </Dialog>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500">
                Connecting maritime professionals worldwide
              </p>
              <p className="text-xs text-gray-400 mt-2">
                <a
                  href="https://qaaq.app/privacy-policy"
                  className="hover:text-gray-600 transition-colors"
                >
                  Learn more
                </a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Crop Modal */}
      <Dialog open={showCropModal} onOpenChange={setShowCropModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center">
              <Crop className="h-5 w-5 mr-2 text-blue-600" />
              Crop Your Business Card
            </DialogTitle>
            <p className="text-sm text-gray-600">
              Drag to select the business card area for better OCR accuracy
            </p>
          </DialogHeader>
          
          {capturedImage && (
            <div className="relative bg-gray-100 rounded-lg overflow-hidden">
              <div className="relative inline-block max-w-full">
                <img
                  id="cropImage"
                  src={capturedImage}
                  alt="Captured business card"
                  onLoad={handleImageLoad}
                  className="max-w-full max-h-[400px] object-contain"
                  draggable={false}
                />
                
                {imageLoaded && (
                  <div
                    className="absolute border-2 border-blue-500 bg-blue-500/20"
                    style={{
                      left: cropArea.x,
                      top: cropArea.y,
                      width: cropArea.width,
                      height: cropArea.height,
                    }}
                  >
                    {/* Center area - for moving */}
                    <div
                      className="absolute inset-2 cursor-move"
                      onMouseDown={(e) => {
                        setIsDragging(true);
                        const startX = e.clientX - cropArea.x;
                        const startY = e.clientY - cropArea.y;
                        
                        const handleMouseMove = (e: MouseEvent) => {
                          const img = document.getElementById('cropImage') as HTMLImageElement;
                          const rect = img.getBoundingClientRect();
                          const newX = Math.max(0, Math.min(e.clientX - startX, rect.width - cropArea.width));
                          const newY = Math.max(0, Math.min(e.clientY - startY, rect.height - cropArea.height));
                          setCropArea(prev => ({ ...prev, x: newX, y: newY }));
                        };
                        
                        const handleMouseUp = () => {
                          setIsDragging(false);
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    >
                      <div className="absolute inset-0 border-2 border-dashed border-white/50"></div>
                    </div>

                    {/* Label */}
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-2 py-1 rounded text-xs">
                      Business Card Area
                    </div>

                    {/* Corner Handles */}
                    {/* Top-left */}
                    <div
                      className="absolute -top-1 -left-1 w-4 h-4 bg-blue-600 border-2 border-white cursor-nw-resize hover:bg-blue-700"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const handleMouseMove = (e: MouseEvent) => {
                          const img = document.getElementById('cropImage') as HTMLImageElement;
                          const rect = img.getBoundingClientRect();
                          const newX = Math.max(0, Math.min(e.clientX - rect.left, cropArea.x + cropArea.width - 50));
                          const newY = Math.max(0, Math.min(e.clientY - rect.top, cropArea.y + cropArea.height - 30));
                          const newWidth = cropArea.x + cropArea.width - newX;
                          const newHeight = cropArea.y + cropArea.height - newY;
                          if (newWidth > 50 && newHeight > 30) {
                            setCropArea({ x: newX, y: newY, width: newWidth, height: newHeight });
                          }
                        };
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    />

                    {/* Top-right */}
                    <div
                      className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 border-2 border-white cursor-ne-resize hover:bg-blue-700"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const handleMouseMove = (e: MouseEvent) => {
                          const img = document.getElementById('cropImage') as HTMLImageElement;
                          const rect = img.getBoundingClientRect();
                          const newY = Math.max(0, Math.min(e.clientY - rect.top, cropArea.y + cropArea.height - 30));
                          const newWidth = Math.max(50, Math.min(e.clientX - rect.left - cropArea.x, rect.width - cropArea.x));
                          const newHeight = cropArea.y + cropArea.height - newY;
                          if (newHeight > 30) {
                            setCropArea(prev => ({ ...prev, y: newY, width: newWidth, height: newHeight }));
                          }
                        };
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    />

                    {/* Bottom-left */}
                    <div
                      className="absolute -bottom-1 -left-1 w-4 h-4 bg-blue-600 border-2 border-white cursor-sw-resize hover:bg-blue-700"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const handleMouseMove = (e: MouseEvent) => {
                          const img = document.getElementById('cropImage') as HTMLImageElement;
                          const rect = img.getBoundingClientRect();
                          const newX = Math.max(0, Math.min(e.clientX - rect.left, cropArea.x + cropArea.width - 50));
                          const newWidth = cropArea.x + cropArea.width - newX;
                          const newHeight = Math.max(30, Math.min(e.clientY - rect.top - cropArea.y, rect.height - cropArea.y));
                          if (newWidth > 50) {
                            setCropArea(prev => ({ ...prev, x: newX, width: newWidth, height: newHeight }));
                          }
                        };
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    />

                    {/* Bottom-right */}
                    <div
                      className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-600 border-2 border-white cursor-se-resize hover:bg-blue-700"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const handleMouseMove = (e: MouseEvent) => {
                          const img = document.getElementById('cropImage') as HTMLImageElement;
                          const rect = img.getBoundingClientRect();
                          const newWidth = Math.max(50, Math.min(e.clientX - rect.left - cropArea.x, rect.width - cropArea.x));
                          const newHeight = Math.max(30, Math.min(e.clientY - rect.top - cropArea.y, rect.height - cropArea.y));
                          setCropArea(prev => ({ ...prev, width: newWidth, height: newHeight }));
                        };
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    />

                    {/* Edge Handles */}
                    {/* Top edge */}
                    <div
                      className="absolute h-3 bg-blue-600/70 cursor-n-resize hover:bg-blue-600 border border-white/50"
                      style={{
                        top: -6,
                        left: 16,
                        right: 16,
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const handleMouseMove = (e: MouseEvent) => {
                          const img = document.getElementById('cropImage') as HTMLImageElement;
                          const rect = img.getBoundingClientRect();
                          const relativeY = e.clientY - rect.top;
                          const newY = Math.max(0, Math.min(relativeY, cropArea.y + cropArea.height - 30));
                          const newHeight = cropArea.y + cropArea.height - newY;
                          if (newHeight > 30) {
                            setCropArea(prev => ({ ...prev, y: newY, height: newHeight }));
                          }
                        };
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    />

                    {/* Bottom edge */}
                    <div
                      className="absolute h-3 bg-blue-600/70 cursor-s-resize hover:bg-blue-600 border border-white/50"
                      style={{
                        bottom: -6,
                        left: 16,
                        right: 16,
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const handleMouseMove = (e: MouseEvent) => {
                          const img = document.getElementById('cropImage') as HTMLImageElement;
                          const rect = img.getBoundingClientRect();
                          const relativeY = e.clientY - rect.top;
                          const newHeight = Math.max(30, Math.min(relativeY - cropArea.y, rect.height - cropArea.y));
                          setCropArea(prev => ({ ...prev, height: newHeight }));
                        };
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    />

                    {/* Left edge */}
                    <div
                      className="absolute w-3 bg-blue-600/70 cursor-w-resize hover:bg-blue-600 border border-white/50"
                      style={{
                        left: -6,
                        top: 16,
                        bottom: 16,
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const handleMouseMove = (e: MouseEvent) => {
                          const img = document.getElementById('cropImage') as HTMLImageElement;
                          const rect = img.getBoundingClientRect();
                          const relativeX = e.clientX - rect.left;
                          const newX = Math.max(0, Math.min(relativeX, cropArea.x + cropArea.width - 50));
                          const newWidth = cropArea.x + cropArea.width - newX;
                          if (newWidth > 50) {
                            setCropArea(prev => ({ ...prev, x: newX, width: newWidth }));
                          }
                        };
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    />

                    {/* Right edge */}
                    <div
                      className="absolute w-3 bg-blue-600/70 cursor-e-resize hover:bg-blue-600 border border-white/50"
                      style={{
                        right: -6,
                        top: 16,
                        bottom: 16,
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const handleMouseMove = (e: MouseEvent) => {
                          const img = document.getElementById('cropImage') as HTMLImageElement;
                          const rect = img.getBoundingClientRect();
                          const relativeX = e.clientX - rect.left;
                          const newWidth = Math.max(50, Math.min(relativeX - cropArea.x, rect.width - cropArea.x));
                          setCropArea(prev => ({ ...prev, width: newWidth }));
                        };
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCropCancel}
              disabled={scanningLoading}
              data-testid="button-crop-cancel"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCropConfirm}
              disabled={scanningLoading || !imageLoaded}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-crop-confirm"
            >
              {scanningLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Scan Cropped Card
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
