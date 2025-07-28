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
    <div className="min-h-screen relative">
      {/* Background content - similar to QAAQ.app */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-slate-100">
        <div className="container mx-auto px-4 py-8 opacity-30">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold text-navy mb-4">QaaqConnect</h1>
            <p className="text-xl text-gray-700 mb-8">Maritime Community Platform</p>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Connect sailors with locals for authentic port city experiences. 
              Discover hidden gems, join maritime meetups, and explore like a local.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-navy/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-map-marked-alt text-2xl text-navy"></i>
              </div>
              <h3 className="text-xl font-semibold mb-3">Port Discovery</h3>
              <p className="text-gray-600">Find locals and experiences in any port city worldwide.</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-ocean-teal/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-users text-2xl text-ocean-teal"></i>
              </div>
              <h3 className="text-xl font-semibold mb-3">Maritime Community</h3>
              <p className="text-gray-600">Connect with fellow seafarers and professionals.</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-anchor text-2xl text-yellow-600"></i>
              </div>
              <h3 className="text-xl font-semibold mb-3">Local Experiences</h3>
              <p className="text-gray-600">Authentic port city experiences with local guides.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Translucent login box - QAAQ.app style */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-navy to-ocean-teal rounded-2xl flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-anchor text-2xl text-white"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">Welcome to QaaqConnect</h2>
            <p className="text-sm text-gray-600">Marine Engineering Knowledge Hub</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="userId" className="text-sm font-medium text-gray-700">
                USER NAME (This may be ur country code +91 & whatsapp number )
              </Label>
              <Input
                id="userId"
                type="text"  
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                placeholder="e.g. Patel, captain.li@qaaq.com, +91 9800898008"
                className="mt-2"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter your password"
                className="mt-2"
                required
              />
            </div>

            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              <p><strong>New users:</strong> Default password is <code className="bg-blue-100 px-1 rounded">1234koihai</code></p>
              <p className="text-xs mt-1">You'll need to change this after your 1st login.</p>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-navy hover:bg-navy/90 text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner animate-spin mr-2"></i>
                  Logging in...
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt mr-2"></i>
                  Login
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
