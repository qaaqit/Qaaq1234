import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";
import { RankGroupsPanel } from "@/components/rank-groups-panel";
import UserDropdown from "@/components/user-dropdown";
import QBOTChatContainer from "@/components/qbot-chat/QBOTChatContainer";
import QBOTChatHeader from "@/components/qbot-chat/QBOTChatHeader";
import QBOTChatArea from "@/components/qbot-chat/QBOTChatArea";
import QBOTWelcomeState from "@/components/qbot-chat/QBOTWelcomeState";
import QBOTMessageList from "@/components/qbot-chat/QBOTMessageList";
import QBOTTypingIndicator from "@/components/qbot-chat/QBOTTypingIndicator";
import QBOTInputArea from "@/components/qbot-chat/QBOTInputArea";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import qaaqLogo from "@/assets/qaaq-logo.png";

export default function RankGroupsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showQBOTChat, setShowQBOTChat] = useState(false);
  const [isQBOTMinimized, setIsQBOTMinimized] = useState(false);
  const [qbotMessages, setQBotMessages] = useState<Array<{id: string; text: string; sender: 'user' | 'bot'; timestamp: Date}>>([]);
  const [isQBotTyping, setIsQBotTyping] = useState(false);

  interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
  }

  // Return early if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <p className="text-gray-600">Please log in to access rank groups.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with Home Logo - Same as Discover and DM Pages */}
        <header className="bg-white text-black shadow-md relative overflow-hidden flex-shrink-0 z-[110] border-b-2 border-orange-400 rounded-t-lg mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 opacity-50"></div>
          
          <div className="relative z-10 px-2 py-2 sm:px-4 sm:py-3">
            <div className="flex items-center justify-between gap-2">
              <button 
                onClick={() => setLocation('/')}
                className="flex items-center space-x-2 sm:space-x-3 hover:bg-orange-100 rounded-lg p-1 sm:p-2 transition-colors min-w-0 flex-shrink-0"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center overflow-hidden shadow-lg flex-shrink-0">
                  <img 
                    src={qaaqLogo} 
                    alt="QAAQ Logo" 
                    className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-xl font-bold text-gray-800 whitespace-nowrap">QaaqConnect</h1>
                  <p className="text-xs sm:text-sm text-orange-600 italic font-medium whitespace-nowrap">maritime groups</p>
                </div>
              </button>
              <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                <Button
                  onClick={() => {
                    if (!showQBOTChat) {
                      setShowQBOTChat(true);
                      setIsQBOTMinimized(false);
                    } else {
                      setIsQBOTMinimized(!isQBOTMinimized);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="bg-gradient-to-r from-orange-500 to-yellow-500 border-2 border-red-400 text-white hover:from-red-500 hover:to-orange-500 hover:border-red-500 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-xs px-1 sm:px-2 font-bold flex-shrink-0"
                  title={showQBOTChat ? (isQBOTMinimized ? "Expand QBOT" : "Minimize QBOT") : "Open QBOT - Maritime Assistant"}
                >
                  <i className="fas fa-robot mr-1 sm:mr-2 text-yellow-200"></i>
                  <span className="hidden sm:inline">QBOT</span>
                  <span className="sm:hidden">QBOT</span>
                  {showQBOTChat ? (
                    isQBOTMinimized ? (
                      <ChevronUp size={14} className="ml-1 text-yellow-200" />
                    ) : (
                      <ChevronDown size={14} className="ml-1 text-yellow-200" />
                    )
                  ) : (
                    <ChevronDown size={14} className="ml-1 text-yellow-200" />
                  )}
                </Button>
                {user && <UserDropdown user={user} onLogout={() => window.location.reload()} />}
              </div>
            </div>
          </div>
        </header>

        {/* QBOT Chat Container */}
        <QBOTChatContainer 
          isOpen={showQBOTChat}
          onClose={() => {
            setShowQBOTChat(false);
            setIsQBOTMinimized(false);
          }}
          isMinimized={isQBOTMinimized}
        >
          <div className="flex flex-col h-full">
            {/* Gradient Header */}
            <QBOTChatHeader 
              onClear={() => {
                setQBotMessages([]);
                setIsQBotTyping(false);
                toast({
                  title: "Chat Cleared",
                  description: "Your conversation has been cleared.",
                });
              }}
              onToggleMinimize={() => {
                setIsQBOTMinimized(!isQBOTMinimized);
              }}
              isMinimized={isQBOTMinimized}
            />
            
            {/* Chat Area with Grid Pattern - hide when minimized */}
            {!isQBOTMinimized && (
              <>
                <QBOTChatArea>
                  {qbotMessages.length === 0 ? (
                    <QBOTWelcomeState />
                  ) : (
                    <>
                      <QBOTMessageList messages={qbotMessages} />
                      {isQBotTyping && <QBOTTypingIndicator />}
                    </>
                  )}
                </QBOTChatArea>
                
                {/* Input Area */}
                <QBOTInputArea 
                  onSendMessage={async (text) => {
                    const newMessage: Message = {
                      id: Date.now().toString(),
                      text,
                      sender: 'user',
                      timestamp: new Date()
                    };
                    setQBotMessages([...qbotMessages, newMessage]);
                    
                    // Show typing indicator
                    setIsQBotTyping(true);
                    
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
                      setQBotMessages(prev => [...prev, botResponse]);
                    } catch (error) {
                      console.error('Error sending message to QBOT:', error);
                      const errorResponse: Message = {
                        id: (Date.now() + 1).toString(),
                        text: 'Sorry, I encountered an error. Please try again.',
                        sender: 'bot',
                        timestamp: new Date()
                      };
                      setQBotMessages(prev => [...prev, errorResponse]);
                    } finally {
                      setIsQBotTyping(false);
                    }
                  }}
                />
              </>
            )}
          </div>
        </QBOTChatContainer>

        {/* Rank Groups Panel Content */}
        <div className="bg-white rounded-lg shadow-sm">
          <RankGroupsPanel />
        </div>
      </div>
    </div>
  );
}