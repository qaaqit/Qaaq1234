import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { queryClient } from '@/lib/queryClient';

export function useMaritimeRankConfirmation() {
  const { user, isLoading } = useAuth();

  // DISABLED: Maritime rank confirmation system completely removed
  const handleRankConfirmed = (newRank: string) => {
    console.log('🚫 Maritime rank confirmation disabled:', newRank);
  };

  return {
    needsConfirmation: false, // Always false - feature disabled
    isLoading: false,
    user,
    handleRankConfirmed
  };
}