import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  fullName: string;
  email: string;
  userType: string;
  isAdmin: boolean;
}

export default function OAuthCallback() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userParam = urlParams.get('user');
    const error = urlParams.get('error');

    if (error) {
      toast({
        title: "Authentication Failed",
        description: `Login error: ${error}`,
        variant: "destructive",
      });
      navigate('/');
      return;
    }

    if (token && userParam) {
      try {
        const user: User = JSON.parse(decodeURIComponent(userParam));
        
        // Store authentication data
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        toast({
          title: "Login Successful",
          description: `Welcome back, ${user.fullName}!`,
          variant: "default",
        });
        
        // Redirect to QBOT Chat (home page as per user preference)
        navigate('/qbot');
        
      } catch (parseError) {
        console.error('Error parsing user data:', parseError);
        toast({
          title: "Authentication Error",
          description: "Invalid user data received",
          variant: "destructive",
        });
        navigate('/');
      }
    } else {
      toast({
        title: "Authentication Error",
        description: "Missing authentication data",
        variant: "destructive",
      });
      navigate('/');
    }
    
    setProcessing(false);
  }, [navigate, toast]);

  if (processing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-anchor text-2xl text-white"></i>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Completing Login...
          </h2>
          <p className="text-gray-600">
            Please wait while we finish setting up your account
          </p>
          <div className="mt-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}