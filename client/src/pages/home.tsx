import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authApi, setStoredToken, setStoredUser, type User } from "@/lib/auth";
import UsersMapDual from "@/components/users-map-dual";

interface HomeProps {
  onSuccess?: (user: User) => void;
}

export default function Home({ onSuccess }: HomeProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [formData, setFormData] = useState({
    userId: "",
    password: "",
  });

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
        setLocation("/discover");
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
      setLocation("/discover");
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
    <div 
      className="min-h-screen relative overflow-hidden cursor-pointer bg-gray-100"
      onClick={() => setIsMinimized(false)}
    >
      {/* Full Screen Map Background with Error Boundary */}
      <div className="absolute inset-0 z-0 bg-gray-100">
        <div className="w-full h-full">
          <UsersMapDual showNearbyCard={false} />
        </div>
      </div>
      {/* Overlay for better contrast */}
      <div className="absolute inset-0 z-10 bg-black/20 pointer-events-none"></div>
      {/* Translucent Login Box - Mobile Responsive */}
      <div className={`fixed sm:absolute z-20 top-2 sm:top-4 right-2 sm:right-4 left-2 sm:left-4 flex justify-center transition-all duration-500`}>
        <div 
          className="backdrop-blur-sm sm:backdrop-blur-lg border border-white/40 shadow-2xl rounded-xl relative transition-all duration-500 p-4 sm:p-6 w-full max-w-[calc(100vw-1rem)] sm:max-w-md bg-white/80 sm:bg-white/60"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Chevron toggle button in top-right corner */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
            className="absolute right-3 hover:bg-white/90 rounded-full flex items-center justify-center hover:text-cyan-600 transition-all duration-200 shadow-sm z-30 border border-ocean-teal/20 top-3 w-8 h-8 bg-[#afb3b5] text-[#1e53a6]"
          >
            <i className={`fas ${isMinimized ? 'fa-chevron-down' : 'fa-chevron-up'} font-bold ${
              isMinimized ? 'text-xs' : 'text-sm'
            }`}></i>
          </button>
          
          {/* Header */}
          <div className={`transition-all duration-500 ${
            isMinimized ? 'flex items-center space-x-3 mb-0' : 'text-center mb-4 sm:mb-6'
          }`}>
            <div className={`bg-ocean-teal/20 rounded-full flex items-center justify-center transition-all duration-500 ${
              isMinimized 
                ? 'w-8 h-8 flex-shrink-0' 
                : 'w-10 sm:w-12 h-10 sm:h-12 mx-auto mb-2 sm:mb-3'
            }`}>
              <i className={`fas fa-anchor text-ocean-teal transition-all duration-500 ${
                isMinimized ? 'text-sm' : 'text-lg sm:text-xl'
              }`}></i>
            </div>
            {!isMinimized && (
              <>
                <h1 className="text-xl sm:text-2xl font-bold text-navy-blue">QaaqConnect</h1>
                <p className="text-gray-600 text-xs sm:text-sm">Maritime Community Login</p>
              </>
            )}
            {isMinimized && (
              <div className="flex-grow">
                <h1 className="text-sm font-bold text-navy-blue">QaaqConnect</h1>
                <p className="text-xs text-gray-500">Click to login</p>
              </div>
            )}
          </div>

          {/* Login Form */}
          {!isMinimized && (
            <>
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="userId" className="text-xs sm:text-sm font-medium text-gray-700">USER NAME (may be ur country code +91 & whatsapp number )</Label>
                  <Input
                    id="userId"
                    type="text"
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    placeholder="Enter your name, email, or phone number"
                    className="bg-white/90 border-gray-200 focus:border-ocean-teal focus:bg-white text-sm sm:text-base"
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="password" className="text-xs sm:text-sm font-medium text-gray-700">Password (This may be ur city example mumbai)</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter your password"
                    className="bg-white/90 border-gray-200 focus:border-ocean-teal focus:bg-white text-sm sm:text-base"
                    disabled={loading}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-ocean-teal hover:bg-cyan-600 text-[#afb3b5] font-semibold py-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Logging in...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-sign-in-alt mr-2"></i>
                      Login to QaaqConnect
                    </>
                  )}
                </Button>
              </form>
              
              
            </>
          )}
        </div>
      </div>
    </div>
  );
}