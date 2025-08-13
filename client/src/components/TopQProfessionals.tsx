import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, MessageSquare, Award, MapPin, Ship, MessageCircle, Check, CheckCheck, Search, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import QChatWindow from '@/components/qchat-window';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface TopProfessional {
  id: string;
  userId: string;
  fullName: string;
  email?: string;
  maritimeRank: string;
  shipName?: string;
  company?: string;
  lastShip?: string;
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
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastScrollY, setLastScrollY] = useState(0);
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const response = await fetch('/api/chat/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          receiverId: targetUserId
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (data, targetUserId) => {
      // Redirect to DM page with the target user
      setLocation(`/dm?user=${targetUserId}`);
      toast({
        title: "Conversation Started",
        description: "You can now chat with this maritime professional.",
      });
      // Refresh chat connections
      queryClient.invalidateQueries({ queryKey: ['/api/chat/connections'] });
    },
    onError: (error) => {
      console.error('Failed to start conversation:', error);
      toast({
        title: "Connection Failed",
        description: "Unable to start conversation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStartConversation = (professional: TopProfessional) => {
    if (!user) {
      toast({
        title: "Authentication Required", 
        description: "Please log in to start a conversation.",
        variant: "destructive",
      });
      return;
    }

    if (user && typeof user === 'object' && 'id' in user && user.id === professional.id) {
      return; // Don't allow chat with self
    }

    // Navigate directly to DM page with the professional
    console.log('🔵 Starting conversation with:', professional.fullName);
    setLocation(`/dm?user=${encodeURIComponent(professional.id)}&name=${encodeURIComponent(professional.fullName || 'Maritime Professional')}`);
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
    setSelectedUser(null);
  };

  // Handle scroll to show/hide search bar
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show search bar when scrolling up or at top
      if (currentScrollY < lastScrollY || currentScrollY < 50) {
        setShowSearchBar(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Hide search bar when scrolling down
        setShowSearchBar(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const [searchResults, setSearchResults] = useState<TopProfessional[]>([]);
  const [isSearching, setIsSearching] = useState(false);


  const performSearch = async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    console.log('Searching for:', query);
    
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Found ${data.total} sailors matching "${query}"`);
        setSearchResults(data.sailors.map((sailor: any) => ({
          id: sailor.id,
          userId: sailor.id,
          fullName: sailor.fullName,
          email: sailor.email,
          maritimeRank: sailor.maritimeRank,
          company: sailor.company,
          lastShip: sailor.lastShip,
          port: sailor.port,
          country: sailor.country,
          questionCount: sailor.questionCount,
          answerCount: sailor.answerCount,
          userType: sailor.userType,
          subscriptionStatus: sailor.userType === 'Premium' ? 'premium' : 'free',
          profilePictureUrl: sailor.profilePictureUrl,
          isTopProfessional: false,
          matchType: sailor.matchType
        })));
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchClick = () => {
    performSearch(searchQuery);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performSearch(searchQuery);
    }
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
    <div className="space-y-6 relative">
      {/* Sailor Search Bar - Pull to Reveal */}
      <div 
        className={`fixed top-0 left-0 right-0 z-50 bg-white shadow-md border-b transition-transform duration-300 ${
          showSearchBar ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="container mx-auto px-4 py-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="block w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search sailors, ships, companies..."
            />
            <div className="absolute inset-y-0 right-0 pr-1 flex items-center">
              <button
                onClick={handleSearchClick}
                className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-2 rounded transition-colors disabled:bg-gray-300"
                disabled={searchQuery.trim().length < 2}
              >
                1234koihai
              </button>
            </div>
          </div>
          
          {/* Search Results Preview - Only show after search is performed */}
          {searchResults.length > 0 && (
            <div className="mt-2 bg-gray-50 rounded-lg p-3 max-h-64 overflow-y-auto">
              <div className="text-sm text-gray-600 mb-2">
                Found {searchResults.length} sailors matching "{searchQuery}"
              </div>
              <div className="space-y-1">
                {searchResults.slice(0, 5).map(sailor => (
                      <div 
                        key={sailor.id}
                        className="flex items-center gap-2 text-sm text-gray-700 hover:bg-white rounded p-2 cursor-pointer border-l-2 border-transparent hover:border-blue-500 transition-all"
                        onClick={() => {
                          setShowSearchBar(false);
                          handleStartConversation(sailor);
                        }}
                        data-testid={`search-result-card-${sailor.id}`}
                      >
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs text-blue-600 font-bold">
                            {sailor.fullName?.charAt(0) || 'M'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">
                              {sailor.fullName || 'Maritime Professional'}
                            </span>
                            {(sailor as any).matchType === 'exact' && (
                              <span className="text-xs bg-green-100 text-green-700 px-1 rounded">Exact</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {sailor.maritimeRank}
                            {sailor.company && ` • ${sailor.company}`}
                            {sailor.lastShip && ` • ${sailor.lastShip}`}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400">
                          Q: {sailor.questionCount}
                        </div>
                      </div>
                    ))}
                {searchResults.length > 5 && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    And {searchResults.length - 5} more sailors...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Show searching indicator only during active search */}
          {isSearching && searchQuery && (
            <div className="mt-2 bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                Searching for "{searchQuery}"...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🔒 MARIANA SEAL LOCKED: Active Conversations Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-800">Active Conversations</h2>
          <Badge variant="outline" className="ml-auto text-xs">
            {activeConversations.length} Active
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {activeConversations.map((conversation) => (
            <Card 
              key={conversation.id}
              className="hover:shadow-sm transition-all duration-200 cursor-pointer border-l-3 border-l-blue-500 bg-white"
              onClick={() => {
                // Navigate to DM page with the conversation user
                const userName = conversation.user.name.replace(/\s+/g, '-').toLowerCase();
                setLocation(`/dm?user=${encodeURIComponent(userName)}&name=${encodeURIComponent(conversation.user.name)}`);
              }}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {/* Compact User Avatar */}
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-blue-600">{conversation.user.avatar}</span>
                  </div>
                  
                  {/* Conversation Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-gray-800 truncate text-sm">
                        {conversation.user.name}
                      </h3>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">{conversation.timestamp}</span>
                        {/* WhatsApp-style Message Status */}
                        {conversation.messageStatus === 'sent' && (
                          <Check className="h-3 w-3 text-gray-400" />
                        )}
                        {conversation.messageStatus === 'delivered' && (
                          <CheckCheck className="h-3 w-3 text-gray-400" />
                        )}
                        {conversation.messageStatus === 'read' && (
                          <CheckCheck className="h-3 w-3 text-blue-500" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <Badge variant="secondary" className="text-xs mb-1 py-0">
                          {conversation.user.rank}
                        </Badge>
                        <p className="text-xs text-gray-600 truncate">
                          {conversation.lastMessage}
                        </p>
                      </div>
                      
                      {/* Unread Count Badge */}
                      {conversation.unreadCount > 0 && (
                        <Badge className="bg-red-500 text-white min-w-[1rem] h-4 rounded-full text-xs ml-2 px-1">
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

      {/* 🔒 MARIANA SEAL LOCKED: Top Q Professionals Header */}
      <div className="flex items-center gap-3 mb-4">
        <Crown className="h-5 w-5 text-orange-600" />
        <h2 className="text-xl font-bold text-gray-800">🏆 Top Q Professionals</h2>
        <Badge variant="outline" className="ml-auto text-xs bg-green-100 text-green-800">
          MARIANA SEAL ✓ {professionals.length} Professionals
        </Badge>
      </div>

      {/* 🔒 MARIANA SEAL: Slim Cards Like Image 2 */}
      <div className="space-y-2">
        {professionals.map((professional, index) => (
          <Card 
            key={professional.id} 
            className={`hover:shadow-sm transition-all duration-200 cursor-pointer ${
              index === 0 ? 'border-l-4 border-l-orange-500' :
              index === 1 ? 'border-l-4 border-l-red-500' :
              index === 2 ? 'border-l-4 border-l-gray-500' :
              'border-l-4 border-l-blue-500'
            }`}
            onClick={() => user && typeof user === 'object' && 'id' in user && user.id !== professional.id && handleStartConversation(professional)}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                {/* Left side: Medal + Name + Rank */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Medal */}
                  <div className="flex-shrink-0">
                    {index < 3 ? (
                      <span className="text-lg">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </span>
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-orange-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-orange-600">#{index + 1}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Name and Rank */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 text-sm truncate">
                      {professional.fullName || professional.email || 'Maritime Professional'}
                    </div>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {professional.maritimeRank?.replace(/_/g, ' ') || 'Maritime Professional'}
                    </Badge>
                  </div>
                </div>
                
                {/* Right side: Q&A badges */}
                <div className="flex items-center gap-1 ml-2">
                  <Badge variant="outline" className="font-bold text-orange-700 text-xs">
                    {professional.questionCount}Q
                  </Badge>
                  <Badge variant="outline" className="font-bold text-red-700 text-xs">
                    {professional.answerCount}A
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      

      {/* Chat Window - Removed as we navigate directly to DM page */}
    </div>
  );
}