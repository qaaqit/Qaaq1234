import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Anchor, Navigation, Search, MapPin, Clock, User, Ship } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import QChatWindow from "@/components/qchat-window";
import UserDropdown from "@/components/user-dropdown";
import { QuestionsTab } from "@/components/questions-tab";
import MessageNotificationDot from "@/components/message-notification-dot";
import QBOTChatContainer from "@/components/qbot-chat/QBOTChatContainer";
import QBOTChatHeader from "@/components/qbot-chat/QBOTChatHeader";
import QBOTChatArea from "@/components/qbot-chat/QBOTChatArea";
import QBOTWelcomeState from "@/components/qbot-chat/QBOTWelcomeState";
import QBOTMessageList from "@/components/qbot-chat/QBOTMessageList";
import QBOTTypingIndicator from "@/components/qbot-chat/QBOTTypingIndicator";
import QBOTInputArea from "@/components/qbot-chat/QBOTInputArea";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConnection, setSelectedConnection] = useState<ExtendedChatConnection | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("questions");
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
  const { user } = useAuth();
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

  // Fetch user's chat connections
  const { data: connections = [], isLoading: connectionsLoading } = useQuery<ExtendedChatConnection[]>({
    queryKey: ['/api/chat/connections'],
    refetchInterval: 5000, // Poll every 5 seconds for new connections
  });

  // Fetch nearby users with distance
  const { data: nearbyUsers = [], isLoading: usersLoading } = useQuery<UserWithDistance[]>({
    queryKey: ['/api/users/nearby'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Create chat connection mutation
  const createConnectionMutation = useMutation({
    mutationFn: async (receiverId: string) => {
      return apiRequest('/api/chat/connect', 'POST', { receiverId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/connections'] });
      toast({
        title: "Connection Request Sent",
        description: "Your chat request has been sent successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to send connection request",
        variant: "destructive",
      });
    },
  });

  const getInitials = (name: string) => {
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
    setSelectedConnection(connection);
    setIsChatOpen(true);
  };

  const handleConnectUser = async (userId: string) => {
    // Check if connection already exists
    const existingConnection = connections.find(conn => 
      (conn.senderId === user?.id && conn.receiverId === userId) ||
      (conn.receiverId === user?.id && conn.senderId === userId)
    );

    if (existingConnection) {
      if (existingConnection.status === 'accepted') {
        openChat(existingConnection);
      } else {
        toast({
          title: "Connection Already Exists",
          description: "You already have a pending request with this user.",
          variant: "destructive",
        });
      }
      return;
    }

    createConnectionMutation.mutate(userId);
  };

  // Auto-open chat for specific user if specified in URL
  useEffect(() => {
    console.log('🔍 DM Auto-connect check:', { targetUserId, connectionsCount: connections.length, nearbyUsersCount: nearbyUsers.length });
    
    if (targetUserId && connections.length >= 0 && nearbyUsers.length >= 0) {
      // Check if there's already an existing connection
      const existingConnection = connections.find(conn => {
        const otherUser = getOtherUser(conn);
        console.log('🔍 Checking connection:', { connectionId: conn.id, otherUserId: otherUser?.id, targetUserId, status: conn.status });
        return otherUser?.id === targetUserId;
      });

      if (existingConnection && existingConnection.status === 'accepted') {
        console.log('✅ Opening existing chat with:', targetUserId);
        openChat(existingConnection);
      } else if (!existingConnection) {
        // Find the user in nearby users and auto-connect
        const targetUser = nearbyUsers.find(u => u.id === targetUserId);
        console.log('🔍 Target user found in nearby:', !!targetUser, targetUser?.fullName);
        if (targetUser) {
          console.log('🚀 Auto-connecting to user:', targetUserId);
          handleConnectUser(targetUserId);
        }
      } else {
        console.log('⏳ Connection exists but not accepted yet:', existingConnection.status);
      }
    }
  }, [targetUserId, connections, nearbyUsers]);

  // Filter users based on search query
  const filteredUsers = nearbyUsers.filter(user =>
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.rank?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.shipName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Return early if user is not authenticated (after all hooks)
  if (!user) {
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with Home Logo - Same as Discover Page */}
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
                  <p className="text-xs sm:text-sm text-orange-600 italic font-medium whitespace-nowrap">direct message</p>
                </div>
              </button>
              <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
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



        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <Card className="border-2 border-ocean-teal/20">
            <CardContent className="p-4">
              <TabsList className="grid w-full grid-cols-2 bg-gray-100/50">
                <TabsTrigger 
                  value="questions" 
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-600 hover:text-blue-600"
                >
                  Questions
                </TabsTrigger>
                <TabsTrigger 
                  value="users" 
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-600 hover:text-blue-600"
                >
                  Users
                </TabsTrigger>
              </TabsList>
            </CardContent>
          </Card>

          <TabsContent value="questions" className="space-y-6">
            <QuestionsTab />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            {/* Pending Connection Requests */}
        {pendingConnections.length > 0 && (
          <Card className="border-2 border-duck-yellow/50 bg-duck-yellow/5">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-duck-yellow">
                <Clock size={20} />
                <span>Pending Requests ({pendingConnections.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingConnections.map((connection) => {
                  const otherUser = getOtherUser(connection);
                  if (!otherUser) return null;
                  return (
                    <div key={connection.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-duck-yellow/30">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-12 h-12 border-2 border-duck-yellow/30">
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
                          <AvatarFallback className="bg-duck-yellow/20 text-duck-yellow font-bold">
                            {getInitials(otherUser.whatsAppDisplayName || otherUser.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold text-gray-900">{otherUser.fullName}</h4>
                          {otherUser.rank && (
                            <p className="text-sm text-gray-600">{otherUser.rank}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          className="bg-ocean-teal hover:bg-cyan-600 text-white"
                          onClick={() => {
                            // Accept connection logic would go here
                            toast({
                              title: "Feature Coming Soon",
                              description: "Accept/reject functionality will be implemented next.",
                            });
                          }}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Conversations */}
        {activeConnections.length > 0 && (
          <Card className="border-2 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-green-700">
                <MessageCircle size={20} />
                <span>Active Conversations ({activeConnections.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {activeConnections.map((connection) => {
                  const otherUser = getOtherUser(connection);
                  if (!otherUser) return null;
                  return (
                    <div key={connection.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-green-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <Avatar className="w-12 h-12 border-2 border-green-300">
                            <AvatarFallback className="bg-green-100 text-green-700 font-bold">
                              {getInitials(otherUser.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <MessageNotificationDot userId={otherUser.id} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{otherUser.fullName}</h4>
                          {otherUser.rank && (
                            <p className="text-sm text-gray-600">{otherUser.rank}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            Connected {formatDistanceToNow(new Date(connection.acceptedAt || connection.createdAt || new Date()))} ago
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-ocean-teal to-cyan-600 text-white hover:from-cyan-600 hover:to-ocean-teal"
                        onClick={() => {
                          openChat(connection);
                          // Mark messages as read when opening chat
                          if (connection.id) {
                            websocketService.markMessagesAsRead(connection.id);
                          }
                        }}
                      >
                        Open Chat
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search Users Bar */}
        <Card className="border-2 border-ocean-teal/20">
          <CardHeader>
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2 text-navy">
                  <User size={20} />
                  <span>Search Users</span>
                  <Badge variant="secondary" className="ml-2">
                    {filteredUsers.length} Users
                  </Badge>
                </CardTitle>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  type="text"
                  placeholder="Search users by name, rank, ship, location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-ocean-teal/30 focus:border-ocean-teal"
                />
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Discover Maritime Professionals */}
        <Card className="border-2 border-ocean-teal/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-navy">
              <Navigation size={20} />
              <span>Top Q Professionals ({filteredUsers.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-gradient-to-r from-navy to-blue-800 rounded-full flex items-center justify-center mb-4">
                  <User size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Professionals Found</h3>
                <p className="text-gray-600">
                  {searchQuery ? "Try adjusting your search terms" : "No maritime professionals available nearby"}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredUsers.map((userProfile) => {
                  const existingConnection = connections.find(conn => 
                    (conn.senderId === user?.id && conn.receiverId === userProfile.id) ||
                    (conn.receiverId === user?.id && conn.senderId === userProfile.id)
                  );

                  return (
                    <Card 
                      key={userProfile.id} 
                      className="border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => setLocation(`/user/${userProfile.id}`)}
                    >
                      <CardContent className="p-4">
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
                              ) : null}
                              <AvatarFallback className="bg-ocean-teal/20 text-ocean-teal font-bold">
                                {getInitials(userProfile.whatsAppDisplayName || userProfile.fullName)}
                              </AvatarFallback>
                            </Avatar>
                            <MessageNotificationDot userId={userProfile.id} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate">{userProfile.fullName}</h4>
                            {userProfile.rank && (
                              <p className="text-sm text-gray-600 truncate">
                                {userProfile.rank} {userProfile.questionCount !== undefined && 
                                  <span className="text-xs text-blue-600 font-medium">
                                    {userProfile.questionCount}Q
                                  </span>
                                }
                              </p>
                            )}
                            <div className="flex items-center mt-1 text-xs text-gray-500">
                              <MapPin size={12} className="mr-1" />
                              <span className="truncate">{formatDistance(userProfile.distance)}</span>
                            </div>
                          </div>
                        </div>

                        {userProfile.shipName && (
                          <div className="flex items-center mb-3 text-sm text-gray-600">
                            <Ship size={14} className="mr-2 text-ocean-teal" />
                            <span className="truncate">{userProfile.shipName}</span>
                          </div>
                        )}

                        {userProfile.city && (
                          <div className="flex items-center mb-3 text-sm text-gray-600">
                            <MapPin size={14} className="mr-2 text-ocean-teal" />
                            <span className="truncate">{userProfile.city}</span>
                          </div>
                        )}

                        {userProfile.company ? (
                          <Badge 
                            variant="secondary" 
                            className="mb-3 bg-gray-100 text-gray-700"
                          >
                            {userProfile.company}
                          </Badge>
                        ) : userProfile.userType === 'sailor' ? (
                          <Badge 
                            variant="secondary" 
                            className="mb-3 bg-navy/10 text-navy"
                          >
                            Sailor
                          </Badge>
                        ) : null}

                        <div onClick={(e) => e.stopPropagation()}>
                          {existingConnection ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              disabled
                            >
                              {existingConnection.status === 'accepted' ? 'Connected' : 
                               existingConnection.status === 'pending' ? 'Request Sent' : 'Connection Declined'}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="w-full bg-gradient-to-r from-ocean-teal to-cyan-600 hover:from-cyan-600 hover:to-ocean-teal text-[#191c25]"
                              onClick={() => handleConnectUser(userProfile.id)}
                              disabled={createConnectionMutation.isPending}
                            >
                              {createConnectionMutation.isPending ? 'Connecting...' : 'Connect'}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sent Requests */}
        {sentRequests.length > 0 && (
          <Card className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-gray-700">
                <Clock size={20} />
                <span>Sent Requests ({sentRequests.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sentRequests.map((connection) => {
                  const otherUser = getOtherUser(connection);
                  if (!otherUser) return null;
                  return (
                    <div key={connection.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-10 h-10 border-2 border-gray-300">
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
                          <AvatarFallback className="bg-gray-200 text-gray-600 font-bold text-sm">
                            {getInitials(otherUser.whatsAppDisplayName || otherUser.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium text-gray-900">{otherUser.fullName}</h4>
                          {otherUser.rank && (
                            <p className="text-sm text-gray-600">{otherUser.rank}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-gray-600">
                        Waiting for response
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
          </TabsContent>
        </Tabs>
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