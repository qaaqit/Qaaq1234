import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authApi, setStoredToken, setStoredUser, type User } from "@/lib/auth";
import qaaqLogo from "@assets/qaaq_1754685074750.jpg";

interface HomeProps {
  onSuccess?: (user: User) => void;
}

export default function Home({ onSuccess }: HomeProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
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
      setLocation("/qbot");
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
    <div className="min-h-screen w-full bg-white flex items-center justify-center">
      {/* Full-screen login form container */}
      <div className="w-full h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12">
        <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl bg-white border border-gray-200 rounded-2xl shadow-xl p-6 sm:p-8 md:p-10 lg:p-12 xl:p-16">
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 flex items-center justify-center mx-auto mb-6 sm:mb-8">
              <img 
                src={qaaqLogo} 
                alt="QAAQ Logo" 
                className="w-full h-full object-contain rounded-2xl shadow-2xl shadow-orange-500/30 border-2 border-orange-200/50"
                style={{
                  animation: 'float 3s ease-in-out infinite'
                }}
              />
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-2 sm:mb-3">Welcome to Qaaq</h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600">Maritime Knowledge Hub</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 w-full">
            <div>
              <Label htmlFor="userId" className="text-base sm:text-lg md:text-xl font-medium text-gray-700 block mb-3 sm:mb-4">
                USER NAME (This may be ur country code +91 & whatsapp number )
              </Label>
              <Input
                id="userId"
                type="text"  
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                placeholder="e.g. +919820012345"
                className="h-12 sm:h-14 md:h-16 text-base sm:text-lg md:text-xl px-4 sm:px-6 rounded-xl placeholder:text-gray-400 placeholder:font-light placeholder:italic"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="password" className="text-base sm:text-lg md:text-xl font-medium text-gray-700 block mb-3 sm:mb-4">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="this could be your city name."
                className="h-12 sm:h-14 md:h-16 text-base sm:text-lg md:text-xl px-4 sm:px-6 rounded-xl placeholder:text-gray-400 placeholder:font-light placeholder:italic"
                required
              />
            </div>

            <div className="text-sm sm:text-base text-gray-600 bg-orange-50 p-4 sm:p-6 rounded-xl border border-orange-200">
              <p className="text-xs sm:text-sm text-gray-500">New accounts are created automatically when logging in</p>
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-12 sm:h-14 md:h-16 text-base sm:text-lg md:text-xl font-semibold bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner animate-spin mr-3"></i>
                  Logging in...
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt mr-3"></i>
                  Qaaqit
                </>
              )}
            </Button>
          </form>

          {/* Google OAuth Login Button */}
          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">or</span>
              </div>
            </div>
            
            <Button
              onClick={() => window.location.href = '/api/auth/google'}
              className="w-full mt-4 h-12 sm:h-14 md:h-16 text-base sm:text-lg md:text-xl font-semibold bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 hover:border-gray-400 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
              type="button"
            >
              <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
