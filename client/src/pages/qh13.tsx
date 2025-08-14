import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Phone, Video, MoreHorizontal, Circle, Check, CheckCheck, Crown, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";

interface ChatItem {
  id: string;
  userId: string;
  fullName: string;
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
  isActive?: boolean;
  profilePictureUrl?: string;
  maritimeRank?: string;
  status?: 'online' | 'offline';
  messageStatus?: 'sent' | 'delivered' | 'read';
}

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

export default function QH13Page() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<'all' | 'unread' | 'favourite'>('all');
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Fetch actual chat connections
  const { data: connectionsResponse } = useQuery<any[]>({
    queryKey: ['/api/chat/connections'],
    staleTime: 10 * 60 * 1000,
  });

  // Convert connections to chat items format
  const chatItems: ChatItem[] = (connectionsResponse || []).map((conn: any) => ({
    id: conn.id || `conn-${Math.random()}`,
    userId: conn.sender?.id === user?.id ? (conn.receiver?.id || conn.receiverId) : (conn.sender?.id || conn.senderId),
    fullName: conn.sender?.id === user?.id ? (conn.receiver?.fullName || 'Maritime Professional') : (conn.sender?.fullName || 'Maritime Professional'),
    lastMessage: conn.lastMessage || "Start a conversation...",
    timestamp: conn.updatedAt ? formatDistanceToNow(new Date(conn.updatedAt), { addSuffix: false }) : "Now",
    unreadCount: 0,
    isActive: conn.status === 'accepted',
    profilePictureUrl: conn.sender?.id === user?.id ? conn.receiver?.profilePictureUrl : conn.sender?.profilePictureUrl,
    maritimeRank: conn.sender?.id === user?.id ? conn.receiver?.maritimeRank : conn.sender?.maritimeRank,
    status: 'online' as const,
    messageStatus: 'read' as const
  }));

  // Add mock system messages and QAAQ chat for better UI demonstration
  const systemChats: ChatItem[] = [
    {
      id: "qaaq",
      userId: "qaaq",
      fullName: "QAAQ Support", 
      lastMessage: "Welcome to QaaqConnect! How can I help you today?",
      timestamp: "now",
      unreadCount: 0,
      profilePictureUrl: "/assets/qaaq-logo.png",
      messageStatus: 'read',
      status: 'online'
    },
    {
      id: "system-1",
      userId: "system",
      fullName: "Maritime Safety Alert",
      lastMessage: "Weather warning for your current region",
      timestamp: "2h",
      unreadCount: 1,
      messageStatus: 'delivered',
      status: 'online'
    }
  ];

  const allChats = [...systemChats, ...chatItems];

  // Fetch top professionals for additional contacts
  const { data: professionalsData } = useQuery<{ professionals: TopProfessional[] }>({
    queryKey: ['/api/users/top-professionals'],
    queryFn: async () => {
      const response = await fetch('/api/users/top-professionals');
      return response.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  const getInitials = (name: string) => {
    if (name.startsWith('+') || name.includes('User')) {
      return name.charAt(1) || name.charAt(0);
    }
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getMessageStatusIcon = (status?: string) => {
    switch (status) {
      case 'sent':
        return <Check size={16} className="text-gray-400" />;
      case 'delivered':
        return <CheckCheck size={16} className="text-gray-400" />;
      case 'read':
        return <CheckCheck size={16} className="text-orange-500" />;
      default:
        return null;
    }
  };

  const handleChatClick = (chat: ChatItem) => {
    // Navigate to DM page with the selected user
    setLocation(`/dm?user=${encodeURIComponent(chat.userId)}&name=${encodeURIComponent(chat.fullName)}`);
  };

  const filteredChats = allChats.filter(chat => {
    const matchesSearch = chat.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    
    switch (selectedTab) {
      case 'unread':
        return matchesSearch && (chat.unreadCount || 0) > 0;
      case 'favourite':
        return matchesSearch && chat.isActive;
      default:
        return matchesSearch;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-900">Chats</h1>
            <Button variant="ghost" size="sm" className="text-gray-600">
              <MoreHorizontal size={20} />
            </Button>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-100 border-0 rounded-lg text-sm"
              data-testid="input-search-chats"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 pb-3">
          <div className="flex space-x-2">
            <Button
              variant={selectedTab === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTab('all')}
              className={`rounded-full px-4 ${
                selectedTab === 'all' 
                  ? 'bg-orange-500 text-white hover:bg-orange-600' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              data-testid="button-filter-all"
            >
              All
            </Button>
            <Button
              variant={selectedTab === 'unread' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTab('unread')}
              className={`rounded-full px-4 ${
                selectedTab === 'unread' 
                  ? 'bg-orange-500 text-white hover:bg-orange-600' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              data-testid="button-filter-unread"
            >
              Unread
            </Button>
            <Button
              variant={selectedTab === 'favourite' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTab('favourite')}
              className={`rounded-full px-4 ${
                selectedTab === 'favourite' 
                  ? 'bg-orange-500 text-white hover:bg-orange-600' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              data-testid="button-filter-favourite"
            >
              Favourite
            </Button>
          </div>
        </div>
      </div>

      {/* Chat List */}
      <div className="divide-y divide-gray-200">
        {filteredChats.map((chat, index) => (
          <div
            key={chat.id}
            onClick={() => handleChatClick(chat)}
            className="bg-white px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
            data-testid={`chat-item-${chat.id}`}
          >
            <div className="flex items-center space-x-3">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="w-12 h-12">
                  {chat.profilePictureUrl ? (
                    <AvatarImage src={chat.profilePictureUrl} alt={chat.fullName} />
                  ) : (
                    <AvatarFallback 
                      className={`${
                        chat.userId === 'qaaq' 
                          ? 'bg-orange-500 text-white' 
                          : index % 2 === 0 
                            ? 'bg-red-500 text-white' 
                            : 'bg-gray-500 text-white'
                      } font-semibold`}
                    >
                      {getInitials(chat.fullName)}
                    </AvatarFallback>
                  )}
                </Avatar>
                {/* Online status indicator */}
                {chat.status === 'online' && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-500 border-2 border-white rounded-full" />
                )}
              </div>

              {/* Chat Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-medium text-gray-900 truncate">
                    {chat.fullName}
                  </h3>
                  <div className="flex items-center space-x-1">
                    {getMessageStatusIcon(chat.messageStatus)}
                    <span className="text-sm text-gray-500">
                      {chat.timestamp}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm text-gray-600 truncate">
                    {chat.lastMessage}
                  </p>
                  {chat.unreadCount && chat.unreadCount > 0 && (
                    <Badge className="bg-orange-500 text-white rounded-full h-5 min-w-5 text-xs flex items-center justify-center">
                      {chat.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {filteredChats.length === 0 && (
          <div className="bg-white p-8 text-center">
            <div className="text-gray-400 mb-2">
              <Search size={48} className="mx-auto" />
            </div>
            <p className="text-gray-500">
              {searchQuery ? 'No chats found' : 'No conversations yet'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {searchQuery ? 'Try a different search term' : 'Start a conversation with maritime professionals'}
            </p>
          </div>
        )}
      </div>

      {/* Floating Action Button for New Chat */}
      <div className="fixed bottom-20 right-4 z-50">
        <Button
          onClick={() => setLocation('/discover')}
          className="w-14 h-14 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
          data-testid="button-new-chat"
        >
          <MessageCircle size={24} />
        </Button>
      </div>

      {/* Quick Access to Top Professionals - Floating */}
      {professionalsData?.professionals && professionalsData.professionals.length > 0 && (
        <div className="fixed bottom-20 left-4 bg-white rounded-lg shadow-lg border border-gray-200 max-w-xs z-40">
          <div className="p-3">
            <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
              <Crown className="w-4 h-4 text-orange-500 mr-1" />
              Top Q Professionals
            </h3>
            <div className="space-y-1">
              {professionalsData.professionals.slice(0, 3).map((professional) => (
                <div
                  key={professional.id}
                  onClick={() => setLocation(`/dm?user=${encodeURIComponent(professional.id)}&name=${encodeURIComponent(professional.fullName)}`)}
                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-orange-50 cursor-pointer transition-colors"
                  data-testid={`professional-${professional.id}`}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={professional.profilePictureUrl} alt={professional.fullName} />
                    <AvatarFallback className="bg-orange-100 text-orange-800 text-xs font-semibold">
                      {getInitials(professional.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-medium text-gray-900 truncate">
                      {professional.fullName}
                    </h4>
                    <p className="text-xs text-gray-500 truncate">
                      Q: {professional.questionCount}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}