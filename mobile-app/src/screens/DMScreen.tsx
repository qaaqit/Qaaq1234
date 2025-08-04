import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface Message {
  id: string;
  text: string;
  timestamp: string;
  isOwn: boolean;
}

interface DMScreenProps {
  navigation: any;
  route: {
    params: {
      userId: string;
      userName: string;
    };
  };
}

export default function DMScreen({ navigation, route }: DMScreenProps) {
  const { userId, userName } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');

  useEffect(() => {
    // Load initial messages (mock data for now)
    setMessages([
      {
        id: '1',
        text: 'Hello! Are you currently in port?',
        timestamp: new Date().toISOString(),
        isOwn: false,
      },
      {
        id: '2',
        text: 'Yes, I\'m at Mumbai Port until tomorrow.',
        timestamp: new Date().toISOString(),
        isOwn: true,
      },
    ]);
  }, []);

  const sendMessage = () => {
    if (!messageText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      timestamp: new Date().toISOString(),
      isOwn: true,
    };

    setMessages(prev => [...prev, newMessage]);
    setMessageText('');
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.isOwn ? styles.ownMessage : styles.otherMessage
    ]}>
      <View style={[
        styles.messageBubble,
        item.isOwn ? styles.ownBubble : styles.otherBubble
      ]}>
        <Text style={[
          styles.messageText,
          item.isOwn ? styles.ownMessageText : styles.otherMessageText
        ]}>
          {item.text}
        </Text>
        <Text style={[
          styles.messageTime,
          item.isOwn ? styles.ownMessageTime : styles.otherMessageTime
        ]}>
          {formatTime(item.timestamp)}
        </Text>
      </View>
    </View>
  );

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
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{userName}</Text>
          <Text style={styles.headerSubtitle}>Maritime Professional</Text>
        </View>

        <TouchableOpacity style={styles.callButton}>
          <Icon name="phone" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          showsVerticalScrollIndicator={false}
        />

        {/* Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type a message..."
              placeholderTextColor="#94a3b8"
              multiline
              maxLength={500}
            />
            <TouchableOpacity style={styles.attachButton}>
              <Icon name="attach-file" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!messageText.trim()}
          >
            <Icon name="send" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    backgroundColor: '#0891b2',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  callButton: {
    padding: 8,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginVertical: 4,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  ownBubble: {
    backgroundColor: '#0891b2',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 4,
  },
  ownMessageText: {
    color: '#ffffff',
  },
  otherMessageText: {
    color: '#1e293b',
  },
  messageTime: {
    fontSize: 12,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#94a3b8',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    paddingVertical: 8,
  },
  attachButton: {
    padding: 8,
    marginLeft: 4,
  },
  sendButton: {
    backgroundColor: '#0891b2',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
});