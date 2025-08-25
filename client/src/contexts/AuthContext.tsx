import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';

interface UnifiedUser {
  id: string;
  fullName: string;
  email: string;
  authMethod: 'jwt' | 'session' | 'oauth' | 'none';
  isAdmin: boolean;
  isPremium: boolean;
  whatsAppNumber?: string;
  userId?: string;
  rank?: string;
  city?: string;
  country?: string;
}

interface AuthContextType {
  user: UnifiedUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { userId: string; password: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UnifiedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  /**
   * Single auth check - no polling, called only when needed
   */
  const checkAuth = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // Check JWT token first (fastest)
      const jwtToken = localStorage.getItem('token');
      if (jwtToken) {
        try {
          const response = await fetch('/api/auth/verify-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${jwtToken}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
              setUser({ ...data.user, authMethod: 'jwt' });
              return;
            }
          }
        } catch (error) {
          // JWT verification failed, continue to session check
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }

      // Check session-based authentication (Replit/Google)
      const sessionResponse = await fetch('/api/auth/user');
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        if (sessionData.user) {
          const authMethod = sessionData.user.googleId ? 'oauth' : 'session';
          setUser({ ...sessionData.user, authMethod });
          return;
        }
      }

      // No authentication found
      setUser(null);
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * JWT Login
   */
  const login = async (credentials: { userId: string; password: string }): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success && data.token && data.user) {
        // Store JWT token
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        setUser({ ...data.user, authMethod: 'jwt' });
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  /**
   * Unified logout - clears all auth methods
   */
  const logout = async (): Promise<void> => {
    try {
      // Clear JWT token
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Clear session (for Replit/Google auth)
      await fetch('/api/logout', { method: 'POST' });
      
      setUser(null);
      setLocation('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Force logout even if API fails
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setLocation('/login');
    }
  };

  // Single auth check on app load - no polling
  useEffect(() => {
    checkAuth();
  }, []);

  const isAuthenticated = user !== null;

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Higher-order component for protected routes
 */
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth();
    const [, setLocation] = useLocation();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        setLocation('/login');
      }
    }, [isAuthenticated, isLoading, setLocation]);

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null; // Will redirect to login
    }

    return <Component {...props} />;
  };
}