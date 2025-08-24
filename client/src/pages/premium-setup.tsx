import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Mail, ArrowRight, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PremiumSetupPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSetupPremium = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/set-user-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store email in localStorage for premium checks
        localStorage.setItem('user_email', email);
        
        if (data.isPremium) {
          toast({
            title: "Premium Access Activated!",
            description: `Welcome ${data.fullName}! Your premium features are now active.`,
          });
          setLocation("/qbot");
        } else {
          toast({
            title: "Free Account",
            description: "This email is registered but doesn't have premium access.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to verify email",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Premium setup error:", error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to the server",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-2 border-orange-200">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mb-4">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl text-gray-900">Premium Access Setup</CardTitle>
          <p className="text-gray-600 text-sm">
            Enter your email to activate premium features
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                onKeyPress={(e) => e.key === 'Enter' && handleSetupPremium()}
              />
            </div>
          </div>

          <Button
            onClick={handleSetupPremium}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Verifying...
              </>
            ) : (
              <>
                Activate Premium
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <div className="pt-4 border-t border-gray-200">
            <div className="text-center text-sm text-gray-600">
              <p className="mb-2">Premium Testing Accounts:</p>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <code>workship.ai@gmail.com</code>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <code>mushy.piyush@gmail.com</code>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}