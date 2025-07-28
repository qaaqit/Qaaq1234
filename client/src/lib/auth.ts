import { apiRequest } from "./queryClient";

export interface User {
  id: string;
  fullName: string;
  email: string;
  userType: 'sailor' | 'local';
  isAdmin?: boolean;
  nickname?: string;
  isVerified: boolean;
  loginCount: number;
}

export interface AuthResponse {
  user: User;
  token?: string;
  needsVerification: boolean;
  message?: string;
}

export const authApi = {
  register: async (userData: {
    fullName: string;
    email: string;
    userType: 'sailor' | 'local';
    nickname?: string;
  }): Promise<AuthResponse> => {
    const response = await apiRequest('POST', '/api/register', userData);
    return await response.json();
  },

  login: async (userId: string, password: string): Promise<AuthResponse> => {
    const response = await apiRequest('POST', '/api/login', { userId, password });
    return await response.json();
  },

  verify: async (email: string, code: string): Promise<AuthResponse> => {
    const response = await apiRequest('POST', '/api/verify', { email, code });
    return await response.json();
  },

  getProfile: async (): Promise<User> => {
    const response = await apiRequest('GET', '/api/profile');
    return await response.json();
  }
};

export const getStoredToken = (): string | null => {
  return localStorage.getItem('qaaq_token');
};

export const setStoredToken = (token: string): void => {
  localStorage.setItem('qaaq_token', token);
};

export const removeStoredToken = (): void => {
  localStorage.removeItem('qaaq_token');
};

export const getStoredUser = (): User | null => {
  const userStr = localStorage.getItem('qaaq_user');
  return userStr ? JSON.parse(userStr) : null;
};

export const setStoredUser = (user: User): void => {
  localStorage.setItem('qaaq_user', JSON.stringify(user));
};

export const removeStoredUser = (): void => {
  localStorage.removeItem('qaaq_user');
};

export const logout = (): void => {
  removeStoredToken();
  removeStoredUser();
};
