import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function OAuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userString = urlParams.get('user');
    const error = urlParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      setLocation('/login?error=' + error);
      return;
    }

    if (token && userString) {
      try {
        // Store the authentication token
        localStorage.setItem('auth_token', token);
        
        // Parse and store user data
        const user = JSON.parse(decodeURIComponent(userString));
        localStorage.setItem('qaaq_user', JSON.stringify(user));
        
        console.log('🔐 Google OAuth successful, redirecting...');
        
        // Check for return URL in localStorage (set during login redirect)
        const returnUrl = localStorage.getItem('login_return_url');
        if (returnUrl) {
          localStorage.removeItem('login_return_url');
          console.log('🔄 Redirecting back to:', returnUrl);
          setLocation(returnUrl);
        } else {
          // Default redirect to QBOT Chat as per user preference
          setLocation('/qbot');
        }
        
      } catch (error) {
        console.error('Error processing OAuth callback:', error);
        setLocation('/login?error=callback_processing_failed');
      }
    } else {
      console.error('Missing token or user data in OAuth callback');
      setLocation('/login?error=missing_callback_data');
    }
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Completing Google Sign-In</h2>
        <p className="text-gray-600">Please wait while we redirect you to QBOT Chat...</p>
      </div>
    </div>
  );
}