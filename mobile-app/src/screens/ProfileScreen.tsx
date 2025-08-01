import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface UserProfile {
  fullName: string;
  userType: 'sailor' | 'local';
  rank?: string;
  shipName?: string;
  company?: string;
  port?: string;
  city?: string;
  country?: string;
  whatsappNumber: string;
  isLocationEnabled: boolean;
  isOnline: boolean;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile>({
    fullName: 'Captain John Smith',
    userType: 'sailor',
    rank: 'Captain',
    shipName: 'MV Atlantic Explorer',
    company: 'Maritime Shipping Co.',
    port: 'Mumbai Port',
    city: 'Mumbai',
    country: 'India',
    whatsappNumber: '+91 98765 43210',
    isLocationEnabled: true,
    isOnline: true,
  });

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('Logged Out', 'You have been logged out successfully');
          }
        },
      ]
    );
  };

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Profile editing will be available soon!');
  };

  const toggleLocationSharing = (value: boolean) => {
    setProfile(prev => ({ ...prev, isLocationEnabled: value }));
    Alert.alert(
      'Location Sharing',
      value ? 'Location sharing enabled' : 'Location sharing disabled'
    );
  };

  const toggleOnlineStatus = (value: boolean) => {
    setProfile(prev => ({ ...prev, isOnline: value }));
  };

  const renderInfoRow = (icon: keyof typeof Ionicons.glyphMap, label: string, value: string) => (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color="#0891b2" style={styles.infoIcon} />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );

  const renderSettingRow = (
    icon: keyof typeof Ionicons.glyphMap, 
    label: string, 
    subtitle: string,
    onPress: () => void
  ) => (
    <TouchableOpacity style={styles.settingRow} onPress={onPress}>
      <Ionicons name={icon} size={20} color="#6b7280" style={styles.settingIcon} />
      <View style={styles.settingContent}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
    </TouchableOpacity>
  );

  const renderToggleRow = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    subtitle: string,
    value: boolean,
    onToggle: (value: boolean) => void
  ) => (
    <View style={styles.settingRow}>
      <Ionicons name={icon} size={20} color="#6b7280" style={styles.settingIcon} />
      <View style={styles.settingContent}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#d1d5db', true: '#0891b2' }}
        thumbColor={value ? '#ffffff' : '#f4f4f5'}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={[
            styles.avatar,
            { backgroundColor: profile.userType === 'sailor' ? '#1e3a8a' : '#0891b2' }
          ]}>
            <Ionicons 
              name={profile.userType === 'sailor' ? 'boat' : 'person'} 
              size={36} 
              color="#ffffff" 
            />
          </View>
          {profile.isOnline && <View style={styles.onlineIndicator} />}
        </View>
        
        <Text style={styles.profileName}>{profile.fullName}</Text>
        <Text style={styles.profileType}>
          {profile.userType === 'sailor' ? '⚓ Maritime Professional' : '🏠 Local Contact'}
        </Text>
        
        <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
          <Ionicons name="create-outline" size={18} color="#0891b2" />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Information</Text>
        <View style={styles.sectionContent}>
          {profile.rank && renderInfoRow('medal', 'Rank', profile.rank)}
          {profile.shipName && renderInfoRow('boat', 'Ship', profile.shipName)}
          {profile.company && renderInfoRow('business', 'Company', profile.company)}
          {profile.port && renderInfoRow('location', 'Port', profile.port)}
          {profile.city && renderInfoRow('pin', 'Location', `${profile.city}, ${profile.country}`)}
          {renderInfoRow('call', 'WhatsApp', profile.whatsappNumber)}
        </View>
      </View>

      {/* Privacy Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy & Settings</Text>
        <View style={styles.sectionContent}>
          {renderToggleRow(
            'location',
            'Share Location',
            'Allow others to see your location for Koi Hai discovery',
            profile.isLocationEnabled,
            toggleLocationSharing
          )}
          {renderToggleRow(
            'radio',
            'Online Status',
            'Show when you are active on QaaqConnect',
            profile.isOnline,
            toggleOnlineStatus
          )}
        </View>
      </View>

      {/* App Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Settings</Text>
        <View style={styles.sectionContent}>
          {renderSettingRow(
            'notifications',
            'Notifications',
            'Manage your notification preferences',
            () => Alert.alert('Notifications', 'Notification settings coming soon!')
          )}
          {renderSettingRow(
            'shield-checkmark',
            'Privacy Policy',
            'Read our privacy policy and terms',
            () => Alert.alert('Privacy Policy', 'Privacy policy will be available soon!')
          )}
          {renderSettingRow(
            'help-circle',
            'Help & Support',
            'Get help or contact support',
            () => Alert.alert('Support', 'Support options coming soon!')
          )}
          {renderSettingRow(
            'information-circle',
            'About QaaqConnect',
            'Version 1.0.0 - Maritime Community Platform',
            () => Alert.alert('About', 'QaaqConnect v1.0.0\nMaritime Community Platform')
          )}
        </View>
      </View>

      {/* Logout Button */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color="#dc2626" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  profileHeader: {
    backgroundColor: '#ffffff',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#22c55e',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  profileType: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0891b2',
  },
  editButtonText: {
    color: '#0891b2',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoIcon: {
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  logoutText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomSpacer: {
    height: 40,
  },
});