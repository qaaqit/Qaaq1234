import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DirectMessage {
  id: string;
  userName: string;
  userType: 'sailor' | 'local';
  rank?: string;
  shipName?: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isOnline: boolean;
  distance?: string;
}

const mockMessages: DirectMessage[] = [
  {
    id: '1',
    userName: 'Captain Smith',
    userType: 'sailor',
    rank: 'Captain',
    shipName: 'MV Atlantic',
    lastMessage: 'Thanks for the port information!',
    timestamp: '2 min ago',
    unreadCount: 0,
    isOnline: true,
    distance: '0.5 km',
  },
  {
    id: '2',
    userName: 'Chief Engineer Mike',
    userType: 'sailor',
    rank: 'Chief Engineer',
    shipName: 'MV Pacific',
    lastMessage: 'Are you still in Mumbai port?',
    timestamp: '15 min ago',
    unreadCount: 2,
    isOnline: true,
    distance: '1.2 km',
  },
  {
    id: '3',
    userName: 'Port Agent Raj',
    userType: 'local',
    lastMessage: 'I can help with the documentation',
    timestamp: '1 hour ago',
    unreadCount: 0,
    isOnline: false,
    distance: '2.1 km',
  },
  {
    id: '4',
    userName: '2nd Officer Sarah',
    userType: 'sailor',
    rank: '2nd Officer',
    shipName: 'MV Explorer',
    lastMessage: 'See you at the crew bar tonight',
    timestamp: '3 hours ago',
    unreadCount: 1,
    isOnline: false,
    distance: '0.8 km',
  },
];

export default function DMScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState<DirectMessage[]>(mockMessages);

  const filteredMessages = messages.filter(msg =>
    msg.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (msg.rank && msg.rank.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (msg.shipName && msg.shipName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleMessagePress = (message: DirectMessage) => {
    Alert.alert(
      message.userName,
      `Open chat with ${message.userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Chat', 
          onPress: () => {
            // This would navigate to the chat screen
            Alert.alert('Coming Soon', 'Direct messaging will be available soon!');
          }
        },
      ]
    );
  };

  const renderMessageCard = (message: DirectMessage) => (
    <TouchableOpacity
      key={message.id}
      style={styles.messageCard}
      onPress={() => handleMessagePress(message)}
    >
      <View style={styles.avatarContainer}>
        <View style={[
          styles.avatar,
          { backgroundColor: message.userType === 'sailor' ? '#1e3a8a' : '#0891b2' }
        ]}>
          <Ionicons 
            name={message.userType === 'sailor' ? 'boat' : 'person'} 
            size={24} 
            color="#ffffff" 
          />
        </View>
        {message.isOnline && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
          <Text style={styles.userName}>{message.userName}</Text>
          <Text style={styles.timestamp}>{message.timestamp}</Text>
        </View>
        
        {message.rank && (
          <Text style={styles.userDetails}>
            {message.rank} {message.shipName ? `• ${message.shipName}` : ''}
          </Text>
        )}
        
        <Text style={styles.lastMessage} numberOfLines={1}>
          {message.lastMessage}
        </Text>
        
        <View style={styles.messageFooter}>
          {message.distance && (
            <Text style={styles.distance}>📍 {message.distance}</Text>
          )}
          {message.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{message.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search messages..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Messages List */}
      <ScrollView style={styles.messagesContainer} showsVerticalScrollIndicator={false}>
        {filteredMessages.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Chats</Text>
              <Text style={styles.sectionSubtitle}>
                {filteredMessages.length} conversation{filteredMessages.length !== 1 ? 's' : ''}
              </Text>
            </View>
            {filteredMessages.map(renderMessageCard)}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No messages found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try a different search term' : 'Start a conversation with nearby sailors'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={() => {
        Alert.alert('New Chat', 'Search for nearby sailors to start a conversation');
      }}>
        <Ionicons name="add" size={24} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  searchContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  messagesContainer: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  messageCard: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  timestamp: {
    fontSize: 12,
    color: '#6b7280',
  },
  userDetails: {
    fontSize: 14,
    color: '#0891b2',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 8,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distance: {
    fontSize: 12,
    color: '#6b7280',
  },
  unreadBadge: {
    backgroundColor: '#0891b2',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0891b2',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
});