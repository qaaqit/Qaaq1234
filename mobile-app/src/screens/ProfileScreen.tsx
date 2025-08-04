import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
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

interface ProfileScreenProps {
  navigation: any;
}

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const [user, setUser] = useState<User | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userString = await AsyncStorage.getItem('user_data');
      if (userString) {
        setUser(JSON.parse(userString));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('auth_token');
              await AsyncStorage.removeItem('user_data');
              navigation.replace('Login');
            } catch (error) {
              console.error('Error during logout:', error);
            }
          },
        },
      ]
    );
  };

  const ProfileSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const ProfileItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    showArrow = true 
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showArrow?: boolean;
  }) => (
    <TouchableOpacity
      style={styles.profileItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.profileItemContent}>
        <Icon name={icon} size={24} color="#0891b2" style={styles.profileItemIcon} />
        <View style={styles.profileItemText}>
          <Text style={styles.profileItemTitle}>{title}</Text>
          {subtitle && <Text style={styles.profileItemSubtitle}>{subtitle}</Text>}
        </View>
        {showArrow && onPress && (
          <Icon name="chevron-right" size={20} color="#94a3b8" />
        )}
      </View>
    </TouchableOpacity>
  );

  const SettingItem = ({
    icon,
    title,
    subtitle,
    value,
    onValueChange,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
  }) => (
    <View style={styles.profileItem}>
      <View style={styles.profileItemContent}>
        <Icon name={icon} size={24} color="#0891b2" style={styles.profileItemIcon} />
        <View style={styles.profileItemText}>
          <Text style={styles.profileItemTitle}>{title}</Text>
          {subtitle && <Text style={styles.profileItemSubtitle}>{subtitle}</Text>}
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#e2e8f0', true: '#0891b2' }}
          thumbColor={value ? '#ffffff' : '#f4f4f5'}
        />
      </View>
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.editButton}>
          <Icon name="edit" size={20} color="#0891b2" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {user.whatsAppProfilePictureUrl ? (
              <Image 
                source={{ uri: user.whatsAppProfilePictureUrl }} 
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Icon 
                  name={user.userType === 'sailor' ? 'directions-boat' : 'person'} 
                  size={32} 
                  color="#ffffff" 
                />
              </View>
            )}
            
            {user.isAdmin && (
              <View style={styles.adminBadge}>
                <Icon name="verified" size={16} color="#f59e0b" />
              </View>
            )}
          </View>

          <Text style={styles.userName}>{user.fullName}</Text>
          <Text style={styles.userType}>
            {user.userType === 'sailor' ? '⚓ Maritime Professional' : '🏢 Local Contact'}
          </Text>
          
          {user.rank && (
            <Text style={styles.userRank}>{user.rank}</Text>
          )}
          
          {user.shipName && (
            <Text style={styles.userShip}>🚢 {user.shipName}</Text>
          )}
          
          {(user.city || user.port) && (
            <Text style={styles.userLocation}>
              📍 {user.city || user.port}
            </Text>
          )}
        </View>

        {/* Professional Information */}
        <ProfileSection title="Professional Information">
          <ProfileItem
            icon="badge"
            title="Maritime Rank"
            subtitle={user.rank || 'Not specified'}
            onPress={() => {/* Navigate to edit rank */}}
          />
          <ProfileItem
            icon="directions-boat"
            title="Current Ship"
            subtitle={user.shipName || 'Not specified'}
            onPress={() => {/* Navigate to edit ship */}}
          />
          <ProfileItem
            icon="location-on"
            title="Current Location"
            subtitle={user.city || user.port || 'Not specified'}
            onPress={() => {/* Navigate to edit location */}}
          />
        </ProfileSection>

        {/* Contact Information */}
        <ProfileSection title="Contact Information">
          <ProfileItem
            icon="email"
            title="Email"
            subtitle={user.email}
            onPress={() => {/* Navigate to edit email */}}
          />
          <ProfileItem
            icon="phone"
            title="WhatsApp Number"
            subtitle={user.whatsAppNumber || 'Not connected'}
            onPress={() => {/* Navigate to connect WhatsApp */}}
          />
        </ProfileSection>

        {/* Settings */}
        <ProfileSection title="Settings">
          <SettingItem
            icon="location-on"
            title="Location Services"
            subtitle="Allow location sharing for discovery"
            value={locationEnabled}
            onValueChange={setLocationEnabled}
          />
          <SettingItem
            icon="notifications"
            title="Push Notifications"
            subtitle="Receive messages and updates"
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
          />
        </ProfileSection>

        {/* App Information */}
        <ProfileSection title="Support">
          <ProfileItem
            icon="help"
            title="Help & Support"
            subtitle="Get help with QaaqConnect"
            onPress={() => {/* Navigate to help */}}
          />
          <ProfileItem
            icon="info"
            title="About QaaqConnect"
            subtitle="Version 2.0.0"
            onPress={() => {/* Navigate to about */}}
          />
          <ProfileItem
            icon="privacy-tip"
            title="Privacy Policy"
            subtitle="Learn about your privacy"
            onPress={() => {/* Navigate to privacy */}}
          />
        </ProfileSection>

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Icon name="logout" size={20} color="#ef4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <Text style={styles.versionText}>QaaqConnect Mobile v2.0.0</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
  },
  editButton: {
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
  profileCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0891b2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 4,
  },
  userType: {
    fontSize: 16,
    color: '#0891b2',
    fontWeight: '500',
    marginBottom: 8,
  },
  userRank: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 4,
  },
  userShip: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  userLocation: {
    fontSize: 14,
    color: '#94a3b8',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 16,
    marginBottom: 8,
  },
  profileItem: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 2,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  profileItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  profileItemIcon: {
    marginRight: 12,
  },
  profileItemText: {
    flex: 1,
  },
  profileItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 2,
  },
  profileItemSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  logoutSection: {
    marginHorizontal: 16,
    marginVertical: 24,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 32,
  },
});