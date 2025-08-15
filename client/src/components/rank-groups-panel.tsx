import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Users, MessageCircle, Send, Shield, User, Anchor } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';


interface RankMember {
  id: string;
  fullName: string;
  maritimeRank: string;
  rank: string;
  city?: string;
  profilePictureUrl?: string;
  whatsAppDisplayName?: string;
  questionCount?: number;
  isOnline?: boolean;
}

interface RankMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRank: string;
  message: string;
  timestamp: string;
  messageType: 'text' | 'system';
}

export function RankGroupsPanel() {
  const [newMessage, setNewMessage] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const [messages, setMessages] = useState<RankMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  
  // Get user's maritime rank directly from Users table
  const userMaritimeRank = user?.maritimeRank || user?.rank;
  const displayRank = userMaritimeRank?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Maritime Professional';
  
  // If no rank is found, show message
  if (!userMaritimeRank) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500 py-12">
          <Anchor className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No Maritime Rank Found</p>
          <p className="text-sm">Please update your profile with your maritime rank to access rank groups.</p>
        </div>
      </div>
    );
  }

  // Fetch all users with same maritime rank
  const { data: rankMembers = [], isLoading: loadingMembers } = useQuery<RankMember[]>({
    queryKey: ['/api/users/by-rank', userMaritimeRank],
    queryFn: async () => {
      const response = await fetch(`/api/users/by-rank/${encodeURIComponent(userMaritimeRank)}`);
      if (!response.ok) throw new Error('Failed to fetch rank members');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Load initial messages on component mount
  const { isLoading: loadingMessages } = useQuery<RankMessage[]>({
    queryKey: ['/api/rank-chat', userMaritimeRank, 'messages'],
    queryFn: async () => {
      const response = await fetch(`/api/rank-chat/${encodeURIComponent(userMaritimeRank)}/messages`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      setMessages(data);
      return data;
    },
    enabled: !!userMaritimeRank,
  });
  
  // WebSocket connection for real-time messaging
  useEffect(() => {
    if (!userMaritimeRank || !user) return;
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    ws.onopen = () => {
      console.log('WebSocket connected for rank chat');
      setIsConnected(true);
      
      // Authenticate
      ws.send(JSON.stringify({
        type: 'auth',
        userId: user.id,
        userInfo: {
          fullName: user.fullName || 'Maritime Professional',
          maritimeRank: userMaritimeRank
        }
      }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'auth_success') {
        // Join rank room after authentication
        ws.send(JSON.stringify({
          type: 'join_rank_room',
          rank: userMaritimeRank
        }));
      } else if (data.type === 'rank_room_joined') {
        console.log(`Joined ${data.rank} chat room`);
      } else if (data.type === 'new_rank_message') {
        // Add new message to the list
        setMessages(prev => [...prev, data.message]);
      }
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
    
    return () => {
      ws.close();
    };
  }, [userMaritimeRank, user]);


  // Send message via WebSocket
  const sendMessage = () => {
    if (!newMessage.trim() || !wsRef.current || !isConnected) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'send_rank_message',
      message: newMessage.trim(),
      rank: userMaritimeRank
    }));
    
    setNewMessage('');
    console.log('Message sent via WebSocket!');
  };


  const handleSendMessage = () => {
    sendMessage();
  };

  if (loadingMembers) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Anchor className="h-6 w-6 text-orange-600" />
          <h2 className="text-2xl font-bold">Loading {displayRank} Professionals...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 1V ALL Chat Area - Full Height */}
      <div className="flex-1">
        <Card className="h-full flex flex-col bg-gradient-to-br from-orange-50 to-red-50 rounded-none border-0">
            <CardHeader className="border-b bg-white/80 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageCircle className="h-5 w-5 text-orange-600" />
                    <span>CEGroup</span>
                    <Badge className="bg-orange-100 text-orange-800">{rankMembers.length} Members</Badge>
                  </CardTitle>
                  <CardDescription>Connect with all maritime professionals of your rank</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full animate-pulse ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-xs text-gray-500">
                    {isConnected ? 'Real-time WebSocket' : 'Connecting...'}
                  </span>
                </div>
              </div>
            </CardHeader>

            {/* Messages Area */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
                </div>
              ) : messages.length > 0 ? (
                messages.map((message) => (
                  <div key={message.id} className="space-y-2">
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-xs">
                        {message.senderName?.charAt(0) || 'M'}
                      </div>
                      <span className="font-medium text-gray-700">{message.senderName}</span>
                      <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800">
                        {message.senderRank?.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-xs">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className={`p-3 rounded-lg ml-10 ${
                      message.senderId === user?.id 
                        ? 'bg-orange-100 border-l-4 border-orange-500 ml-auto max-w-xs' 
                        : 'bg-white/70 border border-gray-200 hover:bg-white transition-colors'
                    }`}>
                      <p className="text-sm text-gray-800">{message.message}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No messages yet in {displayRank} chat</p>
                  <p className="text-sm">Be the first to start the conversation with your maritime peers!</p>
                </div>
              )}
            </CardContent>

            {/* Message Input */}
            <div className="border-t bg-white/90 backdrop-blur-sm p-4">
              <div className="flex space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {user?.fullName?.charAt(0) || 'M'}
                </div>
                <div className="flex-1 space-y-2">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Share your thoughts with ${displayRank} peers...`}
                    className="border-orange-200 focus:ring-orange-500 focus:border-orange-500 bg-white/80"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      Press Enter to send • Shift+Enter for new line
                    </span>
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || !isConnected}
                      className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {isConnected ? `Send to All ${displayRank}s` : 'Connecting...'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
      </div>
    </div>
  );
}