import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = __DEV__ 
  ? 'http://localhost:5000' // Development URL
  : 'https://qaaqconnect.replit.app'; // Production Replit URL (Replace with actual deployment URL)

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest(
  endpoint: string, 
  options: ApiRequestOptions = {}
): Promise<any> {
  const { method = 'GET', headers = {}, body } = options;
  
  try {
    // Get auth token
    const token = await AsyncStorage.getItem('auth_token');
    
    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    };

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    // Handle empty responses
    const responseText = await response.text();
    if (!responseText) {
      return null;
    }

    try {
      return JSON.parse(responseText);
    } catch {
      return responseText;
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network or other errors
    throw new ApiError(
      error instanceof Error ? error.message : 'Network request failed',
      0
    );
  }
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

// Specific API functions
export const authApi = {
  login: (credentials: { username: string; password: string }) =>
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: credentials,
    }),
    
  logout: () =>
    apiRequest('/api/auth/logout', {
      method: 'POST',
    }),
    
  getCurrentUser: () =>
    apiRequest('/api/auth/user'),
    
  refreshToken: () =>
    apiRequest('/api/auth/refresh', {
      method: 'POST',
    }),
};

export const usersApi = {
  search: (params: { q?: string; rank?: string; radius?: number }) =>
    apiRequest(`/api/users/search?${new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    )}`),
    
  updateLocation: (coords: { latitude: number; longitude: number }) =>
    apiRequest('/api/users/location/device', {
      method: 'POST',
      body: coords,
    }),
    
  getProfile: (userId: string) =>
    apiRequest(`/api/users/${userId}`),
};

export const qbotApi = {
  getChatHistory: () =>
    apiRequest('/api/qbot/history'),
    
  sendMessage: (message: string) =>
    apiRequest('/api/qbot/chat', {
      method: 'POST',
      body: { 
        message, 
        timestamp: new Date().toISOString() 
      },
    }),
    
  clearHistory: () =>
    apiRequest('/api/qbot/history', {
      method: 'DELETE',
    }),
    
  getStatus: () =>
    apiRequest('/api/qbot/status'),
};

export const questionsApi = {
  getQuestions: (params: { 
    page?: number; 
    q?: string; 
    category?: string; 
    limit?: number;
  }) =>
    apiRequest(`/api/questions?${new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    )}`),
    
  getQuestion: (questionId: string) =>
    apiRequest(`/api/questions/${questionId}`),
    
  askQuestion: (question: { 
    content: string; 
    category?: string; 
    tags?: string[];
  }) =>
    apiRequest('/api/questions', {
      method: 'POST',
      body: question,
    }),
    
  answerQuestion: (questionId: string, answer: { content: string }) =>
    apiRequest(`/api/questions/${questionId}/answers`, {
      method: 'POST',
      body: answer,
    }),
};

export const groupsApi = {
  getGroups: (tab?: string) =>
    apiRequest(`/api/groups${tab ? `?tab=${tab}` : ''}`),
    
  getGroup: (groupId: string) =>
    apiRequest(`/api/groups/${groupId}`),
    
  joinGroup: (groupId: string) =>
    apiRequest(`/api/groups/${groupId}/join`, {
      method: 'POST',
    }),
    
  leaveGroup: (groupId: string) =>
    apiRequest(`/api/groups/${groupId}/leave`, {
      method: 'POST',
    }),
    
  createGroup: (group: {
    name: string;
    description: string;
    category: string;
    isPrivate?: boolean;
  }) =>
    apiRequest('/api/groups', {
      method: 'POST',
      body: group,
    }),
};

export const cpssApi = {
  getCountries: () =>
    apiRequest('/api/cpss/countries'),
    
  getPorts: (countryId: string) =>
    apiRequest(`/api/cpss/countries/${countryId}/ports`),
    
  getSuburbs: (portId: string) =>
    apiRequest(`/api/cpss/ports/${portId}/suburbs`),
    
  getServices: (suburbId: string) =>
    apiRequest(`/api/cpss/suburbs/${suburbId}/services`),
};

export const chatApi = {
  getChats: () =>
    apiRequest('/api/chats'),
    
  getChat: (chatId: string) =>
    apiRequest(`/api/chats/${chatId}`),
    
  sendMessage: (chatId: string, content: string) =>
    apiRequest(`/api/chats/${chatId}/messages`, {
      method: 'POST',
      body: { content },
    }),
    
  createChat: (userId: string) =>
    apiRequest('/api/chats', {
      method: 'POST',
      body: { userId },
    }),
};