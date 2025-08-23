import { useAuth } from '@/hooks/useAuth';

export function useMaritimeRankConfirmation() {
  const { user } = useAuth();

  // Maritime rank confirmation system disabled in Patalbase
  const handleRankConfirmed = () => {};

  return {
    needsConfirmation: false,
    isLoading: false,
    user,
    handleRankConfirmed
  };
}