import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

const API_BASE_URL = 'https://your-qaaqconnect-api.replit.app';

interface VerifyScreenProps {
  navigation: any;
}

export default function VerifyScreen({ navigation }: VerifyScreenProps) {
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!verificationCode.trim()) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: verificationCode }),
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert(
          'Verification Successful',
          'Your account has been verified successfully!',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      } else {
        Alert.alert('Verification Failed', result.message || 'Invalid code');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please check your connection');
      console.error('Verification error:', error);
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
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Verification Form */}
          <View style={styles.formContainer}>
            <View style={styles.iconContainer}>
              <Icon name="mark-email-read" size={48} color="#0891b2" />
            </View>

            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.subtitle}>
              We've sent a verification code to your email address. Enter it below to complete your registration.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>VERIFICATION CODE</Text>
              <View style={styles.inputWrapper}>
                <Icon name="key" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
              onPress={handleVerify}
              disabled={loading}
            >
              <LinearGradient
                colors={['#1e3a8a', '#1e40af', '#2563eb']}
                style={styles.verifyButtonGradient}
              >
                {loading ? (
                  <Text style={styles.verifyButtonText}>Verifying...</Text>
                ) : (
                  <>
                    <Icon name="verified" size={20} color="#ffffff" />
                    <Text style={styles.verifyButtonText}>Verify Account</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resendButton}>
              <Text style={styles.resendText}>Didn't receive the code? Resend</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  backButton: {
    padding: 8,
    alignSelf: 'flex-start',
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(8, 145, 178, 0.1)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
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
    fontSize: 18,
    color: '#374151',
    textAlign: 'center',
    letterSpacing: 2,
  },
  verifyButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  verifyButtonDisabled: {
    opacity: 0.7,
  },
  verifyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  verifyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  resendButton: {
    paddingVertical: 12,
  },
  resendText: {
    color: '#0891b2',
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});