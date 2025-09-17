import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Archive } from "lucide-react";
// Using public asset path for better reliability
const qaaqLogo = "/qaaq-logo.png";

interface QBOTPageProps {
  user: User;
}

export default function QBOTPage({ user }: QBOTPageProps) {
  const { language } = useLanguage();
  const [qBotMessages, setQBotMessages] = useState<Message[]>([]);
  const [isQBotTyping, setIsQBotTyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [activeTab, setActiveTab] = useState("chat");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showRoadblock, setShowRoadblock] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Premium status disabled since JWT auth is disabled
  // This eliminates subscription status polling
  const subscriptionStatus = null;
  const isCheckingPremium = false;
  const checkPremiumStatus = () => {}; // No-op function
  
  // Check premium status for known testing accounts since JWT is disabled
  // This enables premium features for verified premium users (matches QBOTChatHeader logic)
  const testingEmails = ['workship.ai@gmail.com', 'mushy.piyush@gmail.com'];
  const userEmail = user?.email || localStorage.getItem('user_email') || '';
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const isPremium = testingEmails.includes(userEmail) || isAdmin;
  const isPremiumUser = testingEmails.includes(userEmail) || isAdmin;

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
    // Check premium status only when user tries to send a message
    if (!subscriptionStatus) {
      try {
        await checkPremiumStatus();
      } catch (error) {
        console.error('Failed to check premium status:', error);
      }
    }

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
      const authToken = localStorage.getItem('auth_token');
      const response = await fetch('/api/qbot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ 
          message: messageText, 
          attachments: attachments,
          isPrivate: isPrivate,
          aiModels: aiModels || ['chatgpt'],
          isPremium: isPremiumUser,
          language: language,
          conversationHistory: qBotMessages.slice(-10) // Send last 10 messages as context
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

  // Archive conversation (clear context for fresh start)
  const handleArchiveConversation = () => {
    setQBotMessages([]);
    setIsQBotTyping(false);
    setShowClearConfirm(false);
    toast({
      title: "Conversation Archived",
      description: "Started fresh conversation without previous context.",
      duration: 3000,
    });
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

  // Remove loading screen - premium check now happens only when needed

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
                    onClick={() => setLocation("/workshop-tree")}
                    className="cursor-pointer flex flex-col items-start space-y-1 px-4 py-3 hover:bg-orange-50 transition-colors"
                    data-testid="menu-item-workshop-tree"
                  >
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-network-wired text-orange-600 w-4"></i>
                      <span className="text-gray-700 font-medium">Workshop Tree</span>
                    </div>
                    <div className="text-xs text-gray-500 pl-6 leading-tight">
                      System → Equipment → Task → Expertise → Port → Workshop
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setLocation("/premium")}
                    className="cursor-pointer flex items-center space-x-3 px-4 py-3 hover:bg-orange-50 transition-colors"
                    data-testid="menu-item-premium"
                  >
                    <i className="fas fa-crown text-orange-600 w-4"></i>
                    <span className="text-gray-700 font-medium">Premium Subscription</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setLocation("/readme")}
                    className="cursor-pointer flex items-center space-x-3 px-4 py-3 hover:bg-orange-50 transition-colors"
                    data-testid="menu-item-readme"
                  >
                    <i className="fas fa-info-circle text-orange-600 w-4"></i>
                    <span className="text-gray-700 font-medium">ReadMe</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="min-w-0 flex items-center space-x-2">
                <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent whitespace-nowrap">
                  {isPremium ? "Premium Qaaqit (Quickly Explain It)" : "QaaqConnect"}
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
                    onArchive={() => setShowClearConfirm(true)}
                    isAdmin={user?.isAdmin}
                  />
                  
                  {/* Chat Area with Engineering Grid Background */}
                  <QBOTChatArea>
                    <div className="flex flex-col h-full p-4 relative">


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
                      onClear={handleClearQBotChat}
                    />
                  </div>
                </div>
              </QBOTChatContainer>
            </div>

            {/* Orange line separator above carousel */}
            <div className="border-t-2 border-orange-500"></div>
            
            {/* Image Carousel - Flush with chat box */}
            <div className="h-[200px] relative">
              <ImageCarousel className="h-full" />
              
            </div>
          </TabsContent>

          {/* Questions Tab Content */}
          <TabsContent value="questions" className="flex-1 flex flex-col">
            {/* Image Carousel at top - Flush with content */}
            <div className="h-[200px] relative">
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

      {/* Archive Confirmation Dialog */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-orange-600" />
              Archive Conversation
            </DialogTitle>
            <DialogDescription>
              This will clear your conversation history and start fresh without any previous context. 
              QBOT will treat your next message as a new conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowClearConfirm(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleArchiveConversation}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Archive & Start Fresh
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}