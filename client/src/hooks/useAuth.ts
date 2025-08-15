import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      // Get JWT token from localStorage for QAAQ authentication
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/auth/user', {
        credentials: 'include', // Include session cookies for Replit Auth
        headers,
      });
      
      if (!response.ok) {
        throw new Error('Authentication failed');
      }
      
      return response.json();
    },
    retry: false,
    refetchInterval: false, // Disable automatic refetching 
    refetchOnWindowFocus: false, // Disable refetch on window focus
    refetchOnReconnect: false, // Disable refetch on network reconnect
    staleTime: 30 * 60 * 1000, // Consider data fresh for 30 minutes - longer to reduce requests
    gcTime: 60 * 60 * 1000, // Keep data in cache for 1 hour
    enabled: true, // Re-enable auth but with conservative settings
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}