import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import QBOTChatContainer from '@/components/qbot-chat/QBOTChatContainer';
import QBOTChatHeader from '@/components/qbot-chat/QBOTChatHeader';
import QBOTChatArea from '@/components/qbot-chat/QBOTChatArea';
import QBOTWelcomeState from '@/components/qbot-chat/QBOTWelcomeState';
import QBOTMessageList from '@/components/qbot-chat/QBOTMessageList';
import QBOTTypingIndicator from '@/components/qbot-chat/QBOTTypingIndicator';
import QBOTInputArea from '@/components/qbot-chat/QBOTInputArea';
import BottomNav from '@/components/bottom-nav';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { getStoredUser, type User } from '@/lib/auth';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export default function QBOTHome() {
  const [isMinimized, setIsMinimized] = useState(false);
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    // Check if user is logged in
    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  const handleToggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleClose = () => {
    // Instead of closing, navigate to discover if logged in, or login if not
    if (user) {
      setLocation('/discover');
    } else {
      setLocation('/home');
    }
  };

  const handleClear = () => {
    setMessages([]);
    setIsTyping(false);
    toast({
      title: "Chat Cleared",
      description: "Your conversation has been cleared.",
    });
  };

  const handleSendMessage = async (text: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages([...messages, newMessage]);
    
    // Show typing indicator
    setIsTyping(true);
    
    // Call QBOT API
    try {
      const response = await apiRequest('/api/qbot/message', 'POST', { message: text });
      const data = await response.json();
      
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        sender: 'bot',
        timestamp: new Date(data.timestamp)
      };
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error sending message to QBOT:', error);
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-gray-100">
      {/* QBOT Chat as main content */}
      <QBOTChatContainer 
        isOpen={true} 
        onClose={handleClose}
        isMinimized={isMinimized}
      >
        <div className="flex flex-col h-full">
          {/* Gradient Header */}
          <QBOTChatHeader 
            onClear={handleClear}
            onToggleMinimize={handleToggleMinimize}
            isMinimized={isMinimized}
          />
          
          {/* Chat Area with Grid Pattern - hide when minimized */}
          {!isMinimized && (
            <>
              <QBOTChatArea>
                {messages.length === 0 ? (
                  <QBOTWelcomeState />
                ) : (
                  <>
                    <QBOTMessageList messages={messages} />
                    {isTyping && <QBOTTypingIndicator />}
                  </>
                )}
              </QBOTChatArea>
              
              {/* Input Area */}
              <QBOTInputArea 
                onSendMessage={handleSendMessage}
                disabled={isTyping}
              />
            </>
          )}
        </div>
      </QBOTChatContainer>

      {/* Show bottom navigation if user is logged in */}
      {user && <BottomNav user={user} />}
      
      {/* Welcome message when QBOT is minimized */}
      {isMinimized && (
        <div className="flex items-center justify-center h-[calc(100vh-140px)] mt-[120px]">
          <div className="text-center p-8">
            <h1 className="text-4xl font-bold text-navy mb-4">Welcome to QaaqConnect</h1>
            <p className="text-lg text-gray-600 mb-6">
              Click the QBOT chat above to start chatting with our AI assistant
            </p>
            {!user && (
              <button
                onClick={() => setLocation('/home')}
                className="bg-navy text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Login to Access More Features
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}