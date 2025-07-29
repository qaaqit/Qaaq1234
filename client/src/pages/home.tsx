import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authApi, setStoredToken, setStoredUser, type User } from "@/lib/auth";
import UsersMap from "@/components/users-map";

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
      className="min-h-screen relative overflow-hidden cursor-pointer"
      onClick={() => setIsMinimized(false)}
    >
      {/* Full Screen Map Background */}
      <div className="absolute inset-0 z-0">
        <UsersMap showUsers={false} searchQuery="" />
      </div>
      {/* Overlay for better contrast */}
      <div className="absolute inset-0 z-10 bg-black/20"></div>
      {/* Translucent Login Box - Always positioned at top */}
      <div className={`absolute z-20 top-4 right-4 left-4 flex justify-center transition-all duration-500`}>
        <div 
          className="backdrop-blur-lg border border-white/30 shadow-2xl rounded-xl relative transition-all duration-500 p-6 w-full max-w-md bg-[#f5e9e900]"
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
            isMinimized ? 'flex items-center space-x-3 mb-0' : 'text-center mb-6'
          }`}>
            <div className={`bg-ocean-teal/20 rounded-full flex items-center justify-center transition-all duration-500 ${
              isMinimized 
                ? 'w-8 h-8 flex-shrink-0' 
                : 'w-12 h-12 mx-auto mb-3'
            }`}>
              <i className={`fas fa-anchor text-ocean-teal transition-all duration-500 ${
                isMinimized ? 'text-sm' : 'text-xl'
              }`}></i>
            </div>
            {!isMinimized && (
              <>
                <h1 className="text-2xl font-bold text-navy-blue">QaaqConnect</h1>
                <p className="text-gray-600 text-sm">Maritime Community Login</p>
                <div className="mt-2 text-center">
                  <p className="text-xs text-gray-500">
                    Parent app: 
                    <a 
                      href="https://www.qaaqit.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-ocean-teal hover:text-cyan-600 ml-1 underline font-medium"
                    >
                      www.qaaqit.com
                    </a>
                    <br/>
                    <span className="text-gray-400">for Maritime Questions</span>
                  </p>
                </div>
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
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="userId" className="text-sm font-medium text-gray-700">
                    USER NAME (This may be ur country code +91 & whatsapp number )
                  </Label>
                  <Input
                    id="userId"
                    type="text"
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    placeholder="Enter your name, email, or phone number"
                    className="bg-white/90 border-gray-200 focus:border-ocean-teal focus:bg-white"
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter your password"
                    className="bg-white/90 border-gray-200 focus:border-ocean-teal focus:bg-white"
                    disabled={loading}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-ocean-teal hover:bg-cyan-600 text-white font-semibold py-2"
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
              
              {/* Demo Password Info */}
              <div className="mt-6 pt-4 border-t border-gray-200/50">
                <p className="text-center text-sm text-gray-600">
                  <span className="inline-block bg-duck-yellow/20 text-duck-yellow px-2 py-1 rounded text-xs font-medium">
                    Demo Password: 1234koihai
                  </span>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}