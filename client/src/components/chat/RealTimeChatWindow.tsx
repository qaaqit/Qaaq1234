import { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, MoreVertical } from 'lucide-react';
import { websocketService } from '@/services/websocket';
import { apiRequest } from '@/lib/queryClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

interface Message {
  id: string;
  connectionId: string;
  senderId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface ChatWindowProps {
  connectionId: string;
  recipientName: string;
  recipientRank?: string;
  onClose: () => void;
  currentUserId: string;
}

export default function RealTimeChatWindow({ 
  connectionId, 
  recipientName, 
  recipientRank,
  onClose,
  currentUserId 
}: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const queryClient = useQueryClient();

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['chat-messages', connectionId],
    queryFn: async () => {
      const response = await apiRequest(`/api/chat/messages/${connectionId}`);
      return response.json();
    },
    refetchInterval: !isConnected ? 5000 : false // Poll when not connected
  });

  // Initialize WebSocket connection
  useEffect(() => {
    websocketService.connect();
    
    const handleConnectionChange = (connected: boolean) => {
      setIsConnected(connected);
    };

    const handleNewMessage = (data: any) => {
      if (data.connectionId === connectionId) {
        // Add new message to cache
        queryClient.setQueryData(['chat-messages', connectionId], (old: any) => {
          return old ? [...old, data.message] : [data.message];
        });
        
        // Mark as read if window is focused
        if (document.hasFocus()) {
          markMessageAsRead(data.message.id);
        }
      }
    };

    const handleMessageSent = (data: any) => {
      if (data.connectionId === connectionId) {
        // Update message cache
        queryClient.setQueryData(['chat-messages', connectionId], (old: any) => {
          return old ? [...old, data.message] : [data.message];
        });
      }
    };

    const handleUserTyping = (data: any) => {
      if (data.connectionId === connectionId && data.userId !== currentUserId) {
        setOtherUserTyping(data.isTyping);
        
        if (data.isTyping) {
          setTimeout(() => setOtherUserTyping(false), 3000);
        }
      }
    };

    websocketService.onConnectionChange(handleConnectionChange);
    websocketService.onMessage('new_message', handleNewMessage);
    websocketService.onMessage('message_sent', handleMessageSent);
    websocketService.onMessage('user_typing', handleUserTyping);

    return () => {
      websocketService.offConnectionChange(handleConnectionChange);
      websocketService.offMessage('new_message');
      websocketService.offMessage('message_sent');
      websocketService.offMessage('user_typing');
    };
  }, [connectionId, currentUserId, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const markMessageAsRead = async (messageId: string) => {
    try {
      await apiRequest(`/api/chat/messages/${messageId}/read`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    
    if (isConnected) {
      // Send via WebSocket for real-time delivery
      websocketService.sendMessage(connectionId, messageText);
    } else {
      // Fallback to HTTP API
      try {
        const response = await apiRequest('/api/chat/message', {
          method: 'POST',
          body: JSON.stringify({
            connectionId,
            message: messageText
          })
        });
        
        if (response.ok) {
          const messageData = await response.json();
          queryClient.setQueryData(['chat-messages', connectionId], (old: any) => {
            return old ? [...old, messageData] : [messageData];
          });
        }
      } catch (error) {
        console.error('Failed to send message via HTTP:', error);
      }
    }
  };

  const handleTyping = (text: string) => {
    setNewMessage(text);
    
    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      websocketService.sendTypingIndicator(connectionId, true);
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      websocketService.sendTypingIndicator(connectionId, false);
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h3 className="font-semibold text-gray-900">{recipientName}</h3>
            {recipientRank && (
              <p className="text-sm text-gray-500">{recipientRank}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} 
               title={isConnected ? 'Connected' : 'Offline'} />
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <MoreVertical size={18} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message: Message) => {
          const isMyMessage = message.senderId === currentUserId;
          return (
            <div
              key={message.id}
              className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  isMyMessage
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm">{message.message}</p>
                <p className={`text-xs mt-1 ${
                  isMyMessage ? 'text-orange-100' : 'text-gray-500'
                }`}>
                  {format(new Date(message.createdAt), 'HH:mm')}
                </p>
              </div>
            </div>
          );
        })}
        
        {otherUserTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-1">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-xs text-gray-500 ml-2">typing...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full resize-none border border-gray-300 rounded-lg px-4 py-2 pr-12 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              rows={1}
              style={{
                minHeight: '42px',
                maxHeight: '120px',
                height: 'auto'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = '42px';
                target.style.height = target.scrollHeight + 'px';
              }}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="p-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
        
        {!isConnected && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            Reconnecting... Messages will be sent when connection is restored.
          </p>
        )}
      </div>
    </div>
  );
}