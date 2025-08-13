import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Anchor, Eye, EyeOff, Mail, Lock, ChevronUp, ChevronDown, Crown, Search } from "lucide-react";
import qaaqLogoPath from "@assets/ICON_1754950288816.png";
import qaaqLogo from '@assets/qaaq-logo.png';
import { User } from "@/lib/auth";

interface LoginPageProps {
  onSuccess: (user: User) => void;
}

export default function LoginPage({ onSuccess }: LoginPageProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [formData, setFormData] = useState({
    qaaqId: "",
    password: ""
  });
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [glossaryEntries, setGlossaryEntries] = useState<any[]>([]);
  const [glossaryLoading, setGlossaryLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [displayCount, setDisplayCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

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



  const fetchGlossaryEntries = async () => {
    setGlossaryLoading(true);
    try {
      const response = await fetch('/api/glossary/what-is');
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
      console.error('Error fetching glossary:', error);
    } finally {
      setGlossaryLoading(false);
    }
  };

  const extractTerm = (question: string): string => {
    const match = question.toLowerCase().match(/what\s+is\s+(?:a\s+|an\s+|the\s+)?(.+?)(?:\?|$)/);
    return match ? match[1].trim() : question;
  };

  const filteredEntries = glossaryEntries.filter(entry => {
    if (!searchTerm) return true;
    return entry.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
           entry.answer.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const loadMoreEntries = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayCount(prev => Math.min(prev + 20, filteredEntries.length));
      setIsLoadingMore(false);
    }, 500);
  };

  // Reset display count when search term changes
  useEffect(() => {
    setDisplayCount(20);
  }, [searchTerm]);

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
          userId: formData.qaaqId.trim(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token and user data (using consistent auth_token key)
        localStorage.setItem('auth_token', data.token);
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
          userId: formData.qaaqId.trim()
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

  // Load glossary entries on component mount
  useEffect(() => {
    if (glossaryEntries.length === 0) {
      fetchGlossaryEntries();
    }
  }, []);

  const GlossaryContent = ({ isMinimized }: { isMinimized: boolean }) => (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50">
      {/* Header */}
      <header className="bg-white text-black shadow-md relative overflow-hidden border-b-2 border-orange-400">
        <div className="absolute inset-0 bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 opacity-50"></div>
        
        <div className="relative z-10 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden">
                <img src={qaaqLogo} alt="QAAQ Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                  Maritime Dictionary
                </h1>
                <p className="text-sm text-gray-600">Browse definitions • {isMinimized ? 'Login for full features' : 'Click minimize to browse freely'}</p>
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          </div>
        </div>

        {/* Glossary Entries */}
        {glossaryLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`skeleton-${i}`} className="flex items-center justify-between py-2 border-b border-gray-100">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-48" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEntries.slice(0, displayCount).map((entry, index) => {
              const previewText = entry.answer.split(' ').slice(0, 10).join(' ') + (entry.answer.split(' ').length > 10 ? '...' : '');
              return (
                <Dialog key={`entry-${entry.id}-${index}`}>
                  <DialogTrigger asChild disabled={!isMinimized}>
                    <div className={`py-3 px-4 bg-white rounded-lg shadow-sm border border-gray-200 transition-colors ${isMinimized ? 'hover:border-orange-300 cursor-pointer' : 'cursor-default'}`}>
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
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby="definition-content">
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
                          {entry.answer.split('\n').map((line: string, idx: number) => (
                            <p key={`line-${entry.id}-${idx}`} className="mb-2 last:mb-0">
                              {line.startsWith('•') ? (
                                <span className="flex items-start gap-2">
                                  <span className="text-orange-600 font-bold">•</span>
                                  <span>{line.substring(1).trim()}</span>
                                </span>
                              ) : line}
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
                <h3 className="text-base font-semibold text-gray-900 mb-2">No Terms Found</h3>
                <p className="text-sm text-gray-600 mb-4">Try a different search term</p>
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
                  {isLoadingMore ? 'Loading...' : `Load More (${filteredEntries.length - displayCount} remaining)`}
                </Button>
              </div>
            )}

            {displayCount >= filteredEntries.length && filteredEntries.length > 20 && (
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
      <div className={isMinimized ? '' : 'pointer-events-none'}>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-gray-600">Sign in to QaaqConnect</p>
          </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* QAAQ ID */}
          <div>
            <Label htmlFor="qaaqId" className="text-sm font-medium text-gray-700 mb-2 block">UserID *</Label>
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

          {/* Forgot Password and Signup Links */}
          <div className="flex justify-between items-center mt-4 text-sm">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={forgotPasswordLoading}
              className="text-orange-600 hover:text-orange-700 underline transition-colors disabled:opacity-50"
            >
              {forgotPasswordLoading ? "Sending..." : "Forgot password?"}
            </button>
            <button
              onClick={() => navigate('/register')}
              className="text-orange-600 hover:text-orange-800 font-semibold"
            >
              New User Signup
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Connecting maritime professionals worldwide
          </p>
        </div>
          </div>
        </div>
      )}
    </>
  );
}