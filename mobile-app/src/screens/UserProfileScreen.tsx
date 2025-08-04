import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://your-qaaqconnect-api.replit.app';

interface UserProfileScreenProps {
  navigation: any;
  route: {
    params: {
      userId: string;
    };
  };
}

interface User {
  id: string;
  fullName: string;
  userType: 'sailor' | 'local';
  rank?: string;
  shipName?: string;
  city?: string;
  port?: string;
  whatsAppNumber?: string;
  whatsAppProfilePictureUrl?: string;
  whatsAppDisplayName?: string;
}

export default function UserProfileScreen({ navigation, route }: UserProfileScreenProps) {
  const { userId } = route.params;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      Alert.alert('Error', 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = () => {
    if (user) {
      navigation.navigate('DM', { 
        userId: user.id, 
        userName: user.fullName 
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text>User not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.moreButton}>
          <Icon name="more-vert" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {user.whatsAppProfilePictureUrl ? (
              <Image 
                source={{ uri: user.whatsAppProfilePictureUrl }} 
                style={styles.avatarImage}
              />
            ) : (
              <View style={[
                styles.avatarPlaceholder,
                { backgroundColor: user.userType === 'sailor' ? '#0891b2' : '#f59e0b' }
              ]}>
                <Icon 
                  name={user.userType === 'sailor' ? 'directions-boat' : 'location-city'} 
                  size={40} 
                  color="#ffffff" 
                />
              </View>
            )}
          </View>

          <Text style={styles.userName}>{user.fullName}</Text>
          <Text style={styles.userType}>
            {user.userType === 'sailor' ? '⚓ Maritime Professional' : '🏢 Local Contact'}
          </Text>
          
          {user.rank && (
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{user.rank}</Text>
            </View>
          )}
        </View>

        {/* Professional Information */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Professional Information</Text>
          
          {user.shipName && (
            <View style={styles.infoItem}>
              <Icon name="directions-boat" size={20} color="#0891b2" />
              <Text style={styles.infoText}>Current Ship: {user.shipName}</Text>
            </View>
          )}
          
          {(user.city || user.port) && (
            <View style={styles.infoItem}>
              <Icon name="location-on" size={20} color="#0891b2" />
              <Text style={styles.infoText}>Location: {user.city || user.port}</Text>
            </View>
          )}
          
          {user.whatsAppNumber && (
            <View style={styles.infoItem}>
              <Icon name="phone" size={20} color="#0891b2" />
              <Text style={styles.infoText}>WhatsApp: {user.whatsAppNumber}</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleStartChat}>
            <Icon name="chat" size={20} color="#ffffff" />
            <Text style={styles.primaryButtonText}>Start Conversation</Text>
          </TouchableOpacity>

          <View style={styles.secondaryActions}>
            <TouchableOpacity style={styles.secondaryButton}>
              <Icon name="phone" size={20} color="#0891b2" />
              <Text style={styles.secondaryButtonText}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton}>
              <Icon name="share" size={20} color="#0891b2" />
              <Text style={styles.secondaryButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Additional Info */}
        <View style={styles.additionalInfo}>
          <Text style={styles.additionalInfoText}>
            {user.userType === 'sailor' 
              ? 'Maritime professional available for networking and collaboration'
              : 'Local contact providing services to maritime professionals'
            }
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0891b2',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  moreButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  userType: {
    fontSize: 16,
    color: '#0891b2',
    fontWeight: '500',
    marginBottom: 12,
  },
  rankBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rankText: {
    fontSize: 14,
    color: '#0891b2',
    fontWeight: '500',
  },
  infoSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 12,
  },
  actionsSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0891b2',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  secondaryButtonText: {
    color: '#0891b2',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  additionalInfo: {
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
  },
  additionalInfoText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});