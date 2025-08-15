import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import { MessageCircle, Anchor, Navigation, Search, MapPin, Clock, User, Ship, Award, ChevronDown, Ban, Users } from "lucide-react";
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
  sender: {
    id: string;
    fullName: string;
    rank?: string;
    whatsAppProfilePictureUrl?: string;
    profilePictureUrl?: string;
    whatsAppDisplayName?: string;
    maritimeRank?: string;
  };
  receiver: {
    id: string;
    fullName: string;
    rank?: string;
    whatsAppProfilePictureUrl?: string;
    profilePictureUrl?: string;
    whatsAppDisplayName?: string;
    maritimeRank?: string;
  };
  firstMessage?: string;
  lastMessage?: string;
  lastActivity?: string;
}

interface UserWithDistance extends UserType {
  distance: number;
  company?: string;
}

interface RankGroup {
  id: string;
  name: string;
  description: string;
  memberCount?: number;
  lastActivity?: string;
  type?: string;
}

export default function DMPage() {
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConnection, setSelectedConnection] = useState<ExtendedChatConnection | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("users");
  const [isBlockedDropdownOpen, setIsBlockedDropdownOpen] = useState(false);

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
        // Refresh chat connections to show updated unread status
        queryClient.invalidateQueries({ queryKey: ['/api/chat/connections'] });
        
        // Move the chat connection with new message to the top by refreshing nearby users
        queryClient.invalidateQueries({ queryKey: ['/api/users/nearby'] });
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

  // Fetch user's chat connections - Re-enabled for search card navigation fix
  const { data: connections = [], isLoading: connectionsLoading, error: connectionsError } = useQuery<ExtendedChatConnection[]>({
    queryKey: ['/api/chat/connections'],
    enabled: !!user, // Enable when user is authenticated
    refetchInterval: false, // Disable polling but allow initial fetch
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true, // Allow initial mount fetch
    staleTime: 30000, // Keep data for 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
  });

  // Debug connection loading - COMPLETELY DISABLED for qh13 refresh fix  
  // useEffect(() => {
  //   // DISABLED to prevent console spam and refresh issues
  //   // console.log('🔍 DM Auto-connect check - DISABLED for qh13 refresh fix');
  // }, []); // Completely disabled

  // Fetch users - use search API when searching, nearby API otherwise
  const { data: nearbyUsers = [], isLoading: usersLoading, refetch: refetchNearbyUsers } = useQuery<UserWithDistance[]>({
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
    refetchInterval: false, // No auto-refresh - only manual refresh when user clicks radar
    enabled: !!user, // Only fetch when user is authenticated
  });

  // Fetch rank groups for displaying group cards
  const { data: rankGroups = [], isLoading: rankGroupsLoading } = useQuery<RankGroup[]>({
    queryKey: ['/api/rank-groups/public'],
    queryFn: async () => {
      console.log('🔍 Frontend: Fetching rank groups for user:', user?.id);
      
      // Get JWT token from localStorage
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
        console.log('🔑 Frontend: Adding JWT token to request');
      }
      
      const response = await fetch('/api/rank-groups/public', {
        credentials: 'include', // Include session cookies
        headers,
      });
      console.log('📥 Frontend: Rank groups response status:', response.status);
      if (!response.ok) throw new Error('Failed to fetch rank groups');
      const data = await response.json();
      console.log('📊 Frontend: Rank groups data received:', data.length, 'groups');
      return data;
    },
    enabled: !!user,
  });

  // Global radar refresh handler - exposed for external components
  useEffect(() => {
    const handleRadarRefresh = () => {
      if (!searchQuery.trim()) {
        refetchNearbyUsers();
        console.log('🟢 Manual radar refresh triggered - refreshing nearby users');
      }
    };

    // Listen for radar refresh events
    window.addEventListener('radar-refresh', handleRadarRefresh);
    
    return () => {
      window.removeEventListener('radar-refresh', handleRadarRefresh);
    };
  }, [refetchNearbyUsers, searchQuery]);

  // Create chat connection mutation
  const createConnectionMutation = useMutation({
    mutationFn: async (receiverId: string) => {
      // Use fetch directly with credentials for Replit Auth
      console.log('📤 Making connection request to:', '/api/chat/connect', 'with receiverId:', receiverId);
      const response = await fetch('/api/chat/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include session cookies for Replit Auth
        body: JSON.stringify({ receiverId }),
      });
      
      console.log('📥 Response status:', response.status, 'OK:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Connection request failed:', response.status, errorText);
        throw new Error(`Failed to create connection: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('📋 Parsed response:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('✅ Connection mutation success:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/chat/connections'] });
      // Navigate directly to dedicated chat page instead of showing toast
      if (data && data.success && data.connection && data.connection.id) {
        console.log('🚀 Navigating to chat:', `/chat/${data.connection.id}`);
        setLocation(`/chat/${data.connection.id}`);
      } else {
        console.error('❌ Connection data missing or malformed:', data);
        // Still try to navigate if we have any connection data
        if (data && data.connection && data.connection.id) {
          console.log('🔧 Attempting navigation anyway with connection ID:', data.connection.id);
          setLocation(`/chat/${data.connection.id}`);
        }
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
      // No toast notification - accepting should be silent
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept connection. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Block connection mutation
  const blockConnectionMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      return apiRequest(`/api/chat/block/${connectionId}`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/connections'] });
      // No toast notification - blocking should be silent
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to block connection. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Unblock connection mutation
  const unblockConnectionMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      return apiRequest(`/api/chat/unblock/${connectionId}`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/connections'] });
      // No toast notification - unblocking should also be silent
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unblock connection. Please try again.",
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

  // Sort all connections by recency - most recent first (including pending connections)
  const sortedConnections = [...connections].sort((a, b) => {
    const timeA = new Date(a.lastActivity || a.acceptedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.lastActivity || b.acceptedAt || b.createdAt || 0).getTime();
    return timeB - timeA; // Most recent first
  });

  // Separate connections by status but keep recent order
  const activeConnections = sortedConnections.filter(conn => conn.status === 'accepted');
  const pendingConnections = sortedConnections.filter(conn => 
    conn.status === 'pending' && conn.receiverId === user.id
  );
  const sentRequests = sortedConnections.filter(conn => 
    conn.status === 'pending' && conn.senderId === user.id
  );
  const blockedConnections = sortedConnections.filter(conn => 
    conn.status === 'blocked' && conn.receiverId === user.id
  );

  // Create activity-sorted combined list: connections and rank groups intermingled by recent activity
  const allActivityItems = [
    // Chat connections with their activity timestamps
    ...pendingConnections.map(conn => ({
      type: 'connection' as const,
      data: conn,
      activityTime: new Date(conn.lastActivity || conn.acceptedAt || conn.createdAt || 0).getTime(),
      priority: 3 // Pending connections get highest priority
    })),
    ...activeConnections.map(conn => ({
      type: 'connection' as const,
      data: conn,
      activityTime: new Date(conn.lastActivity || conn.acceptedAt || conn.createdAt || 0).getTime(),
      priority: 2 // Active connections get high priority
    })),
    ...sentRequests.map(conn => ({
      type: 'connection' as const,
      data: conn,
      activityTime: new Date(conn.lastActivity || conn.acceptedAt || conn.createdAt || 0).getTime(),
      priority: 1 // Sent requests get medium priority
    })),
    // Rank groups with their activity timestamps (only show if not searching)
    ...(!searchQuery.trim() ? rankGroups.map(group => ({
      type: 'rank_group' as const,
      data: group,
      activityTime: new Date(group.lastActivity || new Date('2024-01-01')).getTime(),
      priority: 0 // Rank groups get lowest priority
    })) : [])
  ];
  
  // Sort by priority first (higher priority = appears first), then by activity time (more recent = appears first)
  const sortedActivityItems = allActivityItems.sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority; // Higher priority first
    }
    return b.activityTime - a.activityTime; // More recent activity first
  });
  
  const allChatCards = [
    // Activity-sorted connections and rank groups
    ...sortedActivityItems,
    // Top Q Professionals (excluding users already in active conversations)
    ...filteredUsers
      .filter(topQUser => !activeConnections.some(conn => {
        const otherUser = getOtherUser(conn);
        return otherUser?.id === topQUser.id;
      }))
      .map(topQUser => ({ type: 'top_q' as const, data: topQUser }))
  ];

  if (connectionsLoading || usersLoading || rankGroupsLoading) {
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
                                console.log('🔍 Current connections:', connections);
                                
                                // Check if connection already exists
                                const existingConnection = connections.find(conn => 
                                  (conn.senderId === user?.id && conn.receiverId === userProfile.id) ||
                                  (conn.receiverId === user?.id && conn.senderId === userProfile.id)
                                );

                                console.log('🔍 Found existing connection:', existingConnection);

                                if (existingConnection) {
                                  console.log('✅ Opening existing chat, status:', existingConnection.status);
                                  openChat(existingConnection);
                                } else {
                                  console.log('🚀 Creating new connection');
                                  // Use mutation directly to ensure navigation happens after success
                                  createConnectionMutation.mutate(userProfile.id);
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
                    <div className="flex items-center space-x-3">
                      <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                        <DropdownMenu open={isBlockedDropdownOpen} onOpenChange={setIsBlockedDropdownOpen}>
                          <DropdownMenuTrigger asChild>
                            <button className="flex items-center space-x-1 hover:bg-orange-50 p-1 rounded transition-colors">
                              <MessageCircle size={20} className="text-orange-600" />
                              <ChevronDown size={14} className="text-orange-600" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
                            <div className="p-2">
                              <div className="flex items-center space-x-2 mb-3 px-2">
                                <Ban size={16} className="text-red-500" />
                                <span className="font-medium text-gray-700">Blocked Connections ({blockedConnections.length})</span>
                              </div>
                              {blockedConnections.length === 0 ? (
                                <div className="text-center py-4 text-gray-500 text-sm">
                                  No blocked connections
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {blockedConnections.map((connection) => {
                                    const otherUser = getOtherUser(connection);
                                    if (!otherUser) return null;
                                    
                                    return (
                                      <div key={`blocked-${connection.id}`} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50">
                                        <Avatar className="w-8 h-8">
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
                                          <AvatarFallback className="bg-red-100 text-red-600 font-bold text-xs">
                                            {getInitials(otherUser.whatsAppDisplayName || otherUser.fullName)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-900 truncate">
                                            {otherUser.whatsAppDisplayName || otherUser.fullName}
                                          </p>
                                          <p className="text-xs text-gray-500 truncate">
                                            {otherUser.maritimeRank || otherUser.rank || "Maritime Professional"}
                                          </p>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-xs border-gray-300 text-gray-600 hover:bg-gray-50 px-2 py-1"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            unblockConnectionMutation.mutate(connection.id);
                                          }}
                                        >
                                          Unblock
                                        </Button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <span>Active DMs</span>
                      </h2>
                    </div>
                    <span className="text-sm text-gray-500">
                      {activeConnections.length + pendingConnections.length + sentRequests.length} chats • {filteredUsers.length} professionals
                    </span>
                  </div>
                </div>
                
                {(activeConnections.length + pendingConnections.length + sentRequests.length) === 0 && filteredUsers.length === 0 ? (
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
                    {/* Unified Chat Cards: Activity-Sorted DMs and Rank Groups, Then Top Q Professionals */}
                    {!searchQuery.trim() && allChatCards.map((cardItem, index) => {
                      if (cardItem.type === 'connection') {
                        const connection = cardItem.data;
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
                                    {(isAccepted || (connection.lastMessage && connection.lastMessage.trim())) && (
                                      <div className="text-blue-500 mr-2" title="Message delivered">
                                        <svg width="16" height="12" viewBox="0 0 16 12" className="inline">
                                          <path d="m0.229 6.427-1.14-1.14-1.415 1.414 2.555 2.555 7.074-7.074-1.414-1.414z" fill="currentColor"/>
                                          <path d="m5.229 6.427-1.14-1.14-1.415 1.414 2.555 2.555 7.074-7.074-1.414-1.414z" fill="currentColor"/>
                                        </svg>
                                      </div>
                                    )}
                                    <p className="text-sm text-gray-500 truncate">
                                      {connection.lastMessage ? (
                                        <span className="italic">"{connection.lastMessage}"</span>
                                      ) : connection.firstMessage ? (
                                        <span className="italic text-blue-600">"{connection.firstMessage}"</span>
                                      ) : (
                                        <span className="text-gray-400">No messages yet</span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right ml-2">
                                  <p className="text-xs text-gray-400">
                                    {formatDistanceToNow(new Date(connection.acceptedAt || connection.createdAt || new Date()))}
                                  </p>
                                  {isIncoming && (
                                    <div className="flex space-x-1 mt-1">
                                      {connection.status !== 'blocked' ? (
                                        <>
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
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              blockConnectionMutation.mutate(connection.id);
                                            }}
                                          >
                                            Blocked
                                          </Button>
                                        </>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-xs border-gray-300 text-gray-600 hover:bg-gray-50 px-2 py-1"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            unblockConnectionMutation.mutate(connection.id);
                                          }}
                                        >
                                          Unblock
                                        </Button>
                                      )}
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
                      
                      } else if (cardItem.type === 'rank_group') {
                        // Rank Group Card - styled like user cards
                        const group = cardItem.data as RankGroup;
                        
                        return (
                          <div 
                            key={`rank-group-${group.id}`} 
                            className="p-4 hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-50"
                            tabIndex={0}
                            onClick={() => {
                              console.log('🏢 Rank group card clicked:', group.name);
                              setLocation('/rank-groups');
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
                                  <AvatarFallback className="bg-blue-100 text-blue-600 font-bold">
                                    <Users size={20} />
                                  </AvatarFallback>
                                </Avatar>
                                {/* Group Badge */}
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                                  <Users size={8} className="text-white" />
                                </div>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-gray-900 truncate">
                                      {group.name} Group
                                    </h4>
                                    <div className="flex items-center mt-1">
                                      <p className="text-sm text-gray-500 truncate">
                                        {group.description}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end space-y-1">
                                    <Badge variant="outline" className="text-xs">
                                      {group.memberCount || 0} members
                                    </Badge>
                                    {group.lastActivity && (
                                      <p className="text-xs text-gray-400">
                                        {formatDistanceToNow(new Date(group.lastActivity), { addSuffix: true })}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                        
                      } else if (cardItem.type === 'top_q') {
                        // Top Q Professional Card
                        const userProfile = cardItem.data;
                        
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
                                  {userProfile.maritimeRank && (
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                      {userProfile.maritimeRank}
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
                      }
                      
                      return null;
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