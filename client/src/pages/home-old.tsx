import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authApi, setStoredToken, setStoredUser, type User } from "@/lib/auth";

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
    <div className="min-h-screen w-full bg-white flex items-center justify-center">
      {/* Full-screen login form container */}
      <div className="w-full h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12">
        <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl bg-white border border-gray-200 rounded-2xl shadow-xl p-6 sm:p-8 md:p-10 lg:p-12 xl:p-16">
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 flex items-center justify-center mx-auto mb-6 sm:mb-8">
              <img 
                src="/attached_assets/ICON_1754684848613.png" 
                alt="QAAQ Logo" 
                className="w-full h-full object-contain"
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
        </div>
      </div>
    </div>
  );
}
