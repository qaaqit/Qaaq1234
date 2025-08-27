import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AuthScreen from './src/AuthScreen';
import ChatScreen from './src/ChatScreen';

const Stack = createStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Auth"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#ea580c',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen 
            name="Auth" 
            options={{ headerShown: false }}
          >
            {props => <AuthScreen {...props} setUser={setUser} />}
          </Stack.Screen>
          
          <Stack.Screen 
            name="Chat" 
            component={ChatScreen}
            options={{ 
              title: 'QBOT AI Assistant',
              headerLeft: null,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="light" backgroundColor="#ea580c" />
    </SafeAreaProvider>
  );
}