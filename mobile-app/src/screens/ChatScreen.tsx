import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://your-qaaqconnect-api.replit.app'; // Replace with your actual API URL

interface ChatItem {
  id: string;
  userId: string;
  userName: string;
  userType: 'sailor' | 'local';
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  userRank?: string;
  userShip?: string;
  userCity?: string;
  whatsAppProfilePictureUrl?: string;
}

interface ChatScreenProps {
  navigation: any;
}

export default function ChatScreen({ navigation }: ChatScreenProps) {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;

      // For now, we'll create mock chat data based on nearby users
      // In a real implementation, this would fetch actual chat history
      const response = await fetch(`${API_BASE_URL}/api/users/search`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const users = await response.json();
        // Convert users to chat items (mock data for demonstration)
        const mockChats: ChatItem[] = users.slice(0, 10).map((user: any) => ({
          id: `chat_${user.id}`,
          userId: user.id,
          userName: user.fullName,
          userType: user.userType,
          userRank: user.rank,
          userShip: user.shipName,
          userCity: user.city || user.port,
          whatsAppProfilePictureUrl: user.whatsAppProfilePictureUrl,
          lastMessage: 'Tap to start conversation',
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
        }));
        setChats(mockChats);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
      Alert.alert('Error', 'Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchChats();
    setRefreshing(false);
  };

  const handleChatPress = (chat: ChatItem) => {
    navigation.navigate('DM', { 
      userId: chat.userId, 
      userName: chat.userName 
    });
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '';
    
    const date = new Date(timeString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const renderChatItem = ({ item }: { item: ChatItem }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => handleChatPress(item)}
    >
      <View style={styles.chatContent}>
        {/* User Avatar */}
        <View style={styles.avatarContainer}>
          {item.whatsAppProfilePictureUrl ? (
            <Image 
              source={{ uri: item.whatsAppProfilePictureUrl }} 
              style={styles.avatarImage}
            />
          ) : (
            <View style={[
              styles.avatarPlaceholder,
              { backgroundColor: item.userType === 'sailor' ? '#0891b2' : '#f59e0b' }
            ]}>
              <Icon 
                name={item.userType === 'sailor' ? 'directions-boat' : 'location-city'} 
                size={20} 
                color="#ffffff" 
              />
            </View>
          )}
          
          {/* Online indicator */}
          <View style={styles.onlineIndicator} />
        </View>

        {/* Chat Info */}
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.userName}
            </Text>
            <Text style={styles.messageTime}>
              {formatTime(item.lastMessageTime)}
            </Text>
          </View>
          
          <View style={styles.chatDetails}>
            <View style={styles.userDetails}>
              {item.userRank && (
                <Text style={styles.userRank}>{item.userRank}</Text>
              )}
              {item.userShip && (
                <Text style={styles.userShip} numberOfLines={1}>
                  {item.userShip}
                </Text>
              )}
              {item.userCity && (
                <Text style={styles.userLocation} numberOfLines={1}>
                  📍 {item.userCity}
                </Text>
              )}
            </View>
          </View>

          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage || 'No messages yet'}
          </Text>
        </View>

        {/* Chat Actions */}
        <View style={styles.chatActions}>
          {item.unreadCount ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{item.unreadCount}</Text>
            </View>
          ) : null}
          
          <Icon name="chevron-right" size={20} color="#94a3b8" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="chat-bubble-outline" size={64} color="#cbd5e1" />
      <Text style={styles.emptyStateTitle}>No Conversations Yet</Text>
      <Text style={styles.emptyStateSubtitle}>
        Start discovering nearby sailors in the "Koi Hai?" tab to begin conversations
      </Text>
      <TouchableOpacity
        style={styles.discoverButton}
        onPress={() => navigation.navigate('Koi Hai?')}
      >
        <Text style={styles.discoverButtonText}>Discover Sailors</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Icon name="search" size={24} color="#0891b2" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Icon name="more-vert" size={24} color="#0891b2" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat List */}
      <FlatList
        data={chats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        style={styles.chatList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0891b2']}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('Koi Hai?')}
        >
          <Icon name="person-search" size={20} color="#ffffff" />
          <Text style={styles.quickActionText}>Find Sailors</Text>
        </TouchableOpacity>
      </View>
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
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 4,
  },
  chatList: {
    flex: 1,
  },
  chatItem: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  chatContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  messageTime: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 8,
  },
  chatDetails: {
    marginBottom: 4,
  },
  userDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  userRank: {
    fontSize: 12,
    color: '#0891b2',
    fontWeight: '500',
    marginRight: 8,
  },
  userShip: {
    fontSize: 12,
    color: '#64748b',
    marginRight: 8,
  },
  userLocation: {
    fontSize: 12,
    color: '#94a3b8',
  },
  lastMessage: {
    fontSize: 14,
    color: '#64748b',
  },
  chatActions: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  unreadCount: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 64,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  discoverButton: {
    backgroundColor: '#0891b2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  discoverButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  quickActions: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0891b2',
    paddingVertical: 12,
    borderRadius: 8,
  },
  quickActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});