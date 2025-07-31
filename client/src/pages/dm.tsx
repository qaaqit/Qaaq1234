import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MessageCircle, Anchor, Navigation, Search, MapPin, Clock, User, Ship } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import QChatWindow from "@/components/qchat-window";
import UserDropdown from "@/components/user-dropdown";
import type { ChatConnection, User as UserType } from "@shared/schema";

interface ExtendedChatConnection extends ChatConnection {
  sender: { id: string; fullName: string; rank?: string };
  receiver: { id: string; fullName: string; rank?: string };
}

interface UserWithDistance extends UserType {
  distance: number;
}

export default function DMPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConnection, setSelectedConnection] = useState<ExtendedChatConnection | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

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
        <div className="gradient-bg text-white px-4 py-6 rounded-xl shadow-lg mb-6 relative z-[9998]">
          <div className="absolute inset-0 opacity-10 rounded-xl">
            <div className="w-full h-full bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Cpath%20d%3D%22M20%2050h60m-50-20h40m-30%2040h20%22%20stroke%3D%22white%22%20stroke-width%3D%221%22%20fill%3D%22none%22%2F%3E%3C%2Fsvg%3E')] bg-[length:50px_50px]"></div>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setLocation('/')}
                className="flex items-center space-x-3 hover:bg-white/10 rounded-lg p-2 transition-colors"
              >
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <i className="fas fa-anchor text-xl text-white"></i>
                </div>
                <div>
                  <h1 className="text-2xl font-bold">QaaqConnect</h1>
                  <p className="text-sm text-white/60 italic font-medium">direct message</p>
                </div>
              </button>
              {user && <UserDropdown user={user} />}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <Card className="border-2 border-ocean-teal/20">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                placeholder="AI Search. Ask anything.."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-ocean-teal/30 focus:border-ocean-teal"
              />
            </div>
          </CardContent>
        </Card>

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
                          <AvatarFallback className="bg-duck-yellow/20 text-duck-yellow font-bold">
                            {getInitials(otherUser.fullName)}
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
                        <Avatar className="w-12 h-12 border-2 border-green-300">
                          <AvatarFallback className="bg-green-100 text-green-700 font-bold">
                            {getInitials(otherUser.fullName)}
                          </AvatarFallback>
                        </Avatar>
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
                        onClick={() => openChat(connection)}
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
                          <Avatar className="w-12 h-12 border-2 border-ocean-teal/30">
                            <AvatarFallback className="bg-ocean-teal/20 text-ocean-teal font-bold">
                              {getInitials(userProfile.fullName)}
                            </AvatarFallback>
                          </Avatar>
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

                        <Badge 
                          variant="secondary" 
                          className={`mb-3 ${
                            userProfile.userType === 'sailor' 
                              ? 'bg-navy/10 text-navy' 
                              : 'bg-ocean-teal/10 text-ocean-teal'
                          }`}
                        >
                          {userProfile.userType === 'sailor' ? 'Sailor' : 'Local Guide'}
                        </Badge>

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
                              className="w-full bg-gradient-to-r from-ocean-teal to-cyan-600 text-white hover:from-cyan-600 hover:to-ocean-teal"
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
                          <AvatarFallback className="bg-gray-200 text-gray-600 font-bold text-sm">
                            {getInitials(otherUser.fullName)}
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
      </div>
      {/* QChat Window */}
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