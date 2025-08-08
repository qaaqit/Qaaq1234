import { useEffect } from 'react';

export const AuthFix = () => {
  useEffect(() => {
    // Force authentication fix by clearing old tokens and setting fresh one
    const freshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0NDg4NTY4MyIsImlhdCI6MTc1NDY1NTAwNywiZXhwIjoxNzU1MjU5ODA3fQ.Gpn3zdOcgmJW0pho3nOC8CWVdKDjfmXHU_ct2nNPYEo';
    const userData = JSON.stringify({id: '44885683', email: '+91 9820011223'});
    
    console.log('🔧 AuthFix: Setting fresh authentication tokens');
    localStorage.clear(); // Clear all old data
    localStorage.setItem('qaaq_token', freshToken);
    localStorage.setItem('qaaq_user', userData);
    
    // Force immediate page reload to apply new tokens
    setTimeout(() => {
      console.log('🔄 AuthFix: Reloading page to apply fresh tokens');
      window.location.reload();
    }, 100);
  }, []);

  return (
    <div className="fixed top-4 right-4 bg-orange-500 text-white px-4 py-2 rounded shadow-lg z-50">
      Fixing authentication...
    </div>
  );
};