import React, { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { X, Send, Check, CheckCheck, Clock, Anchor, MessageCircle, Navigation, Compass } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import type { ChatConnection, ChatMessage } from "@shared/schema";
import { websocketService } from "@/services/websocket";

interface QChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  connection?: ChatConnection & {
    sender: { id: string; fullName: string; rank?: string; questionCount?: number; answerCount?: number; currentLatitude?: number; currentLongitude?: number; city?: string };
    receiver: { id: string; fullName: string; rank?: string; questionCount?: number; answerCount?: number; currentLatitude?: number; currentLongitude?: number; city?: string };
  };
}

// Utility functions for nautical calculations
const toRadians = (degrees: number) => degrees * (Math.PI / 180);
const toDegrees = (radians: number) => radians * (180 / Math.PI);

const calculateNauticalDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 3440.065; // Earth's radius in nautical miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const dLon = toRadians(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRadians(lat2));
  const x = Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
    Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(dLon);
  const bearing = toDegrees(Math.atan2(y, x));
  return (bearing + 360) % 360;
};

const formatBearing = (bearing: number): string => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(bearing / 22.5) % 16;
  return `${Math.round(bearing)}° ${directions[index]}`;
};

export default function QChatWindow({ isOpen, onClose, connection }: QChatWindowProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const otherUser = connection?.sender?.id === user?.id ? connection?.receiver : connection?.sender;
  
  // Calculate nautical distance and bearing if both users have coordinates
  const currentUser = connection?.sender?.id === user?.id ? connection?.sender : connection?.receiver;
  const nauticalData = useMemo(() => {
    if (currentUser?.currentLatitude && currentUser?.currentLongitude && 
        otherUser?.currentLatitude && otherUser?.currentLongitude) {
      const distance = calculateNauticalDistance(
        currentUser.currentLatitude, currentUser.currentLongitude,
        otherUser.currentLatitude, otherUser.currentLongitude
      );
      const bearing = calculateBearing(
        currentUser.currentLatitude, currentUser.currentLongitude,
        otherUser.currentLatitude, otherUser.currentLongitude
      );
      return { distance: Math.round(distance * 10) / 10, bearing };
    }
    return null;
  }, [currentUser, otherUser]);

  // Initialize WebSocket connection when chat opens
  useEffect(() => {
    if (isOpen && user) {
      websocketService.connect();
    }
  }, [isOpen, user]);

  // Get messages for this connection
  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ['/api/chat/messages', connection?.id],
    queryFn: async () => {
      if (!connection?.id) return [];
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/chat/messages/${connection.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!connection?.id && isOpen,
    refetchInterval: 2000, // Poll for new messages every 2 seconds
  });

  // Enhanced send message function using WebSocket
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      if (!connection?.id) throw new Error('No connection ID');
      
      // Send via WebSocket for real-time delivery
      websocketService.sendMessage(connection.id, messageText);
      
      // Also send via HTTP for reliability
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ connectionId: connection.id, message: messageText })
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ['/api/chat/messages', connection?.id] });
    }
  });

  // Accept connection mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/chat/accept/${connection?.id}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to accept connection');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/connections'] });
    }
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time WebSocket message handling
  useEffect(() => {
    if (isOpen && connection?.id) {
      // Listen for new messages
      const handleNewMessage = (data: any) => {
        if (data.connectionId === connection.id) {
          queryClient.invalidateQueries({ queryKey: ['/api/chat/messages', connection.id] });
        }
      };

      // Listen for typing indicators
      const handleTyping = (data: any) => {
        if (data.connectionId === connection.id && data.userId !== user?.id) {
          setOtherUserTyping(data.isTyping);
          if (data.isTyping) {
            // Auto-hide typing indicator after 3 seconds
            setTimeout(() => setOtherUserTyping(false), 3000);
          }
        }
      };

      websocketService.onMessage('new_message', handleNewMessage);
      websocketService.onMessage('user_typing', handleTyping);

      return () => {
        websocketService.offMessage('new_message');
        websocketService.offMessage('user_typing');
      };
    }
  }, [isOpen, connection?.id, queryClient, user?.id]);

  // Send typing indicator
  useEffect(() => {
    if (connection?.id && user) {
      const isTypingNow = message.length > 0;
      websocketService.sendTypingIndicator(connection.id, isTypingNow);
    }
  }, [message, connection?.id, user]);

  const handleSendMessage = () => {
    if (message.trim() && connection?.status === 'accepted') {
      sendMessageMutation.mutate(message.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getMessageStatus = (msg: ChatMessage) => {
    if (msg.senderId === user?.id) {
      return msg.isRead ? <CheckCheck size={14} className="text-red-200" /> : <Check size={14} className="text-red-300" />;
    }
    return null;
  };

  if (!isOpen || !connection) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md h-[600px] bg-white shadow-2xl border border-gray-200/50 rounded-2xl overflow-hidden">
        {/* Sleek Chat Header with Nautical Info */}
        <CardHeader className="bg-gradient-to-r from-red-600 via-orange-500 to-red-600 text-white p-4 relative overflow-hidden">
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 via-orange-400/20 to-red-600/20 opacity-30"></div>
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="w-12 h-12 border-2 border-white/40 shadow-lg">
                <AvatarFallback className="bg-white/20 backdrop-blur text-white font-bold text-lg">
                  {getInitials(otherUser?.fullName || 'MP')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-bold text-base text-white tracking-wide">
                  {otherUser?.fullName || 'Marine Professional'}
                </h3>
                <div className="flex items-center space-x-3 mt-1">
                  {otherUser?.rank && (
                    <Badge className="bg-white/25 backdrop-blur text-white text-xs px-2 py-0.5 border border-white/30">
                      {otherUser.rank.replace('_', ' ').toUpperCase()}
                    </Badge>
                  )}
                  <div className="flex items-center space-x-1 text-xs text-white/90">
                    <MessageCircle size={12} />
                    <span>{connection.status === 'accepted' ? 'Connected' : 'Pending'}</span>
                  </div>
                </div>
                
                {/* Nautical Distance & Bearing Display */}
                {nauticalData && (
                  <div className="flex items-center space-x-4 mt-2 text-xs text-white/95">
                    <div className="flex items-center space-x-1 bg-white/15 backdrop-blur px-2 py-1 rounded-full">
                      <Navigation size={12} />
                      <span className="font-medium">{nauticalData.distance} NM</span>
                    </div>
                    <div className="flex items-center space-x-1 bg-white/15 backdrop-blur px-2 py-1 rounded-full">
                      <Compass size={12} />
                      <span className="font-medium">{formatBearing(nauticalData.bearing)}</span>
                    </div>
                  </div>
                )}
                
                {/* City fallback if no coordinates */}
                {!nauticalData && (otherUser?.city || currentUser?.city) && (
                  <div className="flex items-center space-x-1 mt-2 text-xs text-white/95">
                    <Anchor size={12} />
                    <span>{otherUser?.city || currentUser?.city}</span>
                  </div>
                )}
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
            >
              <X size={18} />
            </Button>
          </div>
        </CardHeader>

        {/* Messages Area */}
        <CardContent className="flex-1 p-0 h-[400px] overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Connection Status */}
            {connection.status === 'pending' && connection.receiverId === user?.id && (
              <div className="bg-gradient-to-r from-orange-50 to-red-50 border-b border-orange-200 p-4">
                <div className="text-center">
                  <p className="text-orange-800 text-sm mb-3">
                    <MessageCircle className="inline mr-1" size={14} />
                    {connection.sender?.fullName} wants to connect with you
                  </p>
                  <Button
                    onClick={() => acceptMutation.mutate()}
                    disabled={acceptMutation.isPending}
                    className="bg-gradient-to-r from-red-600 to-orange-500 text-white hover:from-red-700 hover:to-orange-600 px-6 py-2 text-sm rounded-lg shadow-md transition-all duration-200"
                  >
                    {acceptMutation.isPending ? 'Accepting...' : 'Accept & Start Chatting'}
                  </Button>
                </div>
              </div>
            )}

            {connection.status === 'pending' && connection.senderId === user?.id && (
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200 p-4">
                <div className="text-center">
                  <Clock className="inline mr-2" size={16} />
                  <span className="text-gray-700 text-sm">
                    Waiting for {connection.receiver?.fullName} to accept your request...
                  </span>
                </div>
              </div>
            )}

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-50/50 to-white">
              {isLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-navy border-t-transparent" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <Anchor size={32} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">
                    {connection.status === 'accepted' 
                      ? 'Start your maritime conversation!' 
                      : 'No messages yet'}
                  </p>
                </div>
              ) : (
                messages.map((msg: ChatMessage) => {
                  const isOwn = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[70%] p-3 rounded-2xl shadow-sm ${
                          isOwn 
                            ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-br-md' 
                            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.message}</p>
                        <div className={`flex items-center justify-end mt-1 space-x-1 ${isOwn ? 'text-red-100' : 'text-gray-500'}`}>
                          <span className="text-xs">
                            {msg.createdAt ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true }) : 'just now'}
                          </span>
                          {getMessageStatus(msg)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              
              {/* Other user typing indicator */}
              {otherUserTyping && (
                <div className="flex justify-start">
                  <div className="max-w-[70%] p-3 rounded-2xl rounded-bl-md bg-white border border-gray-200 text-gray-800">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                      <span className="text-xs text-gray-500">{otherUser?.fullName} is typing...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>
        </CardContent>

        {/* Sleek Message Input */}
        {connection.status === 'accepted' && (
          <div className="p-4 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Send maritime message..."
                  className="pr-4 h-12 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 bg-white text-gray-800 placeholder-gray-500 shadow-sm transition-all duration-200"
                  disabled={sendMessageMutation.isPending}
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || sendMessageMutation.isPending}
                className="h-12 w-12 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white shadow-lg transition-all duration-200 flex items-center justify-center"
              >
                {sendMessageMutation.isPending ? (
                  <div className="animate-spin">
                    <Send size={18} />
                  </div>
                ) : (
                  <Send size={18} />
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}