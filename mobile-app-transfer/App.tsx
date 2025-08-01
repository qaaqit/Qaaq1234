import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';

// Import screens
import MapScreen from './src/screens/MapScreen';
import GroupsScreen from './src/screens/GroupsScreen';
import DMScreen from './src/screens/DMScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/LoginScreen';

// Import services
import AuthService from './src/services/AuthService';

// Import icons
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const authService = AuthService.getInstance();

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      await authService.initialize();
      setIsAuthenticated(authService.isAuthenticated());
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await authService.logout();
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0891b2" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <View style={styles.container}>
        <StatusBar style="auto" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName: keyof typeof Ionicons.glyphMap;

              if (route.name === 'Map') {
                iconName = focused ? 'map' : 'map-outline';
              } else if (route.name === 'Groups') {
                iconName = focused ? 'people' : 'people-outline';
              } else if (route.name === 'DM') {
                iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              } else if (route.name === 'Profile') {
                iconName = focused ? 'person' : 'person-outline';
              } else {
                iconName = 'help-outline';
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#0891b2',
            tabBarInactiveTintColor: 'gray',
            tabBarStyle: {
              backgroundColor: '#ffffff',
              borderTopColor: '#e5e7eb',
              height: 60,
              paddingBottom: 8,
              paddingTop: 8,
            },
            headerStyle: {
              backgroundColor: '#0891b2',
            },
            headerTintColor: '#ffffff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          })}
        >
          <Tab.Screen 
            name="Map" 
            component={MapScreen} 
            options={{ title: 'Koi Hai?' }}
          />
          <Tab.Screen 
            name="Groups" 
            component={GroupsScreen} 
            options={{ title: 'Ch16 Groups' }}
          />
          <Tab.Screen 
            name="DM" 
            component={DMScreen} 
            options={{ title: 'Direct Messages' }}
          />
          <Tab.Screen 
            name="Profile" 
            component={ProfileScreen} 
            options={{ title: 'Profile' }}
            initialParams={{ onLogout: handleLogout }}
          />
        </Tab.Navigator>
      </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
});