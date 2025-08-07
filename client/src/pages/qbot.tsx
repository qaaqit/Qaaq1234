import { useState } from "react";
import type { User } from "@/lib/auth";
import Header from "@/components/header";
import QBOTChatContainer from "@/components/qbot-chat/QBOTChatContainer";
import QBOTChatHeader from "@/components/qbot-chat/QBOTChatHeader";
import QBOTChatArea from "@/components/qbot-chat/QBOTChatArea";
import QBOTWelcomeState from "@/components/qbot-chat/QBOTWelcomeState";
import QBOTMessageList from "@/components/qbot-chat/QBOTMessageList";
import QBOTInputArea from "@/components/qbot-chat/QBOTInputArea";
import QBOTTypingIndicator from "@/components/qbot-chat/QBOTTypingIndicator";
import type { Message } from "@/components/qbot-chat/QBOTMessageList";
import { useToast } from "@/hooks/use-toast";

interface QBOTPageProps {
  user: User;
}

export default function QBOTPage({ user }: QBOTPageProps) {
  const [qBotMessages, setQBotMessages] = useState<Message[]>([]);
  const [isQBotTyping, setIsQBotTyping] = useState(false);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header - only show for admin users */}
      {user.isAdmin && (
        <Header 
          user={user} 
          onQbotToggle={() => {}}
          isQbotOpen={true}
          isQbotMinimized={false}
        />
      )}

      {/* Full Screen QBOT Chat Container - Exactly Same as Maximized */}
      <div className={`${user.isAdmin ? 'pt-16' : 'pt-0'} pb-16`}>
        <QBOTChatContainer 
          isOpen={true}
          onClose={() => {}}
          isMinimized={false}
        >
          <div className="flex flex-col h-full">
            {/* Gradient Header */}
            <QBOTChatHeader 
              onClear={handleClearQBotChat}
              onToggleMinimize={() => {}}
              isMinimized={false}
            />
            
            {/* Chat Area with Engineering Background */}
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
                
                {/* Input Area */}
                <QBOTInputArea 
                  onSendMessage={handleSendQBotMessage}
                  disabled={isQBotTyping}
                />
              </div>
            </QBOTChatArea>
          </div>
        </QBOTChatContainer>
      </div>
    </div>
  );
}