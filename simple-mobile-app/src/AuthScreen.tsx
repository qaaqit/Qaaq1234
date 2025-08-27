import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { FontAwesome5 } from '@expo/vector-icons';

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen({ navigation, setUser }) {
  const handleReplitAuth = async () => {
    try {
      Alert.alert(
        'Replit Auth',
        'To use Replit authentication, configure your backend URL and OAuth settings.',
        [
          {
            text: 'Continue to Chat',
            onPress: () => {
              setUser({ email: 'demo@qaaq.com' });
              navigation.navigate('Chat');
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Authentication failed');
    }
  };

  const handleDemoLogin = () => {
    setUser({ email: 'demo@qaaq.com' });
    navigation.navigate('Chat');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>QAAQ</Text>
        <Text style={styles.subtitle}>Maritime Professionals Network</Text>
      </View>

      <View style={styles.authContainer}>
        <Text style={styles.title}>Welcome Aboard!</Text>
        <Text style={styles.description}>
          Connect with maritime professionals worldwide
        </Text>

        <TouchableOpacity
          style={[styles.authButton, styles.replitButton]}
          onPress={handleReplitAuth}
        >
          <FontAwesome5 name="sign-in-alt" size={20} color="white" />
          <Text style={styles.authButtonText}>Sign in with Replit</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={[styles.authButton, styles.demoButton]}
          onPress={handleDemoLogin}
        >
          <FontAwesome5 name="user" size={20} color="#ea580c" />
          <Text style={[styles.authButtonText, styles.demoButtonText]}>
            Try Demo Mode
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        By continuing, you agree to our Terms of Service
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef3e7',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ea580c',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 40,
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    gap: 10,
  },
  replitButton: {
    backgroundColor: '#ea580c',
  },
  demoButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#ea580c',
  },
  authButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  demoButtonText: {
    color: '#ea580c',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    paddingHorizontal: 10,
    color: '#9ca3af',
    fontSize: 14,
  },
  footer: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 12,
  },
});