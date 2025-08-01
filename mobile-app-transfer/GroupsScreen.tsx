import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MaritimeGroup {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const maritimeGroups: MaritimeGroup[] = [
  {
    id: 'tsi',
    name: 'TSI',
    description: 'Training Ship Instructors',
    memberCount: 45,
    icon: 'school',
    color: '#1e3a8a',
  },
  {
    id: 'msi',
    name: 'MSI',
    description: 'Marine Safety Instructors',
    memberCount: 38,
    icon: 'shield-checkmark',
    color: '#dc2626',
  },
  {
    id: 'mtr-co',
    name: 'Mtr CO',
    description: 'Motor Chief Officers',
    memberCount: 62,
    icon: 'cog',
    color: '#059669',
  },
  {
    id: '20-30',
    name: '20 30',
    description: '2nd & 3rd Officers',
    memberCount: 89,
    icon: 'navigate',
    color: '#7c3aed',
  },
  {
    id: 'ce-2e',
    name: 'CE 2E',
    description: 'Chief & 2nd Engineers',
    memberCount: 56,
    icon: 'build',
    color: '#ea580c',
  },
  {
    id: '3e-4e',
    name: '3E 4E',
    description: '3rd & 4th Engineers',
    memberCount: 71,
    icon: 'hammer',
    color: '#0891b2',
  },
  {
    id: 'cadets',
    name: 'Cadets',
    description: 'Maritime Cadets',
    memberCount: 124,
    icon: 'school-outline',
    color: '#16a34a',
  },
  {
    id: 'crew',
    name: 'Crew',
    description: 'Ship Crew Members',
    memberCount: 203,
    icon: 'people',
    color: '#9333ea',
  },
  {
    id: 'eto-elec',
    name: 'ETO & Elec Supdts',
    description: 'Electrical Officers & Superintendents',
    memberCount: 34,
    icon: 'flash',
    color: '#dc2626',
  },
];

export default function GroupsScreen() {
  const handleGroupPress = (group: MaritimeGroup) => {
    Alert.alert(
      group.name,
      `Join ${group.description} group with ${group.memberCount} members?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Join Chat', 
          onPress: () => {
            Alert.alert('Coming Soon', 'Group chat functionality will be available soon!');
          }
        },
      ]
    );
  };

  const renderGroupCard = (group: MaritimeGroup) => (
    <TouchableOpacity
      key={group.id}
      style={[styles.groupCard, { borderLeftColor: group.color }]}
      onPress={() => handleGroupPress(group)}
    >
      <View style={styles.groupHeader}>
        <View style={[styles.iconContainer, { backgroundColor: group.color }]}>
          <Ionicons name={group.icon} size={24} color="#ffffff" />
        </View>
        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.groupDescription}>{group.description}</Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberCount}>{group.memberCount}</Text>
          <Text style={styles.memberLabel}>members</Text>
        </View>
      </View>
      <View style={styles.groupActions}>
        <View style={styles.statusIndicator}>
          <View style={styles.onlineIndicator} />
          <Text style={styles.statusText}>Active now</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#6b7280" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Maritime Groups</Text>
          <Text style={styles.subtitle}>
            Connect with professionals in your maritime field
          </Text>
        </View>

        <View style={styles.groupsContainer}>
          {maritimeGroups.map(renderGroupCard)}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Join relevant groups to connect with maritime professionals worldwide
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  groupsContainer: {
    padding: 16,
  },
  groupCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  groupDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  memberInfo: {
    alignItems: 'center',
  },
  memberCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0891b2',
  },
  memberLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  groupActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});