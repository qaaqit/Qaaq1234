import { useState } from "react";
import { useLocation } from "wouter";
import type { User } from "@/lib/auth";
import { Button } from "@/components/ui/button";
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

    try {
      // Call QBOT API for AI-powered response
      const response = await fetch('/api/qbot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ message: messageText })
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
              <UserDropdown user={user} onLogout={() => window.location.reload()} />
            </div>
          </div>
        </div>
      </header>
      
      {/* Always Maximized QBOT Chat Container */}
      <div className="flex-1 pb-16">
        <QBOTChatContainer>
          <div className="flex flex-col h-full">
            {/* Gradient Header */}
            <QBOTChatHeader 
              onClear={handleClearQBotChat}
            />
            
            {/* Chat Area with Engineering Background - Always Visible */}
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
          </div>
        </QBOTChatContainer>
      </div>
    </div>
  );
}