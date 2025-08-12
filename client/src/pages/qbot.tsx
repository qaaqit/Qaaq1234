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
          'Authorization': `Bearer ${localStorage.getItem('qaaq_token')}`
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
          'Authorization': `Bearer ${localStorage.getItem('qaaq_token')}`
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
              {/* WATI WhatsApp Widget Button */}
              <button
                onClick={() => {
                  if (typeof (window as any).CreateWhatsappChatWidget === 'function') {
                    // Trigger WATI widget if available
                    const watiButton = document.querySelector('.wati-chat-button') as HTMLElement;
                    if (watiButton) {
                      watiButton.click();
                    }
                  } else {
                    // Fallback to direct WhatsApp
                    window.open('https://wa.me/917208878008', '_blank');
                  }
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center transition-colors text-white shadow-md"
                title="WhatsApp QBOT"
              >
                <svg 
                  viewBox="0 0 24 24" 
                  fill="currentColor" 
                  className="w-4 h-4 sm:w-5 sm:h-5"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.516"/>
                </svg>
              </button>
              
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
                <div className="flex flex-col h-full bg-white overflow-hidden border-l border-r border-orange-500">
                  {/* Minimalist Header */}
                  <QBOTChatHeader 
                    onClear={handleClearQBotChat}
                    isAdmin={user?.isAdmin}
                  />
                  
                  {/* Chat Area with Engineering Grid Background */}
                  <QBOTChatArea>
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
                  
                  {/* Orange line separator between chat area and input */}
                  <div className="border-t-2 border-orange-500"></div>
                  
                  {/* Input Area flush with carousel - with engineering grid background */}
                  <div>
                    <QBOTInputArea 
                      onSendMessage={handleSendQBotMessage}
                      disabled={isQBotTyping}
                    />
                  </div>
                </div>
              </QBOTChatContainer>
            </div>

            {/* Orange line separator above carousel */}
            <div className="border-t-2 border-orange-500"></div>
            
            {/* Image Carousel - Flush with chat box */}
            <div className="h-[200px]">
              <ImageCarousel className="h-full" />
            </div>
          </TabsContent>

          {/* Questions Tab Content */}
          <TabsContent value="questions" className="flex-1 flex flex-col">
            {/* Image Carousel at top - Flush with content */}
            <div className="h-[200px]">
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