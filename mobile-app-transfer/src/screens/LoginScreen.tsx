import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AuthService from '../services/AuthService';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const authService = AuthService.getInstance();

  const handleLogin = async () => {
    if (!userId.trim()) {
      Alert.alert('Error', 'Please enter your QAAQ User ID');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.login({
        userId: userId.trim(),
        password: password.trim(),
      });

      if (result.success) {
        Alert.alert(
          'Welcome!',
          `Successfully logged in as ${result.user?.fullName}`,
          [{ text: 'Continue', onPress: onLoginSuccess }]
        );
      } else {
        Alert.alert('Login Failed', result.message || 'Please check your credentials');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    Alert.alert(
      'Demo Mode',
      'Use these test credentials:\n\nUser ID: +919029010070\nPassword: 1234koihai',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Fill Demo Data',
          onPress: () => {
            setUserId('+919029010070');
            setPassword('1234koihai');
          }
        }
      ]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Logo/Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="boat" size={48} color="#0891b2" />
          </View>
          <Text style={styles.title}>QaaqConnect</Text>
          <Text style={styles.subtitle}>Maritime Community Platform</Text>
          <Text style={styles.tagline}>Connecting Sailors Worldwide</Text>
        </View>

        {/* Login Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="person" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="QAAQ User ID (WhatsApp Number)"
              value={userId}
              onChangeText={setUserId}
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor="#9ca3af"
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? 'eye-off' : 'eye'} 
                size={20} 
                color="#6b7280" 
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Ionicons name="log-in" size={20} color="#ffffff" style={styles.buttonIcon} />
                <Text style={styles.loginButtonText}>Login to QaaqConnect</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.demoButton} onPress={handleDemoLogin}>
            <Ionicons name="play" size={16} color="#0891b2" style={styles.buttonIcon} />
            <Text style={styles.demoButtonText}>Try Demo Login</Text>
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#0891b2" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>QAAQ User Authentication</Text>
              <Text style={styles.infoText}>
                Use your QAAQ WhatsApp number as User ID and password "1234koihai" for testing
              </Text>
            </View>
          </View>

          <View style={styles.featuresContainer}>
            <View style={styles.feature}>
              <Ionicons name="location" size={20} color="#059669" />
              <Text style={styles.featureText}>GPS Discovery</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="people" size={20} color="#7c3aed" />
              <Text style={styles.featureText}>Maritime Groups</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="chatbubbles" size={20} color="#ea580c" />
              <Text style={styles.featureText}>Direct Messages</Text>
            </View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0f7fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 2,
  },
  tagline: {
    fontSize: 14,
    color: '#0891b2',
    fontStyle: 'italic',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  loginButton: {
    backgroundColor: '#0891b2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#0891b2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  loginButtonDisabled: {
    backgroundColor: '#9ca3af',
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonIcon: {
    marginRight: 8,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0891b2',
  },
  demoButtonText: {
    color: '#0891b2',
    fontSize: 14,
    fontWeight: '600',
  },
  infoSection: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0f7fa',
    elevation: 1,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  feature: {
    alignItems: 'center',
  },
  featureText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontWeight: '500',
  },
});