// Token management utility to handle JWT authentication issues
export const clearStoredTokens = () => {
  localStorage.removeItem('qaaq_token');
  localStorage.removeItem('token'); // Clear any old token keys
  localStorage.removeItem('qaaq_user');
  localStorage.removeItem('user');
};

export const forceTokenRefresh = () => {
  // Clear old tokens and force re-login
  clearStoredTokens();
  window.location.href = '/login';
};

export const isTokenValid = (token: string): boolean => {
  if (!token) return false;
  
  try {
    // Simple JWT structure check
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Decode payload to check expiry
    const payload = JSON.parse(atob(parts[1]));
    const now = Date.now() / 1000;
    
    // Check if token is expired (with 5 minute buffer)
    if (payload.exp && payload.exp < (now + 300)) {
      console.warn('Token is expired or expiring soon');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
};