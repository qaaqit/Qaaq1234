import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ChevronUp, Crown } from "lucide-react";
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
// Using public asset path for better reliability
const qaaqLogo = "/qaaq-logo.png";

interface QBOTPageProps {
  user: User;
}

export default function QBOTPage({ user }: QBOTPageProps) {
  const [qBotMessages, setQBotMessages] = useState<Message[]>([]);
  const [isQBotTyping, setIsQBotTyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [activeTab, setActiveTab] = useState("chat");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showRoadblock, setShowRoadblock] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Check user premium status - required for QBOT access
  const { data: subscriptionStatus, isLoading: isCheckingPremium } = useQuery({
    queryKey: ["/api/user/subscription-status"],
    retry: 1,
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const isPremium = (subscriptionStatus as any)?.isPremium || (subscriptionStatus as any)?.isSuperUser;
  const isPremiumUser = subscriptionStatus && isPremium;

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

  const handleSendQBotMessage = async (messageText: string, attachments?: string[], isPrivate?: boolean, aiModels?: string[]) => {
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
      const response = await fetch('/api/qbot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          message: messageText, 
          attachments: attachments,
          isPrivate: isPrivate,
          aiModels: aiModels || ['chatgpt'],
          isPremium: true
        })
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
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
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

  // Show loading while checking premium status
  if (isCheckingPremium) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying premium access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[90vh] bg-gradient-to-br from-orange-50 via-white to-yellow-50 flex flex-col">
      {/* Header - Exactly Same as Map Radar Page */}
      <header className="bg-white text-black shadow-md relative overflow-hidden flex-shrink-0 z-[1002] border-b-2 border-orange-400">
        <div className="absolute inset-0 bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 opacity-50"></div>
        
        <div className="relative z-10 px-2 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-shrink-0">
              <DropdownMenu onOpenChange={setIsMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="p-1 h-auto w-auto rounded-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                    data-testid="button-main-menu"
                  >
                    <div className="flex items-center space-x-2">
                      <ChevronDown className={`w-4 h-4 text-white transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
                      <div className="w-10 h-10 rounded-full bg-white border-2 border-white shadow-lg flex items-center justify-center">
                        <img 
                          src={qaaqLogo} 
                          alt="QAAQ Logo" 
                          className="w-full h-full rounded-full object-cover"
                        />
                      </div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 bg-white border border-gray-200 shadow-lg rounded-lg">
                  <DropdownMenuItem 
                    onClick={() => setLocation("/")}
                    className="cursor-pointer flex items-center space-x-3 px-4 py-3 hover:bg-orange-50 transition-colors"
                    data-testid="menu-item-home"
                  >
                    <i className="fas fa-home text-orange-600 w-4"></i>
                    <span className="text-gray-700 font-medium">Home</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setLocation("/glossary")}
                    className="cursor-pointer flex items-center space-x-3 px-4 py-3 hover:bg-orange-50 transition-colors"
                    data-testid="menu-item-dictionary"
                  >
                    <i className="fas fa-ship text-orange-600 w-4"></i>
                    <span className="text-gray-700 font-medium">Shipping Dictionary</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setLocation("/question-bank")}
                    className="cursor-pointer flex items-center space-x-3 px-4 py-3 hover:bg-orange-50 transition-colors"
                    data-testid="menu-item-questions"
                  >
                    <i className="fas fa-question-circle text-orange-600 w-4"></i>
                    <span className="text-gray-700 font-medium">QuestionBank</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setLocation("/machine-tree")}
                    className="cursor-pointer flex items-center space-x-3 px-4 py-3 hover:bg-orange-50 transition-colors"
                    data-testid="menu-item-machine-tree"
                  >
                    <i className="fas fa-sitemap text-orange-600 w-4"></i>
                    <span className="text-gray-700 font-medium">Machine Tree</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setLocation("/premium")}
                    className="cursor-pointer flex items-center space-x-3 px-4 py-3 hover:bg-orange-50 transition-colors"
                    data-testid="menu-item-premium"
                  >
                    <i className="fas fa-crown text-orange-600 w-4"></i>
                    <span className="text-gray-700 font-medium">Premium Subscription</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="min-w-0 flex items-center space-x-2">
                <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent whitespace-nowrap">
                  QaaqConnect{isPremium ? " Premium" : ""}
                </h1>
                {isPremium && (
                  <Crown className="w-5 h-5 text-yellow-500 animate-pulse" />
                )}
              </div>
            </div>
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
                <div className="flex flex-col h-full bg-white overflow-hidden border-l border-r border-orange-500">
                  {/* Minimalist Header */}
                  <QBOTChatHeader 
                    onClear={handleClearQBotChat}
                    isAdmin={user?.isAdmin}
                  />
                  
                  {/* Chat Area with Engineering Grid Background */}
                  <QBOTChatArea>
                    <div className="flex flex-col h-full p-4 relative">
                      {/* Premium Roadblock for Free Users - Redesigned */}
                      {!isPremiumUser && showRoadblock && (
                        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                          <div className="max-w-xs w-[64%] bg-white rounded-lg shadow-xl border border-orange-400 p-3 text-center relative max-h-[42vh] overflow-y-auto">
                            {/* Minimize/Restore Chevron */}
                            <button
                              onClick={() => setShowRoadblock(false)}
                              className="absolute top-2 right-2 w-8 h-8 bg-orange-100 hover:bg-orange-200 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                              title="Minimize roadblock to explore homepage"
                            >
                              <ChevronDown className="w-4 h-4 text-orange-600" />
                            </button>

                            <div className="mb-3">
                              <div className="w-10 h-10 mx-auto mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-md">
                                <span className="text-lg">⭐</span>
                              </div>
                              <h2 className="text-lg font-bold text-gray-800 mb-1">Premium Required</h2>
                            </div>

                            <div className="mb-3 space-y-1 bg-gray-50 rounded-md p-2">
                              <div className="flex items-center text-xs text-gray-700">
                                <span className="text-green-500 mr-1 text-sm">✓</span>
                                <span>Unlimited responses</span>
                              </div>
                              <div className="flex items-center text-xs text-gray-700">
                                <span className="text-green-500 mr-1 text-sm">✓</span>
                                <span>Multi-AI access</span>
                              </div>
                              <div className="flex items-center text-xs text-gray-700">
                                <span className="text-green-500 mr-1 text-sm">✓</span>
                                <span>Priority assistance</span>
                              </div>
                              <div className="flex items-center text-xs text-gray-700">
                                <span className="text-green-500 mr-1 text-sm">✓</span>
                                <span>File attachments</span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <a
                                href="https://rzp.io/rzp/jwQW9TW"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-medium py-1.5 px-2 rounded-md hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 text-xs"
                              >
                                Monthly - ₹451
                              </a>
                              <a
                                href="https://rzp.io/rzp/NAU59cv"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-medium py-1.5 px-2 rounded-md hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 text-xs"
                              >
                                Yearly - ₹2,611 <span className="text-yellow-200">(Save 50%)</span>
                              </a>
                              <button
                                onClick={() => setLocation("/dm")}
                                className="block w-full bg-gray-200 text-gray-700 font-medium py-1.5 px-2 rounded-md hover:bg-gray-300 transition-colors border border-gray-300 text-xs"
                              >
                                Continue to QaaqConnect
                              </button>
                            </div>

                            <p className="text-xs text-gray-500 mt-2 leading-tight">
                              Secure payment via Razorpay.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Minimized Roadblock Indicator */}
                      {!isPremiumUser && !showRoadblock && (
                        <div className="absolute top-4 right-4 z-40">
                          <button
                            onClick={() => setShowRoadblock(true)}
                            className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 hover:from-yellow-600 hover:to-orange-600 transition-all duration-200"
                            title="View premium upgrade options"
                          >
                            <span className="text-sm font-medium">⭐ Upgrade</span>
                            <ChevronUp className="w-4 h-4" />
                          </button>
                        </div>
                      )}

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
                      disabled={isQBotTyping || !isPremiumUser}
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