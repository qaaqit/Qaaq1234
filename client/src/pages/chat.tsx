import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle, Users, Clock, CheckCircle, X, Anchor } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import QChatWindow from "@/components/qchat-window";
import { formatDistanceToNow } from "date-fns";
import type { ChatConnection } from "@shared/schema";

interface ExtendedChatConnection extends ChatConnection {
  sender: { id: string; fullName: string; rank?: string };
  receiver: { id: string; fullName: string; rank?: string };
}

export default function ChatPage() {
  const [selectedConnection, setSelectedConnection] = useState<ExtendedChatConnection | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { user } = useAuth();

  // Fetch user's chat connections
  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['/api/chat/connections'],
    refetchInterval: 5000, // Poll every 5 seconds for new connections
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
    return connection.sender?.id === user?.id ? connection.receiver : connection.sender;
  };

  const getConnectionStatus = (connection: ExtendedChatConnection) => {
    switch (connection.status) {
      case 'accepted':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', text: 'Connected' };
      case 'pending':
        return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', text: 'Pending' };
      case 'rejected':
        return { icon: X, color: 'text-red-600', bg: 'bg-red-100', text: 'Declined' };
      default:
        return { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100', text: 'Unknown' };
    }
  };

  const pendingConnections = connections.filter((conn: ExtendedChatConnection) => 
    conn.status === 'pending' && conn.receiverId === user?.id
  );
  
  const activeConnections = connections.filter((conn: ExtendedChatConnection) => 
    conn.status === 'accepted'
  );

  const sentRequests = connections.filter((conn: ExtendedChatConnection) => 
    conn.status === 'pending' && conn.senderId === user?.id
  );

  const openChat = (connection: ExtendedChatConnection) => {
    setSelectedConnection(connection);
    setIsChatOpen(true);
  };

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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-navy to-blue-800 rounded-full">
              <MessageCircle className="text-white" size={24} />
            </div>
            <h1 className="text-3xl font-bold text-navy">QChat Maritime</h1>
            <Anchor className="text-ocean-teal" size={24} />
          </div>
          <p className="text-gray-600">Connect with maritime professionals worldwide</p>
        </div>

        {/* Pending Connection Requests */}
        {pendingConnections.length > 0 && (
          <Card className="border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-amber-800">
                <Clock size={20} />
                <span>Pending Requests ({pendingConnections.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingConnections.map((connection: ExtendedChatConnection) => {
                const otherUser = getOtherUser(connection);
                return (
                  <div key={connection.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-amber-200">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-12 h-12 border-2 border-amber-300">
                        <AvatarFallback className="bg-gradient-to-r from-navy to-blue-800 text-white font-bold">
                          {getInitials(otherUser?.fullName || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-gray-900">{otherUser?.fullName}</h3>
                        {otherUser?.rank && (
                          <Badge className="bg-navy/10 text-navy text-xs">
                            {otherUser.rank}
                          </Badge>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(connection.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => openChat(connection)}
                      className="bg-gradient-to-r from-navy to-blue-800 text-white hover:from-blue-800 hover:to-navy"
                    >
                      Review Request
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Active Conversations */}
        <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-800">
              <Users size={20} />
              <span>Active Chats ({activeConnections.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeConnections.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle size={48} className="mx-auto mb-4 text-gray-400" />
                <p>No active conversations yet</p>
                <p className="text-sm">Use the "QChat" button on user profiles to start connecting!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeConnections.map((connection: ExtendedChatConnection) => {
                  const otherUser = getOtherUser(connection);
                  const status = getConnectionStatus(connection);
                  
                  return (
                    <div key={connection.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-green-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-12 h-12 border-2 border-green-300">
                          <AvatarFallback className="bg-gradient-to-r from-ocean-teal to-cyan-600 text-white font-bold">
                            {getInitials(otherUser?.fullName || 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-gray-900">{otherUser?.fullName}</h3>
                          <div className="flex items-center space-x-2">
                            {otherUser?.rank && (
                              <Badge className="bg-ocean-teal/10 text-ocean-teal text-xs">
                                {otherUser.rank}
                              </Badge>
                            )}
                            <div className={`flex items-center space-x-1 ${status.color}`}>
                              <status.icon size={12} />
                              <span className="text-xs">{status.text}</span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Connected {formatDistanceToNow(new Date(connection.acceptedAt || connection.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => openChat(connection)}
                        className="bg-gradient-to-r from-ocean-teal to-cyan-600 text-white hover:from-cyan-600 hover:to-ocean-teal"
                      >
                        Open Chat
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sent Requests */}
        {sentRequests.length > 0 && (
          <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-blue-800">
                <Clock size={20} />
                <span>Sent Requests ({sentRequests.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sentRequests.map((connection: ExtendedChatConnection) => {
                const otherUser = getOtherUser(connection);
                return (
                  <div key={connection.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-12 h-12 border-2 border-blue-300">
                        <AvatarFallback className="bg-gradient-to-r from-blue-600 to-blue-800 text-white font-bold">
                          {getInitials(otherUser?.fullName || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-gray-900">{otherUser?.fullName}</h3>
                        {otherUser?.rank && (
                          <Badge className="bg-blue-100 text-blue-800 text-xs">
                            {otherUser.rank}
                          </Badge>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Sent {formatDistanceToNow(new Date(connection.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">
                      Waiting for response
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {connections.length === 0 && (
          <Card className="border-2 border-gray-200">
            <CardContent className="text-center py-12">
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-gradient-to-r from-navy to-blue-800 rounded-full flex items-center justify-center">
                  <MessageCircle className="text-white" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Start Your Maritime Network</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Discover maritime professionals on the map and use the "QChat" button to send connection requests. 
                  Build your professional network across the seas!
                </p>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                  <Anchor size={16} />
                  <span>Navigate to the map to find professionals near you</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* QChat Window */}
      <QChatWindow
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        connection={selectedConnection}
      />
    </div>
  );
}