import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { queryClient } from '@/lib/queryClient';

export function useMaritimeRankConfirmation() {
  const { user, isLoading } = useAuth();
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      // Check if user needs to confirm their maritime rank
      const needsRankConfirmation = !user.maritimeRank || 
                                   user.maritimeRank === '' || 
                                   user.maritimeRank === null ||
                                   user.maritimeRank === undefined;
      
      setNeedsConfirmation(needsRankConfirmation);
      setHasChecked(true);
      
      console.log('🔍 Maritime rank check:', {
        userId: user.id,
        currentRank: user.maritimeRank,
        needsConfirmation: needsRankConfirmation
      });
    } else if (!user && !isLoading) {
      // Reset state when user logs out
      setNeedsConfirmation(false);
      setHasChecked(false);
    }
  }, [user, isLoading]);

  const handleRankConfirmed = (newRank: string) => {
    setNeedsConfirmation(false);
    console.log('✅ Maritime rank confirmed:', newRank);
    
    // Update user data in localStorage if using QAAQ auth
    const token = localStorage.getItem('auth_token');
    if (token) {
      const storedUser = localStorage.getItem('qaaq_user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          userData.maritimeRank = newRank;
          userData.rank = newRank;
          localStorage.setItem('qaaq_user', JSON.stringify(userData));
        } catch (error) {
          console.error('Error updating stored user data:', error);
        }
      }
    }
    
    // For session-based auth (Replit Auth), invalidate the user cache to refetch updated data
    queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
  };

  return {
    needsConfirmation: needsConfirmation && user && hasChecked,
    isLoading: isLoading || !hasChecked,
    user,
    handleRankConfirmed
  };
}