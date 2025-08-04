import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

const API_BASE_URL = 'https://your-qaaqconnect-api.replit.app';

interface RegisterScreenProps {
  navigation: any;
}

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'sailor' as 'sailor' | 'local',
  });
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!formData.fullName || !formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          userType: formData.userType,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert(
          'Registration Successful',
          'Please check your email for verification instructions.',
          [{ text: 'OK', onPress: () => navigation.navigate('Verify') }]
        );
      } else {
        Alert.alert('Registration Failed', result.message || 'Please try again');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please check your connection');
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0891b2', '#06b6d4', '#0ea5e9']}
        style={styles.backgroundGradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Icon name="arrow-back" size={24} color="#ffffff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Join QaaqConnect</Text>
            </View>

            {/* Registration Form */}
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Create Your Account</Text>
              <Text style={styles.formSubtitle}>
                Connect with maritime professionals worldwide
              </Text>

              {/* Full Name */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>FULL NAME *</Text>
                <View style={styles.inputWrapper}>
                  <Icon name="person" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={formData.fullName}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, fullName: text }))}
                    placeholder="Enter your full name"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>EMAIL ADDRESS *</Text>
                <View style={styles.inputWrapper}>
                  <Icon name="email" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={formData.email}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                    placeholder="Enter your email"
                    placeholderTextColor="#94a3b8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* User Type Selection */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>I AM A *</Text>
                <View style={styles.userTypeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.userTypeButton,
                      formData.userType === 'sailor' && styles.userTypeButtonActive
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, userType: 'sailor' }))}
                  >
                    <Icon
                      name="directions-boat"
                      size={20}
                      color={formData.userType === 'sailor' ? '#ffffff' : '#0891b2'}
                    />
                    <Text style={[
                      styles.userTypeText,
                      formData.userType === 'sailor' && styles.userTypeTextActive
                    ]}>
                      Maritime Professional
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.userTypeButton,
                      formData.userType === 'local' && styles.userTypeButtonActive
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, userType: 'local' }))}
                  >
                    <Icon
                      name="location-city"
                      size={20}
                      color={formData.userType === 'local' ? '#ffffff' : '#0891b2'}
                    />
                    <Text style={[
                      styles.userTypeText,
                      formData.userType === 'local' && styles.userTypeTextActive
                    ]}>
                      Local Contact
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>PASSWORD *</Text>
                <View style={styles.inputWrapper}>
                  <Icon name="lock" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={formData.password}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
                    placeholder="Create a password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry
                  />
                </View>
              </View>

              {/* Confirm Password */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>CONFIRM PASSWORD *</Text>
                <View style={styles.inputWrapper}>
                  <Icon name="lock" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={formData.confirmPassword}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, confirmPassword: text }))}
                    placeholder="Confirm your password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry
                  />
                </View>
              </View>

              {/* Register Button */}
              <TouchableOpacity
                style={[styles.registerButton, loading && styles.registerButtonDisabled]}
                onPress={handleRegister}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#1e3a8a', '#1e40af', '#2563eb']}
                  style={styles.registerButtonGradient}
                >
                  {loading ? (
                    <Text style={styles.registerButtonText}>Creating Account...</Text>
                  ) : (
                    <>
                      <Icon name="person-add" size={20} color="#ffffff" />
                      <Text style={styles.registerButtonText}>Create Account</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Login Link */}
              <View style={styles.loginSection}>
                <Text style={styles.loginText}>Already have an account?</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.loginLink}>Sign in here</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 30,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  userTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  userTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  userTypeButtonActive: {
    backgroundColor: '#0891b2',
    borderColor: '#0891b2',
  },
  userTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginLeft: 8,
    textAlign: 'center',
  },
  userTypeTextActive: {
    color: '#ffffff',
  },
  registerButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loginSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loginText: {
    color: '#64748b',
    fontSize: 14,
  },
  loginLink: {
    color: '#0891b2',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});