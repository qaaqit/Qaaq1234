import { useEffect } from 'react';
import { forceTokenRefresh } from '@/utils/auth';

export const ForceLogin = () => {
  useEffect(() => {
    console.log('ForceLogin: Clearing expired tokens and redirecting to login');
    forceTokenRefresh();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Session Expired</h2>
        <p className="text-gray-600 mb-4">Your session has expired. Redirecting to login...</p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
      </div>
    </div>
  );
};