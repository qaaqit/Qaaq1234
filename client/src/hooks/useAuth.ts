import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchInterval: false, // Disable automatic refetching 
    refetchOnWindowFocus: false, // Disable refetch on window focus
    refetchOnReconnect: false, // Disable refetch on network reconnect
    staleTime: 30 * 60 * 1000, // Consider data fresh for 30 minutes - longer to reduce requests
    gcTime: 60 * 60 * 1000, // Keep data in cache for 1 hour
    enabled: false, // DISABLED to prevent auth polling causing qh13 refresh
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}