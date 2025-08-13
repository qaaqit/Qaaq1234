import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronUp, ChevronDown, LogIn, UserPlus, Crown } from 'lucide-react';

interface LoginRoadblockProps {
  feature: string;
  description: string;
}

export default function LoginRoadblock({ feature, description }: LoginRoadblockProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [, setLocation] = useLocation();

  const handleGoogleLogin = () => {
    // Redirect to Google OAuth
    window.location.href = '/api/auth/google';
  };

  if (isMinimized) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMinimized(false)}
          className="bg-white shadow-lg border-orange-200 hover:bg-orange-50"
          data-testid="expand-login-roadblock"
        >
          <ChevronDown className="h-4 w-4 mr-2" />
          Login Required
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-40">
      <Card className="w-full max-w-md mx-auto shadow-2xl border-orange-200">
        <CardHeader className="text-center relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(true)}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            data-testid="minimize-login-roadblock"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Crown className="h-8 w-8 text-white" />
          </div>
          
          <CardTitle className="text-2xl font-bold text-gray-800">
            Login Required
          </CardTitle>
          <CardDescription className="text-gray-600">
            Access {feature} - {description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-center text-sm text-gray-600 mb-4">
            Join the maritime community to access professional resources
          </div>

          {/* Google Sign-In Button */}
          <Button
            onClick={handleGoogleLogin}
            className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-3"
            data-testid="button-google-signin"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </Button>

          {/* Regular Login */}
          <Button
            onClick={() => setLocation('/login')}
            variant="outline"
            className="w-full border-orange-200 text-orange-600 hover:bg-orange-50"
            data-testid="button-regular-login"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Sign in with QAAQ Account
          </Button>

          {/* Register */}
          <Button
            onClick={() => setLocation('/register')}
            variant="outline"
            className="w-full border-gray-200 text-gray-600 hover:bg-gray-50"
            data-testid="button-register"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Create New Account
          </Button>

          <div className="text-center text-xs text-gray-500 mt-4">
            Maritime professionals • Authentic community • Free to join
          </div>
        </CardContent>
      </Card>
    </div>
  );
}