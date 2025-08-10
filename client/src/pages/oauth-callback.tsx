import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

export default function OAuthCallback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const userParam = urlParams.get('user');
        
        if (token && userParam) {
          // Store token in localStorage
          localStorage.setItem('authToken', token);
          
          // Parse user data
          const user = JSON.parse(decodeURIComponent(userParam));
          console.log('Google OAuth successful:', user);
          
          // Store user data temporarily
          localStorage.setItem('user', JSON.stringify(user));
          
          toast({
            title: "Login Successful",
            description: `Welcome back, ${user.fullName}!`,
            variant: "default",
          });
          
          // Redirect to QBOT Chat (home page per user preference)
          setTimeout(() => {
            setLocation('/qbot');
          }, 1000);
          
        } else {
          // Handle error cases
          const error = urlParams.get('error');
          let errorMessage = 'Authentication failed';
          
          if (error === 'google_auth_failed') {
            errorMessage = 'Google authentication was cancelled or failed';
          } else if (error === 'no_auth_code') {
            errorMessage = 'No authorization code received from Google';
          } else if (error === 'auth_failed') {
            errorMessage = 'Authentication process failed';
          }
          
          toast({
            title: "Login Failed",
            description: errorMessage,
            variant: "destructive",
          });
          
          // Redirect to login page
          setTimeout(() => {
            setLocation('/login');
          }, 2000);
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        toast({
          title: "Login Error",
          description: "Something went wrong during authentication",
          variant: "destructive",
        });
        
        setTimeout(() => {
          setLocation('/login');
        }, 2000);
      }
    };

    handleCallback();
  }, [setLocation, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
        <h2 className="text-xl font-semibold text-gray-700">Completing sign in...</h2>
        <p className="text-gray-500">Please wait while we redirect you.</p>
      </div>
    </div>
  );
}