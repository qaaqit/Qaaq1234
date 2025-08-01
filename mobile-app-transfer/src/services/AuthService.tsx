import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Configure API base URL - update this to match your QaaqConnect server
const API_BASE_URL = 'https://your-qaaqconnect-api.com'; // Replace with actual URL

interface LoginCredentials {
  userId: string;
  password: string;
}

interface User {
  id: string;
  fullName: string;
  userType: 'sailor' | 'local';
  rank?: string;
  shipName?: string;
  company?: string;
  port?: string;
  city?: string;
  country?: string;
  whatsappNumber: string;
  isVerified: boolean;
}

interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
}

class AuthService {
  private static instance: AuthService;
  private authToken: string | null = null;
  private currentUser: User | null = null;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Initialize auth service - check for stored token
  async initialize(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userData = await AsyncStorage.getItem('user_data');
      
      if (token && userData) {
        this.authToken = token;
        this.currentUser = JSON.parse(userData);
        
        // Verify token is still valid
        const isValid = await this.verifyToken();
        if (!isValid) {
          await this.logout();
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      await this.logout();
    }
  }

  // Login with QAAQ User ID and password
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        userId: credentials.userId,
        password: credentials.password,
      });

      if (response.data.success) {
        const { token, user } = response.data;
        
        // Store auth data
        await AsyncStorage.setItem('auth_token', token);
        await AsyncStorage.setItem('user_data', JSON.stringify(user));
        
        this.authToken = token;
        this.currentUser = user;
        
        return { success: true, token, user };
      } else {
        return { success: false, message: response.data.message || 'Login failed' };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        return { success: false, message: 'Invalid credentials' };
      } else if (error.response?.status === 404) {
        return { success: false, message: 'User not found' };
      } else {
        return { success: false, message: 'Network error. Please try again.' };
      }
    }
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      // Clear stored data
      await AsyncStorage.multiRemove(['auth_token', 'user_data']);
      
      this.authToken = null;
      this.currentUser = null;
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // Verify token is still valid
  async verifyToken(): Promise<boolean> {
    if (!this.authToken) return false;
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/verify`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      return response.data.success;
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.authToken && !!this.currentUser;
  }

  // Get auth token for API requests
  getAuthToken(): string | null {
    return this.authToken;
  }

  // Update user profile
  async updateProfile(updates: Partial<User>): Promise<AuthResponse> {
    if (!this.authToken || !this.currentUser) {
      return { success: false, message: 'Not authenticated' };
    }

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/api/users/profile`,
        updates,
        {
          headers: { Authorization: `Bearer ${this.authToken}` }
        }
      );

      if (response.data.success) {
        const updatedUser = { ...this.currentUser, ...updates };
        await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
        this.currentUser = updatedUser;
        
        return { success: true, user: updatedUser };
      } else {
        return { success: false, message: response.data.message || 'Update failed' };
      }
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  }

  // Update device location
  async updateLocation(latitude: number, longitude: number): Promise<boolean> {
    if (!this.authToken) return false;

    try {
      await axios.post(
        `${API_BASE_URL}/api/users/location/device`,
        { latitude, longitude },
        {
          headers: { Authorization: `Bearer ${this.authToken}` }
        }
      );
      
      return true;
    } catch (error) {
      console.error('Location update error:', error);
      return false;
    }
  }

  // Search nearby users
  async searchNearbyUsers(latitude: number, longitude: number, radius: number = 50): Promise<User[]> {
    try {
      const headers: any = {};
      if (this.authToken) {
        headers.Authorization = `Bearer ${this.authToken}`;
      }

      const response = await axios.get(`${API_BASE_URL}/api/users/search`, {
        params: { latitude, longitude, radius },
        headers
      });

      return response.data || [];
    } catch (error) {
      console.error('User search error:', error);
      return [];
    }
  }

  // Get maritime groups
  async getMaritimeGroups(): Promise<any[]> {
    try {
      const headers: any = {};
      if (this.authToken) {
        headers.Authorization = `Bearer ${this.authToken}`;
      }

      const response = await axios.get(`${API_BASE_URL}/api/groups`, {
        headers
      });

      return response.data || [];
    } catch (error) {
      console.error('Groups fetch error:', error);
      return [];
    }
  }
}

export default AuthService;
export type { User, LoginCredentials, AuthResponse };