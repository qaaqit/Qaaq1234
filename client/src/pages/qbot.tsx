import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import type { User } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserDropdown from "@/components/user-dropdown";
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
import qaaqLogo from "@assets/qaaq-logo.png";

interface QBOTPageProps {
  user: User;
}

export default function QBOTPage({ user }: QBOTPageProps) {
  const [qBotMessages, setQBotMessages] = useState<Message[]>([]);
  const [isQBotTyping, setIsQBotTyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [activeTab, setActiveTab] = useState("chat");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch WhatsApp chat history when component loads
  useEffect(() => {
    const fetchWhatsAppHistory = async () => {
      if (!user?.id) return;

      try {
        console.log(`📱 Fetching WhatsApp history for user: ${user.id}`);
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

            setQBotMessages(historyMessages);
            
            console.log(`✅ Loaded ${data.chatHistory.length} WhatsApp Q&A pairs`);
          } else {
            console.log(`📱 No WhatsApp history found for user: ${user.id}`);
          }
        }
      } catch (error) {
        console.error('Error fetching WhatsApp history:', error);
        // Don't show error toast, just continue with empty history
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchWhatsAppHistory();
  }, [user?.id, toast]);

  const handleSendQBotMessage = async (messageText: string, attachments?: string[], isPrivate?: boolean) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
      attachments: attachments || []
    };

    setQBotMessages(prev => [...prev, newMessage]);
    setIsQBotTyping(true);

    try {
      // Call QBOT API for AI-powered response
      const response = await fetch('/api/qbot/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ message: messageText, attachments: attachments || [], isPrivate: isPrivate || false })
      });

      if (response.ok) {
        const data = await response.json();
        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: data.response,
          sender: 'bot',
          timestamp: new Date()
        };
        
        setQBotMessages(prev => [...prev, botResponse]);
      } else {
        // Fallback response if API fails
        const fallbackResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: "I apologize, but I'm having trouble connecting to my AI systems at the moment. Please try again in a few moments. In the meantime, feel free to check the Questions tab for maritime Q&A from our community.",
          sender: 'bot',
          timestamp: new Date()
        };
        
        setQBotMessages(prev => [...prev, fallbackResponse]);
        toast({
          title: "Connection Issue",
          description: "QBOT is temporarily unavailable. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('QBOT API error:', error);
      
      // Fallback response on network error
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm experiencing connection difficulties right now. Please check your internet connection and try again. You can also explore the Questions tab for maritime knowledge from our community.",
        sender: 'bot',
        timestamp: new Date()
      };
      
      setQBotMessages(prev => [...prev, errorResponse]);
      toast({
        title: "Network Error",
        description: "Unable to reach QBOT services.",
        variant: "destructive"
      });
    } finally {
      setIsQBotTyping(false);
    }
  };

  const handleClearQBotChat = async () => {
    if (qBotMessages.length === 0) {
      return;
    }

    try {
      // Park chat history in database before clearing
      const response = await fetch('/api/qbot/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ messages: qBotMessages })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Clear local chat
        setQBotMessages([]);
        setIsQBotTyping(false);

        // Log shareable links to console for verification
        console.log('📚 QBOT Chat History Parked:');
        data.parkedQuestions?.forEach((q: any) => {
          console.log(`   ${q.semm}: ${q.shareableLink}`);
        });
        
      } else {
        // Fallback: clear chat even if parking fails
        setQBotMessages([]);
        setIsQBotTyping(false);
      }
    } catch (error) {
      console.error('Error parking chat history:', error);
      
      // Fallback: clear chat even if parking fails
      setQBotMessages([]);
      setIsQBotTyping(false);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50 flex flex-col">
      {/* Header - Exactly Same as Map Radar Page */}
      <header className="bg-white text-black shadow-md relative overflow-hidden flex-shrink-0 z-[1002] border-b-2 border-orange-400">
        <div className="absolute inset-0 bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 opacity-50"></div>
        
        <div className="relative z-10 px-2 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <button 
              onClick={() => setLocation('/')}
              className="flex items-center space-x-2 sm:space-x-3 hover:bg-white/10 rounded-lg p-1 sm:p-2 transition-colors min-w-0 flex-shrink-0"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                <img src={qaaqLogo} alt="QAAQ Logo" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent whitespace-nowrap">QaaqConnect</h1>
                <p className="text-xs sm:text-sm text-gray-600 italic font-medium whitespace-nowrap">QBOT AI Assistant</p>
              </div>
            </button>
            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
              <UserDropdown user={user} onLogout={() => window.location.reload()} />
            </div>
          </div>
        </div>
      </header>
      {/* Main Content Area - Chat + Carousel + Questions */}
      <div className="flex-1 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          {/* Tab Navigation - Red/Orange Signature Bar */}
          <div className="bg-gradient-to-r from-red-500 to-orange-500 shadow-lg">
            <div className="px-4 py-3">
              <TabsList className="grid w-full grid-cols-2 bg-white/10 backdrop-blur-sm border-0 rounded-lg p-1">
                <TabsTrigger 
                  value="chat" 
                  className="data-[state=active]:bg-white data-[state=active]:text-red-600 text-white hover:bg-white/20 font-semibold transition-all duration-200 rounded-md py-2"
                >
                  QBOT Chat
                </TabsTrigger>
                <TabsTrigger 
                  value="questions" 
                  className="data-[state=active]:bg-white data-[state=active]:text-red-600 text-white hover:bg-white/20 font-semibold transition-all duration-200 rounded-md py-2"
                >QuestionBank</TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* Chat Tab Content */}
          <TabsContent value="chat" className="flex-1 flex flex-col">
            {/* QBOT Chat Container - No padding to flush with red bar */}
            <div className="flex-1">
              <QBOTChatContainer>
                <div className="flex flex-col h-full bg-white overflow-hidden">
                  {/* Minimalist Header */}
                  <QBOTChatHeader 
                    onClear={handleClearQBotChat}
                    isAdmin={user?.isAdmin}
                  />
                  
                  {/* Chat Area with Engineering Grid Background */}
                  <QBOTChatArea className="engineering-grid">
                    <div className="flex flex-col h-full p-4">
                      {/* Messages or Welcome State */}
                      {isLoadingHistory ? (
                        <div className="flex-1 flex items-center justify-center">
                          <div className="text-center space-y-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                            <p className="text-gray-600">Loading your chat history...</p>
                          </div>
                        </div>
                      ) : qBotMessages.length === 0 ? (
                        <QBOTWelcomeState />
                      ) : (
                        <>
                          {/* WhatsApp History Indicator */}
                          {qBotMessages.some(msg => msg.id.startsWith('whatsapp-')) && (
                            <div className="px-4 py-2 bg-orange-50 border border-orange-100 rounded-lg mb-4">
                              <p className="text-sm text-orange-700 text-center flex items-center justify-center gap-2">
                                <span>📱</span>
                                <span>Your previous WhatsApp conversations with QBOT</span>
                              </p>
                            </div>
                          )}
                          <QBOTMessageList messages={qBotMessages} />
                          {isQBotTyping && <QBOTTypingIndicator />}
                        </>
                      )}
                    </div>
                  </QBOTChatArea>
                  
                  {/* Input Area flush with carousel - with engineering grid background */}
                  <div className="p-4 engineering-grid">
                    <QBOTInputArea 
                      onSendMessage={handleSendQBotMessage}
                      disabled={isQBotTyping}
                    />
                  </div>
                </div>
              </QBOTChatContainer>
            </div>

            {/* Image Carousel - Positioned lower with more height */}
            <div className="h-[200px] pt-8">
              <ImageCarousel className="h-full" />
            </div>
          </TabsContent>

          {/* Questions Tab Content */}
          <TabsContent value="questions" className="flex-1 flex flex-col">
            {/* Image Carousel at top - Positioned lower with more height */}
            <div className="h-[200px] pt-8">
              <ImageCarousel className="h-full" />
            </div>
            
            {/* Questions Tab below carousel with improved layout */}
            <div className="flex-1 overflow-auto bg-white px-4 py-4">
              <div className="max-w-6xl mx-auto">
                <QuestionsTab />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}