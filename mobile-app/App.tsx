import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import MapScreen from './src/screens/MapScreen';
import ChatScreen from './src/screens/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import VerifyScreen from './src/screens/VerifyScreen';
import DMScreen from './src/screens/DMScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';

// Types
export interface User {
  id: string;
  fullName: string;
  email: string;
  userType: 'sailor' | 'local';
  isAdmin?: boolean;
  rank?: string;
  shipName?: string;
  city?: string;
  port?: string;
  whatsAppNumber?: string;
  whatsAppProfilePictureUrl?: string;
  whatsAppDisplayName?: string;
}

// Create navigators
const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Create QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
    },
  },
});

// Theme colors matching your web app
const theme = {
  colors: {
    primary: '#0891b2', // ocean-teal
    secondary: '#1e3a8a', // navy-blue
    background: '#f8fafc', // slate-50
    surface: '#ffffff',
    text: '#334155',
    accent: '#06b6d4', // cyan-500
  },
};

// Main Tab Navigator Component
function MainTabs({ user }: { user: User }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'home';
          
          if (route.name === 'Koi Hai?') iconName = 'map';
          else if (route.name === 'Chat') iconName = 'chat';
          else if (route.name === 'Profile') iconName = 'person';
          
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Koi Hai?" component={MapScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Auth Stack Navigator
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Verify" component={VerifyScreen} />
    </Stack.Navigator>
  );
}

// Main App Stack Navigator
function AppStack({ user }: { user: User }) {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MainTabs" 
        component={() => <MainTabs user={user} />} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="DM" 
        component={DMScreen}
        options={{ 
          title: 'Direct Message',
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: '#ffffff',
        }}
      />
      <Stack.Screen 
        name="UserProfile" 
        component={UserProfileScreen}
        options={{ 
          title: 'User Profile',
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: '#ffffff',
        }}
      />
    </Stack.Navigator>
  );
}

// Loading Component
function LoadingScreen() {
  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: theme.colors.background 
    }}>
      <View style={{
        width: 64,
        height: 64,
        backgroundColor: theme.colors.primary,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
      }}>
        <Icon name="anchor" size={32} color="#ffffff" />
      </View>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={{ 
        marginTop: 16, 
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '500'
      }}>
        Loading QaaqConnect...
      </Text>
    </View>
  );
}

// Main App Component
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userString = await AsyncStorage.getItem('user_data');
      
      if (token && userString) {
        const userData = JSON.parse(userString);
        setUser(userData);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>
            <StatusBar style="auto" />
            {user ? <AppStack user={user} /> : <AuthStack />}
          </NavigationContainer>
        </QueryClientProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}