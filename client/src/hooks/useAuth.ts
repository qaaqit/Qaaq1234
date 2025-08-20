import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  // COMPLETELY STUBBED OUT FOR TESTING STABILITY - no auth requests at all
  const user = null;
  const isLoading = false;

  return {
    user,
    isLoading,
    isAuthenticated: false,
  };
}