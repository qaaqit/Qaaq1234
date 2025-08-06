// API Configuration for QaaqConnect Mariana Mobile App

// For development with Expo
const DEV_API_URL = 'http://localhost:5000';

// For production - replace with your actual Replit app URL
const PROD_API_URL = 'https://mushypiyush-workspace.replit.app';

// Auto-detect environment
export const API_BASE_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;

// API endpoints
export const API_ENDPOINTS = {
  LOGIN: '/api/login',
  REGISTER: '/api/register',
  VERIFY: '/api/verify',
  PROFILE: '/api/profile',
  USERS_SEARCH: '/api/users/search',
  USERS_LOCATION: '/api/users/location',
  USERS_DEVICE_LOCATION: '/api/users/location/device',
  CHAT_CONNECTIONS: '/api/chat/connections',
  CHAT_MESSAGES: '/api/chat/messages',
};

// Default fetch options
export const defaultFetchOptions = {
  headers: {
    'Content-Type': 'application/json',
  },
};

// Authenticated fetch helper
export const authenticatedFetch = async (endpoint: string, options: RequestInit = {}) => {
  const AsyncStorage = await import('@react-native-async-storage/async-storage');
  const token = await AsyncStorage.default.getItem('auth_token');
  
  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...defaultFetchOptions,
    ...options,
    headers: {
      ...defaultFetchOptions.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });
};