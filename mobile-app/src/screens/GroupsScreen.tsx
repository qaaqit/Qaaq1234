import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../utils/api';
import GroupCard from '../components/GroupCard';
import CPSSNavigator from '../components/CPSSNavigator';

interface Group {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  category: string;
  location?: string;
  imageUrl?: string;
  isPrivate: boolean;
  isMember: boolean;
  lastActivity: string;
  createdBy: string;
  tags: string[];
}

const GROUP_TABS = [
  { id: 'cpss', label: 'CPSS Navigator', icon: 'map-marked-alt' },
  { id: 'my-groups', label: 'My Groups', icon: 'users' },
  { id: 'discover', label: 'Discover', icon: 'search' },
];

export default function GroupsScreen() {
  const [activeTab, setActiveTab] = useState('cpss');
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  // Fetch groups
  const { data: groups = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/groups', activeTab],
    queryFn: () => apiRequest(`/api/groups?tab=${activeTab}`),
    enabled: activeTab !== 'cpss',
  });

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: (groupId: string) => 
      apiRequest(`/api/groups/${groupId}/join`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
    },
  });

  // Leave group mutation
  const leaveGroupMutation = useMutation({
    mutationFn: (groupId: string) => 
      apiRequest(`/api/groups/${groupId}/leave`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleGroupPress = (groupId: string) => {
    // Navigate to group detail screen
    console.log('Navigate to group:', groupId);
  };

  const handleJoinGroup = (groupId: string) => {
    joinGroupMutation.mutate(groupId);
  };

  const handleLeaveGroup = (groupId: string) => {
    leaveGroupMutation.mutate(groupId);
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {GROUP_TABS.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[
            styles.tabButton,
            activeTab === tab.id && styles.activeTabButton
          ]}
          onPress={() => setActiveTab(tab.id)}
        >
          <Icon 
            name={tab.icon} 
            size={16} 
            color={activeTab === tab.id ? 'white' : '#6b7280'} 
            style={styles.tabIcon}
          />
          <Text style={[
            styles.tabText,
            activeTab === tab.id && styles.activeTabText
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderGroup = ({ item }: { item: Group }) => (
    <GroupCard
      group={item}
      onPress={() => handleGroupPress(item.id)}
      onJoin={() => handleJoinGroup(item.id)}
      onLeave={() => handleLeaveGroup(item.id)}
      isJoining={joinGroupMutation.isPending}
      isLeaving={leaveGroupMutation.isPending}
    />
  );

  const renderMyGroups = () => {
    const myGroups = groups.filter((group: Group) => group.isMember);
    
    if (myGroups.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="users" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No groups joined yet</Text>
          <Text style={styles.emptySubtitle}>
            Discover and join maritime groups to connect with professionals
          </Text>
          <TouchableOpacity 
            style={styles.discoverButton}
            onPress={() => setActiveTab('discover')}
          >
            <Icon name="search" size={16} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.discoverButtonText}>Discover Groups</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={myGroups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.id}
        style={styles.groupsList}
        contentContainerStyle={styles.groupsContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#0891b2']}
            tintColor="#0891b2"
          />
        }
      />
    );
  };

  const renderDiscoverGroups = () => {
    if (groups.length === 0 && !isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="search" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No groups available</Text>
          <Text style={styles.emptySubtitle}>
            Check back later for new maritime groups
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={groups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.id}
        style={styles.groupsList}
        contentContainerStyle={styles.groupsContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#0891b2']}
            tintColor="#0891b2"
          />
        }
      />
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'cpss':
        return <CPSSNavigator />;
      case 'my-groups':
        return renderMyGroups();
      case 'discover':
        return renderDiscoverGroups();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderTabBar()}
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
  },
  activeTabButton: {
    backgroundColor: '#0891b2',
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
  activeTabText: {
    color: 'white',
  },
  groupsList: {
    flex: 1,
  },
  groupsContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  discoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0891b2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  discoverButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});