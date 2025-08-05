import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qbotApi } from '../utils/api';

interface QBOTMessage {
  id: string;
  content: string;
  isFromUser: boolean;
  timestamp: Date;
  messageType?: 'text' | 'koihai' | 'help' | 'error' | 'system';
}

interface QBOTChatOverlayProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function QBOTChatOverlay({ isVisible, onClose }: QBOTChatOverlayProps) {
  const [message, setMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const queryClient = useQueryClient();
  const slideAnim = useRef(new Animated.Value(300)).current;

  // Animate modal in/out
  React.useEffect(() => {
    if (isVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: 300,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [isVisible]);

  // Fetch chat history
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['/api/qbot/history'],
    queryFn: () => qbotApi.getChatHistory(),
    enabled: isVisible,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => qbotApi.sendMessage(content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/qbot/history'] });
      setMessage('');
      // Auto-scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
  });

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
        <Icon name="robot" size={40} color="white" />
      </View>
      
      <Text style={styles.welcomeTitle}>QBOT AI Assistant</Text>
      <Text style={styles.welcomeSubtitle}>
        Ready to help with maritime questions and "Koi Hai?" discovery!
      </Text>

      <View style={styles.suggestionsContainer}>
        {[
          '🌊 Koi Hai?',
          '⚓ Help',
          '📜 Regulations',
          '🚢 Ships'
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
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.container,
            { 
              transform: [{ translateY: slideAnim }],
              height: isMinimized ? 60 : '70%'
            }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.statusIndicator}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>QBOT Online</Text>
              </View>
            </View>
            
            <View style={styles.headerControls}>
              <TouchableOpacity 
                style={styles.controlButton}
                onPress={() => setIsMinimized(!isMinimized)}
              >
                <Icon 
                  name={isMinimized ? 'chevron-up' : 'chevron-down'} 
                  size={16} 
                  color="white" 
                />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.controlButton} onPress={onClose}>
                <Icon name="times" size={16} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content - only show if not minimized */}
          {!isMinimized && (
            <>
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
                    placeholder="Ask QBOT anything..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    maxLength={500}
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
                      <Icon name="spinner" size={16} color="white" />
                    ) : (
                      <Icon name="paper-plane" size={16} color="white" />
                    )}
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    backgroundColor: '#22c55e',
    marginRight: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  headerControls: {
    flexDirection: 'row',
    gap: 8,
  },
  controlButton: {
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ff6b35',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: 'rgba(8, 145, 178, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(8, 145, 178, 0.3)',
  },
  suggestionText: {
    color: '#0891b2',
    fontWeight: '500',
    fontSize: 12,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  botMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 2,
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
    fontSize: 14,
    lineHeight: 18,
  },
  userText: {
    color: 'white',
  },
  botText: {
    color: '#374151',
  },
  timestamp: {
    fontSize: 10,
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
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#374151',
    maxHeight: 80,
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
});