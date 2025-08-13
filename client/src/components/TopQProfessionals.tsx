import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, MessageSquare, Award, MapPin, Ship, MessageCircle, Check, CheckCheck } from 'lucide-react';
import { useState } from 'react';
import QChatWindow from '@/components/qchat-window';
import { useAuth } from '@/hooks/useAuth';

interface TopProfessional {
  id: string;
  userId: string;
  fullName: string;
  email?: string;
  maritimeRank: string;
  shipName?: string;
  port?: string;
  country?: string;
  questionCount: number;
  answerCount: number;
  userType: string;
  subscriptionStatus: string;
  profilePictureUrl?: string;
  isTopProfessional: boolean;
}

interface TopProfessionalsResponse {
  success: boolean;
  professionals: TopProfessional[];
  total: number;
  message: string;
}

const getRankBadgeColor = (rank: string) => {
  const rankLower = rank.toLowerCase();
  if (rankLower.includes('chief') || rankLower.includes('captain')) return 'bg-orange-100 text-orange-800 border-orange-300';
  if (rankLower.includes('engineer')) return 'bg-red-100 text-red-800 border-red-300';
  if (rankLower.includes('officer')) return 'bg-blue-100 text-blue-800 border-blue-300';
  return 'bg-gray-100 text-gray-800 border-gray-300';
};

export function TopQProfessionals() {
  const [selectedUser, setSelectedUser] = useState<TopProfessional | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { user } = useAuth();
  
  const { data, isLoading, error } = useQuery<TopProfessionalsResponse>({
    queryKey: ['/api/users/top-professionals'],
    queryFn: async () => {
      const response = await fetch('/api/users/top-professionals');
      if (!response.ok) {
        throw new Error('Failed to fetch top professionals');
      }
      return response.json();
    },
    refetchInterval: false, // Disable automatic refetching
    refetchOnWindowFocus: false, // Disable refetch on window focus
    refetchOnReconnect: false, // Disable refetch on network reconnect
    staleTime: 10 * 60 * 1000, // Consider data fresh for 10 minutes
    gcTime: 15 * 60 * 1000, // Keep data in cache for 15 minutes
  });

  const handleStartConversation = (professional: TopProfessional) => {
    if (user?.id === professional.id) {
      return; // Don't allow chat with self
    }
    setSelectedUser(professional);
    setIsChatOpen(true);
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
    setSelectedUser(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <Crown className="h-6 w-6 text-orange-600" />
          <h2 className="text-2xl font-bold text-gray-800">Top Q Professionals</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6 text-center">
          <Award className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-700 mb-2">Unable to Load Top Professionals</h3>
          <p className="text-red-600">Please try again later</p>
        </CardContent>
      </Card>
    );
  }

  const professionals = data.professionals || [];

  // Mock active conversations data (in real app, this would come from API)
  const activeConversations = [
    {
      id: "conv_1",
      user: { name: "Karthickraja", rank: "Engine Cadet", avatar: "K" },
      lastMessage: "Thanks for the engine room tips!",
      timestamp: "2m ago",
      unreadCount: 2,
      messageStatus: "read" // read, delivered, sent
    },
    {
      id: "conv_2", 
      user: { name: "Platform Admin", rank: "Chief Engineer", avatar: "PA" },
      lastMessage: "The new maritime regulations are...",
      timestamp: "5m ago",
      unreadCount: 0,
      messageStatus: "delivered"
    },
    {
      id: "conv_3",
      user: { name: "Chiru Rank", rank: "Fourth Engineer", avatar: "CR" },
      lastMessage: "When are you visiting port next?",
      timestamp: "1h ago", 
      unreadCount: 1,
      messageStatus: "sent"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Active Conversations Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">Active Conversations</h2>
          <Badge variant="outline" className="ml-auto">
            {activeConversations.length} Active
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {activeConversations.map((conversation) => (
            <Card 
              key={conversation.id}
              className="hover:shadow-md transition-all duration-200 cursor-pointer border-l-4 border-l-blue-500"
              onClick={() => {
                // Handle conversation click - would open chat with that user
                console.log(`Opening chat with ${conversation.user.name}`);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {/* User Avatar */}
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-600">{conversation.user.avatar}</span>
                  </div>
                  
                  {/* Conversation Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-800 truncate">
                        {conversation.user.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{conversation.timestamp}</span>
                        {/* Message Status Indicators */}
                        {conversation.messageStatus === 'sent' && (
                          <Check className="h-4 w-4 text-gray-400" />
                        )}
                        {conversation.messageStatus === 'delivered' && (
                          <CheckCheck className="h-4 w-4 text-gray-400" />
                        )}
                        {conversation.messageStatus === 'read' && (
                          <CheckCheck className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge variant="secondary" className="text-xs mb-1">
                          {conversation.user.rank}
                        </Badge>
                        <p className="text-sm text-gray-600 truncate">
                          {conversation.lastMessage}
                        </p>
                      </div>
                      
                      {/* Unread Count */}
                      {conversation.unreadCount > 0 && (
                        <Badge className="bg-red-500 text-white min-w-[1.25rem] h-5 rounded-full text-xs">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Top Q Professionals Header */}
      <div className="flex items-center gap-3 mb-6">
        <Crown className="h-6 w-6 text-orange-600" />
        <h2 className="text-2xl font-bold text-gray-800">Top Q Professionals</h2>
        <Badge variant="outline" className="ml-auto">
          {professionals.length} Professionals
        </Badge>
      </div>

      {/* Compact User Cards Grid */}
      <div className="grid grid-cols-1 gap-3">
        {professionals.map((professional, index) => (
          <Card 
            key={professional.id} 
            className={`hover:shadow-md transition-all duration-200 cursor-pointer ${
              index === 0 ? 'border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-red-50' :
              index === 1 ? 'border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-orange-50' :
              index === 2 ? 'border-l-4 border-l-gray-500 bg-gradient-to-r from-gray-50 to-gray-100' :
              'border-l-4 border-l-blue-500'
            }`}
            onClick={() => user && user.id !== professional.id && handleStartConversation(professional)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {/* Rank Medal/Avatar */}
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                  {index < 3 ? (
                    <span className="text-lg">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-orange-600">
                      #{index + 1}
                    </span>
                  )}
                </div>
                
                {/* Professional Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-800 truncate">
                      {professional.fullName || professional.email || 'Maritime Professional'}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-bold text-orange-700 text-xs">
                        {professional.questionCount}Q
                      </Badge>
                      <Badge variant="outline" className="font-bold text-red-700 text-xs">
                        {professional.answerCount}A
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Badge variant="secondary" className="text-xs">
                        {professional.maritimeRank?.replace(/_/g, ' ') || 'Professional'}
                      </Badge>
                      
                      {/* Company and Ship Info */}
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        {professional.company && (
                          <span className="bg-blue-100 px-2 py-1 rounded truncate max-w-24">
                            {professional.company}
                          </span>
                        )}
                        {(professional as any).lastShip && (
                          <span className="bg-gray-100 px-2 py-1 rounded truncate max-w-24">
                            {(professional as any).lastShip}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Start Chat Button */}
                    {user && user.id !== professional.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-orange-300 text-orange-600 hover:bg-orange-50 ml-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartConversation(professional);
                        }}
                      >
                        <MessageCircle className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      

      {/* Chat Window */}
      {isChatOpen && selectedUser && user && (
        <QChatWindow
          isOpen={isChatOpen}
          onClose={handleCloseChat}
          currentUser={user}
          targetUser={{
            id: selectedUser.id,
            fullName: selectedUser.fullName || selectedUser.email || 'Maritime Professional',
            rank: selectedUser.maritimeRank,
            ship: selectedUser.shipName,
            location: selectedUser.port && selectedUser.country ? 
              `${selectedUser.port}, ${selectedUser.country}` : 
              selectedUser.port || selectedUser.country || '',
          }}
        />
      )}
    </div>
  );
}