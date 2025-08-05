import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './src/contexts/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import DiscoveryScreen from './src/screens/DiscoveryScreen';
import QBOTScreen from './src/screens/QBOTScreen';
import QuestionsScreen from './src/screens/QuestionsScreen';
import GroupsScreen from './src/screens/GroupsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ChatScreen from './src/screens/ChatScreen';
import AdminScreen from './src/screens/AdminScreen';
import QaaqStoreScreen from './src/screens/QaaqStoreScreen';
import MyQuestionsScreen from './src/screens/MyQuestionsScreen';

// Hooks
import { useAuth } from './src/contexts/AuthContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const queryClient = new QueryClient();

function MainTabs() {
  const { user } = useAuth();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          switch (route.name) {
            case 'Discovery':
              iconName = 'compass';
              break;
            case 'QBOT':
              iconName = 'robot';
              break;
            case 'Questions':
              iconName = 'question-circle';
              break;
            case 'Groups':
              iconName = 'users';
              break;
            case 'Profile':
              iconName = 'user';
              break;
            default:
              iconName = 'circle';
          }
          
          return <FontAwesome5 name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#ea580c',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 2,
          borderTopColor: '#ea580c',
          paddingBottom: 5,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: 'bold',
        },
        headerStyle: {
          backgroundColor: '#ea580c',
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen 
        name="Discovery" 
        component={DiscoveryScreen}
        options={{ 
          title: 'Koi Hai?',
          headerShown: false // Custom header in component
        }}
      />
      <Tab.Screen 
        name="QBOT" 
        component={QBOTScreen}
        options={{ title: 'QBOT AI' }}
      />
      <Tab.Screen 
        name="Questions" 
        component={QuestionsScreen}
        options={{ title: 'Channel 13' }}
      />
      <Tab.Screen 
        name="Groups" 
        component={GroupsScreen}
        options={{ title: 'Maritime Groups' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ 
          title: 'Profile',
          headerRight: () => (
            user?.isAdmin ? (
              <FontAwesome5 
                name="shield-alt" 
                size={20} 
                color="white" 
                style={{ marginRight: 15 }}
                onPress={() => {/* Navigate to admin */}}
              />
            ) : null
          )
        }}
      />
    </Tab.Navigator>
  );
}

function AppStack() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return null; // Show loading screen
  }
  
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Admin" component={AdminScreen} />
          <Stack.Screen name="QaaqStore" component={QaaqStoreScreen} />
          <Stack.Screen name="MyQuestions" component={MyQuestionsScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NavigationContainer>
            <StatusBar style="light" backgroundColor="#0891b2" />
            <AppStack />
          </NavigationContainer>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}