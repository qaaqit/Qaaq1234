import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

interface QBOTMessage {
  id: string;
  content: string;
  isFromUser: boolean;
  timestamp: Date;
  messageType?: 'text' | 'koihai' | 'help' | 'error' | 'system';
}

export default function QBOTScreen() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const queryClient = useQueryClient();

  // Fetch chat history
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['/api/qbot/history'],
    queryFn: () => apiRequest('/api/qbot/history'),
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => 
      apiRequest('/api/qbot/chat', {
        method: 'POST',
        body: { message: content, timestamp: new Date().toISOString() }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/qbot/history'] });
      setMessage('');
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to send message. Please try again.');
      console.error('Send message error:', error);
    },
  });

  // Clear chat mutation
  const clearChatMutation = useMutation({
    mutationFn: () => apiRequest('/api/qbot/history', { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/qbot/history'] });
    },
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = () => {
    if (message.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    if (!sendMessageMutation.isPending) {
      sendMessageMutation.mutate(suggestion);
    }
  };

  const renderMessage = ({ item: msg }: { item: QBOTMessage }) => (
    <View style={[
      styles.messageContainer,
      msg.isFromUser ? styles.userMessage : styles.botMessage
    ]}>
      <View style={[
        styles.messageBubble,
        msg.isFromUser ? styles.userBubble : styles.botBubble
      ]}>
        <Text style={[
          styles.messageText,
          msg.isFromUser ? styles.userText : styles.botText
        ]}>
          {msg.content}
        </Text>
      </View>
      <Text style={[
        styles.timestamp,
        msg.isFromUser ? styles.userTimestamp : styles.botTimestamp
      ]}>
        {new Date(msg.timestamp).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </Text>
    </View>
  );

  const renderWelcomeScreen = () => (
    <View style={styles.welcomeContainer}>
      <View style={styles.logoContainer}>
        <Icon name="robot" size={60} color="white" />
      </View>
      
      <Text style={styles.welcomeTitle}>Welcome to QBOT AI</Text>
      <Text style={styles.welcomeSubtitle}>
        Your maritime AI assistant is ready to help!{'\n\n'}
        Ask questions about shipping, regulations, career guidance, or say "Koi Hai?" to find nearby sailors.
      </Text>

      <View style={styles.suggestionsContainer}>
        {[
          '🌊 Koi Hai?',
          '⚓ Career Advice', 
          '📜 Regulations',
          '🚢 Ship Questions'
        ].map((suggestion, index) => (
          <TouchableOpacity
            key={index}
            style={styles.suggestionChip}
            onPress={() => handleSuggestionPress(suggestion)}
          >
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.statusIndicator}>
            <View style={[
              styles.statusDot, 
              { backgroundColor: isConnected ? '#22c55e' : '#ef4444' }
            ]} />
            <Text style={styles.statusText}>
              {isConnected ? 'QBOT Online' : 'QBOT Offline'}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.clearButton}
          onPress={() => clearChatMutation.mutate()}
        >
          <Icon name="trash" size={16} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Messages or Welcome Screen */}
      {messages.length === 0 && !isLoading ? (
        renderWelcomeScreen()
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />
      )}

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Type a message..."
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={1000}
            editable={!sendMessageMutation.isPending}
          />
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!message.trim() || sendMessageMutation.isPending) && styles.sendButtonDisabled
            ]}
            onPress={handleSend}
            disabled={!message.trim() || sendMessageMutation.isPending}
          >
            {sendMessageMutation.isPending ? (
              <Icon name="spinner" size={20} color="white" />
            ) : (
              <Icon name="paper-plane" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#0891b2',
  },
  headerLeft: {
    flex: 1,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  clearButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  welcomeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ff6b35',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: 'rgba(8, 145, 178, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(8, 145, 178, 0.3)',
    marginBottom: 8,
  },
  suggestionText: {
    color: '#0891b2',
    fontWeight: '500',
    fontSize: 14,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  botMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 4,
  },
  userBubble: {
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#f3f4f6',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userText: {
    color: 'white',
  },
  botText: {
    color: '#374151',
  },
  timestamp: {
    fontSize: 12,
    color: '#9ca3af',
    paddingHorizontal: 4,
  },
  userTimestamp: {
    textAlign: 'right',
  },
  botTimestamp: {
    textAlign: 'left',
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
    maxHeight: 120,
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
});