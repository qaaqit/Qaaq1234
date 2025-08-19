import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@/hooks/useAuth";
import QBOTChatContainer from "@/components/qbot-chat/QBOTChatContainer";
import QBOTChatHeader from "@/components/qbot-chat/QBOTChatHeader";
import QBOTChatArea from "@/components/qbot-chat/QBOTChatArea";
import QBOTWelcomeState from "@/components/qbot-chat/QBOTWelcomeState";
import QBOTMessageList from "@/components/qbot-chat/QBOTMessageList";
import QBOTInputArea from "@/components/qbot-chat/QBOTInputArea";
import QBOTTypingIndicator from "@/components/qbot-chat/QBOTTypingIndicator";
import type { Message } from "@/components/qbot-chat/QBOTMessageList";
import ImageCarousel from "@/components/image-carousel";
import { QuestionsTab } from "@/components/questions-tab";
import { useToast } from "@/hooks/use-toast";

// Using public asset path for better reliability
const qaaqLogo = "/qaaq-logo.png";

interface QBOTPremiumPageProps {
  user: User;
}

export default function QBOTPremiumPage({ user }: QBOTPremiumPageProps) {
  const [qBotMessages, setQBotMessages] = useState<Message[]>([]);
  const [isQBotTyping, setIsQBotTyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [activeTab, setActiveTab] = useState("chat");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Premium verification - redirect if not premium
  const { data: subscriptionStatus } = useQuery({
    queryKey: ["/api/user/subscription-status"],
    retry: 1,
    staleTime: 10 * 60 * 1000, // 10 minutes cache for premium page
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const isPremium = (subscriptionStatus as any)?.isPremium || (subscriptionStatus as any)?.isSuperUser;

  // Redirect non-premium users to regular QBOT
  useEffect(() => {
    if (subscriptionStatus && !isPremium) {
      setLocation("/qbot");
      toast({
        title: "Premium Required",
        description: "This page is only available for premium users. Redirecting to regular QBOT.",
        variant: "destructive",
      });
    }
  }, [subscriptionStatus, isPremium, setLocation, toast]);

  // Fetch WhatsApp chat history when component loads
  useEffect(() => {
    const fetchWhatsAppHistory = async () => {
      if (!user?.id) return;

      try {
        console.log(`📱 Fetching WhatsApp history for premium user: ${user.id}`);
        const response = await fetch(`/api/whatsapp-history/${encodeURIComponent(user.id)}`);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.chatHistory && data.chatHistory.length > 0) {
            // Convert WhatsApp history to chat messages format
            const historyMessages: Message[] = [];
            
            data.chatHistory.forEach((item: any, index: number) => {
              // Add question as user message
              historyMessages.push({
                id: `whatsapp-q-${index}`,
                text: item.question.content,
                sender: 'user',
                timestamp: new Date(item.question.timestamp),
                attachments: []
              });

              // Add answer as bot message
              historyMessages.push({
                id: `whatsapp-a-${index}`,
                text: item.answer.content,
                sender: 'bot',
                timestamp: new Date(item.answer.timestamp),
                attachments: []
              });
            });

            // Sort messages by timestamp
            historyMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            
            console.log(`✅ Loaded ${historyMessages.length} WhatsApp history messages for premium user`);
            setQBotMessages(historyMessages);
          } else {
            console.log('📱 No WhatsApp history found for premium user:', user.id);
          }
        }
      } catch (error) {
        console.error('❌ Error fetching WhatsApp history for premium user:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchWhatsAppHistory();
  }, [user?.id]);

  // Handle sending messages to QBOT
  const handleSendMessage = async (message: string, attachments?: File[]) => {
    if (!message.trim() && (!attachments || attachments.length === 0)) return;

    // Add user message immediately
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: message,
      sender: 'user',
      timestamp: new Date(),
      attachments: attachments || []
    };

    setQBotMessages(prev => [...prev, userMessage]);
    setIsQBotTyping(true);

    try {
      const formData = new FormData();
      formData.append('message', message);
      formData.append('userId', user.id);
      formData.append('isPremium', 'true'); // Mark as premium user

      // Add attachments if any
      if (attachments && attachments.length > 0) {
        attachments.forEach((file, index) => {
          formData.append(`attachment_${index}`, file);
        });
      }

      const response = await fetch('/api/qbot/chat', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        
        // Add bot response
        const botMessage: Message = {
          id: `bot-${Date.now()}`,
          text: data.response || 'Sorry, I encountered an error. Please try again.',
          sender: 'bot',
          timestamp: new Date(),
          attachments: []
        };

        setQBotMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error('Failed to get response from QBOT');
      }
    } catch (error) {
      console.error('❌ Error sending message to QBOT Premium:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        text: 'Sorry, I encountered an error. Please try again later.',
        sender: 'bot',
        timestamp: new Date(),
        attachments: []
      };

      setQBotMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Message Failed",
        description: "There was an error sending your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsQBotTyping(false);
    }
  };

  // Show loading if still checking subscription status
  if (!subscriptionStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying premium access...</p>
        </div>
      </div>
    );
  }

  // Don't render if not premium (redirect will happen)
  if (!isPremium) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Premium Badge */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-center py-2 text-sm font-medium">
        ⭐ QaaqConnect Premium - Unlimited AI Responses
      </div>

      <QBOTChatContainer>
        <QBOTChatHeader 
          user={user} 
          isPremium={true}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isMenuOpen={isMenuOpen}
          setIsMenuOpen={setIsMenuOpen}
        />
        
        <QBOTChatArea>
          {activeTab === "chat" ? (
            <>
              {qBotMessages.length === 0 && !isLoadingHistory ? (
                <QBOTWelcomeState 
                  user={user} 
                  isPremium={true}
                  onSampleQuestionClick={(question) => handleSendMessage(question)}
                />
              ) : (
                <QBOTMessageList 
                  messages={qBotMessages} 
                  isLoading={isLoadingHistory}
                  isPremium={true}
                />
              )}
              
              {isQBotTyping && <QBOTTypingIndicator />}
              
              <QBOTInputArea 
                onSendMessage={handleSendMessage}
                disabled={isQBotTyping}
                isPremium={true}
                user={user}
              />
            </>
          ) : activeTab === "questions" ? (
            <QuestionsTab />
          ) : activeTab === "carousel" ? (
            <ImageCarousel />
          ) : null}
        </QBOTChatArea>
      </QBOTChatContainer>
    </div>
  );
}