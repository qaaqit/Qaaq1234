import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, MessageSquare, Award, MapPin, Ship, MessageCircle } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      {/* Simple Header */}
      <div className="flex items-center gap-3 mb-6">
        <Crown className="h-6 w-6 text-orange-600" />
        <h2 className="text-2xl font-bold text-gray-800">Top Q Professionals</h2>
        <Badge variant="outline" className="ml-auto">
          {professionals.length} Professionals
        </Badge>
      </div>

      {/* Simple User Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {professionals.map((professional, index) => (
          <Card 
            key={professional.id} 
            className={`transform hover:scale-105 transition-all duration-200 ${
              index === 0 ? 'ring-2 ring-orange-400 bg-gradient-to-br from-orange-50 to-red-50' :
              index === 1 ? 'ring-2 ring-red-400 bg-gradient-to-br from-red-50 to-orange-50' :
              index === 2 ? 'ring-2 ring-gray-400 bg-gradient-to-br from-gray-50 to-gray-100' :
              'hover:shadow-lg'
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {index < 3 && (
                    <div className={`text-2xl ${
                      index === 0 ? 'text-orange-500' :
                      index === 1 ? 'text-red-500' :
                      'text-gray-500'
                    }`}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-lg">
                      {professional.fullName || professional.email || 'Maritime Professional'}
                    </CardTitle>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getRankBadgeColor(professional.maritimeRank || 'other')}`}
                      >
                        {professional.maritimeRank?.replace('_', ' ').toUpperCase() || 'PROFESSIONAL'}
                      </Badge>
                    </div>
                  </div>
                </div>
                {professional.userType === 'Premium' && (
                  <Crown className="h-5 w-5 text-yellow-500" />
                )}
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* Question & Answer Stats */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">Questions</span>
                  </div>
                  <Badge variant="outline" className="font-bold text-orange-700">
                    {professional.questionCount}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium">Answers</span>
                  </div>
                  <Badge variant="outline" className="font-bold text-red-700">
                    {professional.answerCount}
                  </Badge>
                </div>

                {/* Company, Ship & Location Info */}
                <div className="pt-2 border-t border-gray-200 space-y-2">
                  {/* Company */}
                  {professional.company && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="h-4 w-4 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-xs text-blue-600 font-bold">C</span>
                      </div>
                      <span className="font-medium">{professional.company}</span>
                    </div>
                  )}
                  
                  {/* Ship */}
                  {professional.shipName && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Ship className="h-4 w-4" />
                      <span>{professional.shipName}</span>
                    </div>
                  )}
                  
                  {/* Location */}
                  {professional.port && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{professional.port}{professional.country && `, ${professional.country}`}</span>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="pt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min((professional.questionCount / (professionals[0]?.questionCount || 1)) * 100, 100)}%` 
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1 text-center">
                    Rank #{index + 1} of {professionals.length}
                  </div>
                </div>

                {/* Start Conversation Button */}
                {user && user.id !== professional.id && (
                  <div className="pt-3 border-t border-gray-100 mt-3">
                    <Button
                      onClick={() => handleStartConversation(professional)}
                      size="sm"
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Start Conversation
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer Note */}
      <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-gray-600">
            Rankings are based on authentic question contributions from maritime professionals. 
            Data updated from the comprehensive QAAQ maritime database.
          </p>
        </CardContent>
      </Card>

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