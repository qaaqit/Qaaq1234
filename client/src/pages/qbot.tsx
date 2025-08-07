import { useState, useEffect } from "react";
import type { User } from "@/lib/auth";
import Header from "@/components/header";
import QBOTChatContainer from "@/components/qbot-chat/QBOTChatContainer";

interface QBOTPageProps {
  user: User;
}

export default function QBOTPage({ user }: QBOTPageProps) {
  const [isQbotOpen, setIsQbotOpen] = useState(true);
  const [isQbotMinimized, setIsQbotMinimized] = useState(false);

  // Keep QBOT open and expanded by default on this dedicated page
  useEffect(() => {
    setIsQbotOpen(true);
    setIsQbotMinimized(false);
  }, []);

  const handleQbotToggle = () => {
    if (isQbotOpen && !isQbotMinimized) {
      setIsQbotMinimized(true);
    } else if (isQbotOpen && isQbotMinimized) {
      setIsQbotMinimized(false);
    } else {
      setIsQbotOpen(true);
      setIsQbotMinimized(false);
    }
  };

  const handleQbotClose = () => {
    setIsQbotOpen(false);
    setIsQbotMinimized(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header - only show for admin users */}
      {user.isAdmin && (
        <Header 
          user={user} 
          onQbotToggle={handleQbotToggle}
          isQbotOpen={isQbotOpen}
          isQbotMinimized={isQbotMinimized}
        />
      )}

      {/* Main Content Area */}
      <div className={`${user.isAdmin ? 'pt-16' : 'pt-4'} pb-20`}>
        <div className="max-w-6xl mx-auto px-4">
          {/* Page Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              <i className="fas fa-robot text-orange-500 mr-3"></i>
              QBOT AI Assistant
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Your intelligent maritime companion. Ask questions about seafaring, 
              get assistance with maritime procedures, or chat about life at sea.
            </p>
          </div>

          {/* Welcome Card */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-l-4 border-orange-500">
            <div className="flex items-start space-x-4">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-full p-3">
                <i className="fas fa-robot text-white text-2xl"></i>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                  Welcome to QBOT Chat
                </h2>
                <p className="text-gray-600 mb-4">
                  QBOT is your maritime AI assistant, ready to help with:
                </p>
                <ul className="text-gray-600 space-y-2">
                  <li className="flex items-center">
                    <i className="fas fa-check-circle text-green-500 mr-2"></i>
                    Maritime regulations and procedures
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check-circle text-green-500 mr-2"></i>
                    Navigation and safety questions
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check-circle text-green-500 mr-2"></i>
                    Career guidance and certifications
                  </li>
                  <li className="flex items-center">
                    <i className="fas fa-check-circle text-green-500 mr-2"></i>
                    General maritime knowledge
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Chat Instructions */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
            <div className="flex items-center space-x-2 mb-2">
              <i className="fas fa-info-circle text-blue-500"></i>
              <h3 className="font-semibold text-blue-800">How to use QBOT</h3>
            </div>
            <p className="text-blue-700 text-sm">
              Start typing your question or message below. QBOT will respond with 
              helpful information tailored to maritime professionals.
            </p>
          </div>
        </div>
      </div>

      {/* QBOT Chat Container */}
      <QBOTChatContainer
        isOpen={isQbotOpen}
        onClose={handleQbotClose}
        isMinimized={isQbotMinimized}
        onToggleMinimize={() => setIsQbotMinimized(!isQbotMinimized)}
      />
    </div>
  );
}