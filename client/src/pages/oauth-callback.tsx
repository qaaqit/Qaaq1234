import { useEffect } from "react";
import { useLocation } from "wouter";
import { setStoredToken, setStoredUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function OAuthCallback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check URL parameters for token
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const error = urlParams.get('error');

        if (error) {
          let errorMessage = "Authentication failed";
          switch (error) {
            case 'google_auth_failed':
              errorMessage = "Google authentication failed";
              break;
            case 'no_auth_code':
              errorMessage = "No authorization code received";
              break;
            case 'auth_failed':
              errorMessage = "Authentication process failed";
              break;
          }
          
          toast({
            title: "Login Failed",
            description: errorMessage,
            variant: "destructive",
          });
          setLocation('/');
          return;
        }

        if (token) {
          // Store the token
          setStoredToken(token);
          
          // Fetch user data with the token
          const response = await fetch('/api/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const user = await response.json();
            setStoredUser(user);
            
            toast({
              title: "Welcome!",
              description: "Successfully logged in with Google",
            });
            
            // Redirect to QBOT chat (user preference: home page after login)
            setLocation('/qbot');
          } else {
            throw new Error('Failed to fetch user data');
          }
        } else {
          throw new Error('No token received');
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        toast({
          title: "Login Failed",
          description: "Something went wrong during authentication",
          variant: "destructive",
        });
        setLocation('/');
      }
    };

    handleCallback();
  }, [setLocation, toast]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Completing login...</h2>
        <p className="text-gray-600">Please wait while we set up your account</p>
      </div>
    </div>
  );
}