import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import { MessageCircle, Anchor, Navigation, Search, MapPin, Clock, User, Ship, Award } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import QChatWindow from "@/components/qchat-window";
import UserDropdown from "@/components/user-dropdown";

import MessageNotificationDot from "@/components/message-notification-dot";

import qaaqLogo from "@/assets/qaaq-logo.png";
import type { ChatConnection, User as UserType } from "@shared/schema";
import ChatConnectionsList from "@/components/chat/ChatConnectionsList";
import { websocketService } from "@/services/websocket";

interface ExtendedChatConnection extends ChatConnection {
  sender: { id: string; fullName: string; rank?: string };
  receiver: { id: string; fullName: string; rank?: string };
}

interface UserWithDistance extends UserType {
  distance: number;
  company?: string;
}

export default function DMPage() {
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConnection, setSelectedConnection] = useState<ExtendedChatConnection | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("users");

  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Initialize WebSocket connection for real-time messaging
  useEffect(() => {
    if (user) {
      websocketService.connect();
      
      // Handle incoming messages
      const handleNewMessage = (data: any) => {
        // Refresh chat connections when new messages arrive
        queryClient.invalidateQueries({ queryKey: ['/api/chat/connections'] });
        
        // Show toast notification for new messages
        toast({
          title: "New Message",
          description: `You have a new message from ${data.senderName || 'a user'}`,
        });
      };
      
      websocketService.onMessage('new_message', handleNewMessage);
      
      return () => {
        websocketService.offMessage('new_message');
      };
    }
  }, [user, queryClient, toast]);
  
  // Get the target user ID from URL parameters  
  const urlParams = new URLSearchParams(window.location.search);
  const targetUserId = urlParams.get('user');

  // Fetch target user details if provided
  const { data: targetUser } = useQuery<UserType>({
    queryKey: ['/api/users/profile', targetUserId],
    queryFn: async () => {
      if (!targetUserId) throw new Error('No target user ID');
      const response = await fetch(`/api/users/profile/${targetUserId}`);
      if (!response.ok) throw new Error('Failed to fetch user profile');
      return response.json();
    },
    enabled: !!targetUserId,
  });

  // Fetch user's chat connections - DISABLED for qh13 refresh fix
  const { data: connections = [], isLoading: connectionsLoading, error: connectionsError } = useQuery<ExtendedChatConnection[]>({
    queryKey: ['/api/chat/connections'],
    enabled: false, // DISABLED to prevent 401 polling causing qh13 refresh
    refetchInterval: false, // Disable all polling
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    staleTime: Infinity, // Keep data indefinitely
    gcTime: Infinity,
  });

  // Debug connection loading - COMPLETELY DISABLED for qh13 refresh fix  
  // useEffect(() => {
  //   // DISABLED to prevent console spam and refresh issues
  //   // console.log('🔍 DM Auto-connect check - DISABLED for qh13 refresh fix');
  // }, []); // Completely disabled

  // Fetch users - use search API when searching, nearby API otherwise
  const { data: nearbyUsers = [], isLoading: usersLoading } = useQuery<UserWithDistance[]>({
    queryKey: searchQuery.trim() ? ['/api/users/search', searchQuery] : ['/api/users/nearby'],
    queryFn: async () => {
      if (searchQuery.trim()) {
        // Use search API for comprehensive search including WhatsApp numbers and user IDs
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}&limit=100`);
        if (!response.ok) throw new Error('Failed to search users');
        const data = await response.json();
        // Handle different response formats from search API
        return data.sailors || data.users || data || [];
      } else {
        // Use nearby API for default top Q users
        const response = await fetch('/api/users/nearby');
        if (!response.ok) throw new Error('Failed to fetch nearby users');
        return response.json();
      }
    },
    refetchInterval: searchQuery.trim() ? false : 30000, // Don't auto-refresh search results, but refresh nearby users
  });

  // Create chat connection mutation
  const createConnectionMutation = useMutation({
    mutationFn: async (receiverId: string) => {
      return apiRequest('/api/chat/connect', 'POST', { receiverId });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/connections'] });
      // Navigate directly to dedicated chat page instead of showing toast
      if (data.success && data.connection) {
        setLocation(`/chat/${data.connection.id}`);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to send connection request",
        variant: "destructive",
      });
    },
  });

  // Accept connection mutation
  const acceptConnectionMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      return apiRequest(`/api/chat/accept/${connectionId}`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/connections'] });
      toast({
        title: "Connection Accepted",
        description: "You can now start chatting!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept connection. Please try again.",
        variant: "destructive",
      });
    }
  });

  const getInitials = (name: string | null | undefined) => {
    if (!name || typeof name !== 'string') return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getOtherUser = (connection: ExtendedChatConnection) => {
    if (!user) return null;
    return connection.sender?.id === user.id ? connection.receiver : connection.sender;
  };

  const formatDistance = (distance: number) => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    } else if (distance < 100) {
      return `${distance.toFixed(1)}km`;
    } else {
      return `${Math.round(distance)}km`;
    }
  };

  const openChat = (connection: ExtendedChatConnection) => {
    // Navigate to dedicated chat page
    setLocation(`/chat/${connection.id}`);
  };

  const handleConnectUser = async (userId: string) => {
    // Check if connection already exists
    const existingConnection = connections.find(conn => 
      (conn.senderId === user?.id && conn.receiverId === userId) ||
      (conn.receiverId === user?.id && conn.senderId === userId)
    );

    if (existingConnection) {
      // Always navigate to chat page, regardless of status
      openChat(existingConnection);
      return;
    }

    createConnectionMutation.mutate(userId);
  };

  // Auto-open chat for specific user if specified in URL
  useEffect(() => {
    // console.log('🔍 DM Auto-connect check - DISABLED for qh13 refresh fix');
    
    if (targetUserId && (targetUser || connections.length > 0)) {
      // Check if there's already an existing connection
      const existingConnection = connections.find(conn => {
        const otherUser = getOtherUser(conn);
        console.log('🔍 Checking connection:', { connectionId: conn.id, otherUserId: otherUser?.id, targetUserId, status: conn.status });
        return otherUser?.id === targetUserId;
      });

      if (existingConnection && existingConnection.status === 'accepted') {
        console.log('✅ Opening existing chat with:', targetUserId);
        openChat(existingConnection);
      } else if (!existingConnection && targetUser) {
        console.log('🚀 Auto-connecting to user:', targetUserId, targetUser.fullName);
        handleConnectUser(targetUserId);
      } else {
        console.log('⏳ Connection exists but not accepted yet:', existingConnection?.status);
      }
    }
  }, [targetUserId, targetUser, connections]);

  // Users are already filtered by the backend search API when searchQuery is provided
  const filteredUsers = Array.isArray(nearbyUsers) ? nearbyUsers : [];

  // Return early if user is not authenticated (after all hooks)
  // But show loading if auth is still loading to prevent flash of login message
  if (!user) {
    if (isLoading) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-navy border-t-transparent" />
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <p className="text-gray-600">Please log in to access chat features.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Separate connections by status
  const activeConnections = connections.filter(conn => conn.status === 'accepted');
  const pendingConnections = connections.filter(conn => 
    conn.status === 'pending' && conn.receiverId === user.id
  );
  const sentRequests = connections.filter(conn => 
    conn.status === 'pending' && conn.senderId === user.id
  );

  if (connectionsLoading || usersLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-navy border-t-transparent" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[90vh] bg-gradient-to-b from-slate-50 to-blue-50 flex flex-col overflow-hidden">
      {/* Fixed Header - Always Visible */}
      <header className="bg-white text-black shadow-md relative overflow-hidden flex-shrink-0 z-[110] border-b-2 border-orange-400 sticky top-0">
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
                  <p className="text-xs sm:text-sm text-orange-600 italic font-medium whitespace-nowrap">Sailor Search</p>
                </div>
              </button>
              <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                {user && <UserDropdown user={user} onLogout={() => window.location.reload()} />}
              </div>
            </div>
          </div>
        </header>
      {/* Scrollable Content Area - Only Internal Scrolling */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {/* Users Section - Simplified without tabs */}
            <div className="space-y-6">
              {/* Minimalistic Search Users Bar */}
              <div className="flex items-center space-x-2">
                <div className="flex-1 relative">
                  <Input
                    type="text"
                    placeholder="by name / rank / ship / company"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pr-12 border-ocean-teal/30 focus:border-ocean-teal"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setSearchQuery(searchInput.trim());
                      }
                    }}
                  />
                </div>
                {searchQuery.trim() ? (
                  <Button 
                    size="sm"
                    variant="outline"
                    className="px-3 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchInput("");
                    }}
                  >
                    Clear
                  </Button>
                ) : (
                  <Button 
                    size="sm"
                    variant="outline"
                    className="px-3 border-ocean-teal/30 hover:bg-ocean-teal hover:text-white"
                    onClick={() => {
                      setSearchQuery(searchInput.trim());
                    }}
                  >
                    <Search size={16} />
                  </Button>
                )}
              </div>

              {/* Search Results - Show only when searching */}
              {searchQuery.trim() && (
                <Card className="border-2 border-ocean-teal/20">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-navy">
                      <Navigation size={20} />
                      <span>Search Results ({filteredUsers.length})</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {filteredUsers.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-r from-navy to-blue-800 rounded-full flex items-center justify-center mb-4">
                          <User size={32} className="text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Results Found</h3>
                        <p className="text-gray-600">
                          Try adjusting your search terms or search by WhatsApp number, name, or rank
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-h-80 overflow-y-auto">
                        {filteredUsers.map((userProfile, index) => {
                          const existingConnection = connections.find(conn => 
                            (conn.senderId === user?.id && conn.receiverId === userProfile.id) ||
                            (conn.receiverId === user?.id && conn.senderId === userProfile.id)
                          );

                          return (
                            <Card 
                              key={`search-${userProfile.id}-${index}`} 
                              className="border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
                              onClick={async () => {
                                // Create or find existing connection and navigate to 1v1 DM chat
                                console.log('🔍 Search card clicked for user:', userProfile.id, userProfile.fullName);
                                
                                // Check if connection already exists
                                const existingConnection = connections.find(conn => 
                                  (conn.senderId === user?.id && conn.receiverId === userProfile.id) ||
                                  (conn.receiverId === user?.id && conn.senderId === userProfile.id)
                                );

                                if (existingConnection && existingConnection.status === 'accepted') {
                                  console.log('✅ Opening existing accepted chat');
                                  openChat(existingConnection);
                                } else if (!existingConnection) {
                                  console.log('🚀 Creating new connection');
                                  await handleConnectUser(userProfile.id);
                                } else {
                                  console.log('⏳ Connection exists but not accepted yet:', existingConnection.status);
                                  // Still try to open for pending connections  
                                  openChat(existingConnection);
                                }
                              }}
                            >
                              <CardContent className="p-4 text-[#191919]" data-testid="searchcard">
                                <div className="flex items-start space-x-3 mb-3">
                                  <div className="relative">
                                    <Avatar className="w-12 h-12 border-2 border-ocean-teal/30">
                                      {(userProfile.whatsAppProfilePictureUrl || userProfile.profilePictureUrl) ? (
                                        <img 
                                          src={userProfile.whatsAppProfilePictureUrl || userProfile.profilePictureUrl} 
                                          alt={`${userProfile.whatsAppDisplayName || userProfile.fullName}'s profile`}
                                          className="w-full h-full rounded-full object-cover"
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <AvatarFallback className="bg-gradient-to-r from-ocean-teal/20 to-cyan-200 text-gray-700 font-bold">
                                          {getInitials(userProfile.whatsAppDisplayName || userProfile.fullName)}
                                        </AvatarFallback>
                                      )}
                                    </Avatar>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-gray-900 truncate">
                                      {userProfile.whatsAppDisplayName || userProfile.fullName}
                                    </h4>
                                    
                                    {/* Maritime Rank - prioritize maritimeRank over rank */}
                                    {(userProfile.maritimeRank || userProfile.rank) && (
                                      <div className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded mb-1 inline-block">
                                        {userProfile.maritimeRank || userProfile.rank}
                                      </div>
                                    )}
                                    
                                    {/* Last Ship or Current Ship */}
                                    {(userProfile.lastShip || userProfile.currentShipName || userProfile.shipName) && (
                                      <p className="text-xs text-blue-700 font-semibold truncate mb-1">
                                        🚢 {userProfile.lastShip || userProfile.currentShipName || userProfile.shipName}
                                      </p>
                                    )}
                                    
                                    {/* Last Company */}
                                    {(userProfile.lastCompany || userProfile.company) && (
                                      <p className="text-xs text-gray-700 font-medium truncate mb-1">
                                        🏢 {userProfile.lastCompany || userProfile.company}
                                      </p>
                                    )}
                                    
                                    {/* Location */}
                                    <p className="text-sm text-gray-600 truncate">
                                      📍 {userProfile.port || userProfile.city}
                                      {userProfile.country && `, ${userProfile.country}`}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="outline" className="text-xs">
                                      Q: {userProfile.questionCount || 0}
                                    </Badge>
                                    {userProfile.distance !== undefined && (
                                      <Badge variant="secondary" className="text-xs">
                                        {formatDistance(userProfile.distance)}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    {existingConnection ? (
                                      <p className={`text-xs font-medium ${
                                        existingConnection.status === 'accepted' 
                                          ? 'text-green-600' 
                                          : 'text-gray-500'
                                      }`}>
                                        {existingConnection.status === 'accepted' ? 'Click to chat' : 
                                         existingConnection.status === 'pending' ? 'Request sent' : 'Connection declined'}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Combined Active DMs & Top Q Professionals */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                      <MessageCircle size={20} className="text-orange-600" />
                      <span>Active DMs</span>
                    </h2>
                    <span className="text-sm text-gray-500">
                      {connections.length} chats • {filteredUsers.length} professionals
                    </span>
                  </div>
                </div>
                
                {connections.length === 0 && filteredUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-100 to-green-200 rounded-full flex items-center justify-center mb-4">
                      <MessageCircle size={32} className="text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active DMs</h3>
                    <p className="text-gray-600">
                      Connect with maritime professionals to start chatting
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-104 overflow-y-auto">
                    {/* Active DM Connections First */}
                    {connections.map((connection) => {
                      const otherUser = getOtherUser(connection);
                      if (!otherUser) return null;
                      
                      const isAccepted = connection.status === 'accepted';
                      const isPending = connection.status === 'pending';
                      const isIncoming = isPending && connection.receiverId === user?.id;
                      const isOutgoing = isPending && connection.senderId === user?.id;
                      
                      return (
                        <div 
                          key={`connection-${connection.id}`} 
                          className="p-4 hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-50"
                          tabIndex={0}
                          onClick={() => {
                            if (isAccepted) {
                              openChat(connection);
                              if (connection.id) {
                                websocketService.markMessagesAsRead(connection.id);
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.currentTarget.click();
                            }
                          }}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              <Avatar className="w-12 h-12">
                                {(otherUser.whatsAppProfilePictureUrl || otherUser.profilePictureUrl) && (
                                  <img 
                                    src={otherUser.whatsAppProfilePictureUrl || otherUser.profilePictureUrl} 
                                    alt={`${otherUser.whatsAppDisplayName || otherUser.fullName}'s profile`}
                                    className="w-full h-full rounded-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                    }}
                                  />
                                )}
                                <AvatarFallback className="bg-ocean-teal/20 text-ocean-teal font-bold">
                                  {getInitials(otherUser.whatsAppDisplayName || otherUser.fullName)}
                                </AvatarFallback>
                              </Avatar>
                              {isAccepted && <MessageNotificationDot userId={otherUser.id} />}
                              {/* Active Chat Badge */}
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                                <MessageCircle size={8} className="text-white" />
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-gray-900 truncate">
                                    {otherUser.fullName}
                                  </h4>
                                  <div className="flex items-center mt-1">
                                    {isAccepted && (
                                      <div className="text-blue-500 mr-2" title="Message delivered">
                                        <svg width="16" height="12" viewBox="0 0 16 12" className="inline">
                                          <path d="m0.229 6.427-1.14-1.14-1.415 1.414 2.555 2.555 7.074-7.074-1.414-1.414z" fill="currentColor"/>
                                          <path d="m5.229 6.427-1.14-1.14-1.415 1.414 2.555 2.555 7.074-7.074-1.414-1.414z" fill="currentColor"/>
                                        </svg>
                                      </div>
                                    )}
                                    <p className="text-sm text-gray-500 truncate">
                                      {isAccepted && 'Connected - Click to chat'}
                                      {isIncoming && 'Wants to connect with you'}
                                      {isOutgoing && 'Connection request sent'}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right ml-2">
                                  <p className="text-xs text-gray-400">
                                    {formatDistanceToNow(new Date(connection.acceptedAt || connection.createdAt || new Date()))}
                                  </p>
                                  {isIncoming && (
                                    <div className="flex space-x-1 mt-1">
                                      <Button
                                        size="sm"
                                        className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          acceptConnectionMutation.mutate(connection.id);
                                        }}
                                      >
                                        Accept
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs border-red-300 text-red-600 hover:bg-red-50 px-2 py-1"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        Decline
                                      </Button>
                                    </div>
                                  )}
                                  {isOutgoing && (
                                    <Badge variant="outline" className="text-xs text-gray-500 mt-1">
                                      Pending
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Top Q Professionals - Show only when NOT searching */}
                    {!searchQuery.trim() && filteredUsers.map((userProfile) => {
                      const existingConnection = connections.find(conn => 
                        (conn.senderId === user?.id && conn.receiverId === userProfile.id) ||
                        (conn.receiverId === user?.id && conn.senderId === userProfile.id)
                      );

                      // Don't show if user already has an active connection
                      if (existingConnection) return null;

                      return (
                        <div 
                          key={`professional-${userProfile.id}`} 
                          className="p-4 hover:bg-orange-50 transition-colors cursor-pointer border-l-4 border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-orange-50"
                          tabIndex={0}
                          onClick={async () => {
                            try {
                              const response = await fetch('/api/chat/connect', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ receiverId: userProfile.id }),
                              });
                              
                              if (response.ok) {
                                const result = await response.json();
                                if (result.success && result.connection) {
                                  setLocation(`/chat/${result.connection.id}`);
                                }
                              } else {
                                console.error('Failed to create connection:', response.statusText);
                              }
                            } catch (error) {
                              console.error('Error creating connection:', error);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.currentTarget.click();
                            }
                          }}
                        >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        {(userProfile.whatsAppProfilePictureUrl || userProfile.profilePictureUrl) && (
                          <img 
                            src={userProfile.whatsAppProfilePictureUrl || userProfile.profilePictureUrl} 
                            alt={`${userProfile.whatsAppDisplayName || userProfile.fullName}'s profile`}
                            className="w-full h-full rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        )}
                        <AvatarFallback className="bg-orange-100 text-orange-800 font-bold">
                          {getInitials(userProfile.whatsAppDisplayName || userProfile.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      {/* Q Professional Badge */}
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white flex items-center justify-center">
                        <Award size={8} className="text-white" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {userProfile.fullName}
                      </h4>
                      <div className="flex items-center mt-1 space-x-2">
                        <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                          {userProfile.questionCount || 0}Q
                        </Badge>
                        {userProfile.maritime_rank && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            {userProfile.maritime_rank}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate mt-1">
                        {userProfile.company && `${userProfile.company} • `}
                        {userProfile.shipName && `${userProfile.shipName} • `}
                        {userProfile.distance !== undefined && `${formatDistance(userProfile.distance)} away`}
                      </p>

                    </div>
                  </div>
                </div>
              );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Real-time Chat Window - Enhanced QChat with WebSocket */}
      {selectedConnection && (
        <QChatWindow
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          connection={selectedConnection}
        />
      )}
    </div>
  );
}