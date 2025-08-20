import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function useMaritimeRankConfirmation() {
  const { user, isLoading } = useAuth();
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!isLoading && user && !hasChecked) {
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
    }
  }, [user, isLoading, hasChecked]);

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
  };

  return {
    needsConfirmation: needsConfirmation && user && hasChecked,
    isLoading: isLoading || !hasChecked,
    user,
    handleRankConfirmed
  };
}