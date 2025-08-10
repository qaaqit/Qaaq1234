import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

interface PasswordCheckResult {
  requiresRenewal: boolean;
  message: string;
}

export function usePasswordCheck(userId: string | undefined) {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isRenewal, setIsRenewal] = useState(false);

  const { data: passwordStatus, isLoading } = useQuery<PasswordCheckResult>({
    queryKey: ['/api/users', userId, 'password-renewal-status'],
    enabled: !!userId,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (passwordStatus?.requiresRenewal && userId) {
      setIsRenewal(true); // Assume renewal since all users need password creation now
      setShowPasswordModal(true);
    }
  }, [passwordStatus, userId]);

  const closeModal = () => {
    setShowPasswordModal(false);
    // Optionally refetch to check status again
  };

  return {
    showPasswordModal,
    isRenewal,
    closeModal,
    isLoading,
    requiresRenewal: passwordStatus?.requiresRenewal || false,
  };
}