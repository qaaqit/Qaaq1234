import { useState, useEffect } from 'react';

interface User {
  id: string;
  fullName: string;
  email: string;
  userType: 'sailor' | 'local';
  isAdmin?: boolean;
  isVerified: boolean;
  loginCount: number;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('qaaq_token');
    if (token) {
      // Decode token to get user info (simplified version)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userData = localStorage.getItem('qaaq_user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          // Check if user is admin based on phone number or email
          const isAdmin = parsedUser.fullName === '+919029010070' || 
                         parsedUser.email === 'mushy.piyush@gmail.com';
          setUser({ ...parsedUser, isAdmin });
        }
      } catch (error) {
        console.error('Failed to decode token:', error);
        localStorage.removeItem('qaaq_token');
        localStorage.removeItem('qaaq_user');
      }
    }
    setIsLoading(false);
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}