import { useState } from "react";
import { useLocation } from "wouter";
import type { User } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";
import UserDropdown from "@/components/user-dropdown";
import QBOTChatContainer from "@/components/qbot-chat/QBOTChatContainer";
import QBOTChatHeader from "@/components/qbot-chat/QBOTChatHeader";
import QBOTChatArea from "@/components/qbot-chat/QBOTChatArea";
import QBOTWelcomeState from "@/components/qbot-chat/QBOTWelcomeState";
import QBOTMessageList from "@/components/qbot-chat/QBOTMessageList";
import QBOTInputArea from "@/components/qbot-chat/QBOTInputArea";
import QBOTTypingIndicator from "@/components/qbot-chat/QBOTTypingIndicator";
import type { Message } from "@/components/qbot-chat/QBOTMessageList";
import { useToast } from "@/hooks/use-toast";
import qaaqLogo from "@assets/qaaq-logo.png";

interface QBOTPageProps {
  user: User;
}

export default function QBOTPage({ user }: QBOTPageProps) {
  const [qBotMessages, setQBotMessages] = useState<Message[]>([]);
  const [isQBotTyping, setIsQBotTyping] = useState(false);
  const [showQBOTChat, setShowQBOTChat] = useState(true);
  const [isQBOTMinimized, setIsQBOTMinimized] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSendQBotMessage = async (messageText: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date()
    };

    setQBotMessages(prev => [...prev, newMessage]);
    setIsQBotTyping(true);

    // Simulate bot response after a delay
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "Thank you for your message! I'm QBOT, your maritime AI assistant. I'm here to help with maritime questions, regulations, procedures, and general seafaring knowledge. How can I assist you today?",
        sender: 'bot',
        timestamp: new Date()
      };
      
      setQBotMessages(prev => [...prev, botResponse]);
      setIsQBotTyping(false);
    }, 2000);
  };

  const handleClearQBotChat = () => {
    setQBotMessages([]);
    setIsQBotTyping(false);
    toast({
      title: "Chat Cleared",
      description: "Your conversation has been cleared.",
    });
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
              <UserDropdown user={user} onLogout={() => window.location.reload()} />
            </div>
          </div>
        </div>
      </header>
      
      {/* Full Screen QBOT Chat Container - Exactly Same as Maximized */}
      <div className="flex-1 pb-16">
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
              onClear={handleClearQBotChat}
              onToggleMinimize={() => {
                setIsQBOTMinimized(!isQBOTMinimized);
              }}
              isMinimized={isQBOTMinimized}
            />
            
            {/* Chat Area with Engineering Background - hide when minimized */}
            {!isQBOTMinimized && (
              <>
                <QBOTChatArea>
                  <div className="flex flex-col h-full">
                    {/* Messages or Welcome State */}
                    {qBotMessages.length === 0 ? (
                      <QBOTWelcomeState />
                    ) : (
                      <>
                        <QBOTMessageList messages={qBotMessages} />
                        {isQBotTyping && <QBOTTypingIndicator />}
                      </>
                    )}
                  </div>
                </QBOTChatArea>
                
                {/* Input Area */}
                <QBOTInputArea 
                  onSendMessage={handleSendQBotMessage}
                  disabled={isQBotTyping}
                />
              </>
            )}
          </div>
        </QBOTChatContainer>
      </div>
    </div>
  );
}