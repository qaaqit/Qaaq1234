import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  model?: string;
}

interface AIModel {
  id: string;
  name: string;
  enabled: boolean;
  icon: string;
  color: string;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I am QBOT, your maritime AI assistant. I can help you with ChatGPT, Gemini, and Deepseek models. How can I assist you today?',
      sender: 'bot',
      timestamp: new Date(),
      model: 'System',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const [aiModels, setAiModels] = useState<AIModel[]>([
    { id: 'chatgpt', name: 'ChatGPT', enabled: true, icon: 'robot', color: '#10a37f' },
    { id: 'gemini', name: 'Gemini', enabled: true, icon: 'gem', color: '#4285f4' },
    { id: 'deepseek', name: 'Deepseek', enabled: false, icon: 'brain', color: '#7c3aed' },
  ]);

  const toggleModel = (modelId: string) => {
    setAiModels(prev =>
      prev.map(model =>
        model.id === modelId ? { ...model, enabled: !model.enabled } : model
      )
    );
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const enabledModels = aiModels.filter(m => m.enabled);
    if (enabledModels.length === 0) {
      Alert.alert('No Models Selected', 'Please enable at least one AI model');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Simulate AI responses for each enabled model
    setTimeout(() => {
      const responses = enabledModels.map(model => ({
        id: `${Date.now()}-${model.id}`,
        text: `[${model.name}]: This is a simulated response from ${model.name}. In production, this would connect to your backend API endpoint for real AI responses.`,
        sender: 'bot' as const,
        timestamp: new Date(),
        model: model.name,
      }));

      setMessages(prev => [...prev, ...responses]);
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }, 1500);
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageContainer,
        item.sender === 'user' ? styles.userMessage : styles.botMessage,
      ]}
    >
      {item.model && item.sender === 'bot' && (
        <Text style={styles.modelLabel}>{item.model}</Text>
      )}
      <Text style={styles.messageText}>{item.text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.modelsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {aiModels.map(model => (
            <TouchableOpacity
              key={model.id}
              style={[
                styles.modelChip,
                { borderColor: model.color },
                model.enabled && { backgroundColor: model.color },
              ]}
              onPress={() => toggleModel(model.id)}
            >
              <FontAwesome5
                name={model.icon}
                size={14}
                color={model.enabled ? 'white' : model.color}
              />
              <Text
                style={[
                  styles.modelChipText,
                  { color: model.enabled ? 'white' : model.color },
                ]}
              >
                {model.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={loading ? "AI is thinking..." : "Ask me anything about maritime..."}
          placeholderTextColor="#9ca3af"
          multiline
          maxHeight={100}
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.sendButton, loading && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={loading}
        >
          <FontAwesome5 
            name={loading ? "spinner" : "paper-plane"} 
            size={20} 
            color="white" 
          />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef3e7',
  },
  modelsContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  modelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 2,
    marginRight: 8,
    gap: 6,
  },
  modelChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  messagesContainer: {
    padding: 15,
    paddingBottom: 10,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#ea580c',
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messageText: {
    fontSize: 16,
    color: '#1f2937',
  },
  modelLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f9fafb',
    marginRight: 10,
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ea580c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
});