import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { X, Send, Check, CheckCheck, Clock, Anchor, MessageCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import type { ChatConnection, ChatMessage } from "@shared/schema";

interface QChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  connection?: ChatConnection & {
    sender: { id: string; fullName: string; rank?: string };
    receiver: { id: string; fullName: string; rank?: string };
  };
}

export default function QChatWindow({ isOpen, onClose, connection }: QChatWindowProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const otherUser = connection?.sender?.id === user?.id ? connection?.receiver : connection?.sender;

  // Get messages for this connection
  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ['/api/chat/messages', connection?.id],
    queryFn: async () => {
      if (!connection?.id) return [];
      const response = await fetch(`/api/chat/messages/${connection.id}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!connection?.id && isOpen,
    refetchInterval: 2000, // Poll for new messages every 2 seconds
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: connection?.id, message: messageText })
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
      const response = await fetch(`/api/chat/accept/${connection?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
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

  // Simulate typing indicator
  useEffect(() => {
    if (message.length > 0) {
      setIsTyping(true);
      const timer = setTimeout(() => setIsTyping(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [message]);

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
      return msg.isRead ? <CheckCheck size={14} className="text-ocean-teal" /> : <Check size={14} className="text-gray-400" />;
    }
    return null;
  };

  if (!isOpen || !connection) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md h-[600px] bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 shadow-2xl border-2 border-navy/20">
        {/* Header */}
        <CardHeader className="bg-gradient-to-r from-navy to-blue-800 text-white p-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10 border-2 border-white/30">
                <AvatarFallback className="bg-ocean-teal text-white font-bold">
                  {getInitials(otherUser?.fullName || 'U')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-sm">{otherUser?.fullName || 'Marine Professional'}</h3>
                <div className="flex items-center space-x-2">
                  {otherUser?.rank && (
                    <Badge className="bg-white/20 text-white text-xs px-2 py-0.5">
                      {otherUser.rank}
                    </Badge>
                  )}
                  <span className="text-xs text-blue-100">
                    {connection.status === 'accepted' ? 'Connected' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Anchor size={16} className="text-blue-200" />
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/20 p-1"
              >
                <X size={18} />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Messages Area */}
        <CardContent className="flex-1 p-0 h-[400px] overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Connection Status */}
            {connection.status === 'pending' && connection.receiverId === user?.id && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 p-4">
                <div className="text-center">
                  <p className="text-amber-800 text-sm mb-2">
                    <MessageCircle className="inline mr-1" size={14} />
                    {connection.sender?.fullName} wants to connect with you
                  </p>
                  <Button
                    onClick={() => acceptMutation.mutate()}
                    disabled={acceptMutation.isPending}
                    className="bg-gradient-to-r from-navy to-blue-800 text-white hover:from-blue-800 hover:to-navy px-4 py-2 text-sm"
                  >
                    {acceptMutation.isPending ? 'Accepting...' : 'Accept & Start Chatting'}
                  </Button>
                </div>
              </div>
            )}

            {connection.status === 'pending' && connection.senderId === user?.id && (
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-200 p-4">
                <div className="text-center">
                  <Clock className="inline mr-2" size={16} />
                  <span className="text-blue-800 text-sm">
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
                        className={`
                          max-w-[70%] p-3 rounded-2xl shadow-sm
                          ${isOwn 
                            ? 'bg-gradient-to-r from-navy to-blue-800 text-white rounded-br-md' 
                            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                          }
                        `}
                      >
                        <p className="text-sm leading-relaxed">{msg.message}</p>
                        <div className={`flex items-center justify-end mt-1 space-x-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
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
              <div ref={messagesEndRef} />
            </div>
          </div>
        </CardContent>

        {/* Message Input */}
        {connection.status === 'accepted' && (
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your maritime message..."
                  className="pr-12 border-gray-300 focus:border-navy focus:ring-navy/20"
                  disabled={sendMessageMutation.isPending}
                />
                {isTyping && (
                  <div className="absolute right-3 top-3">
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-ocean-teal rounded-full animate-bounce" />
                      <div className="w-1 h-1 bg-ocean-teal rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-1 h-1 bg-ocean-teal rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                )}
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || sendMessageMutation.isPending}
                className="bg-gradient-to-r from-navy to-blue-800 hover:from-blue-800 hover:to-navy text-white p-3"
              >
                {sendMessageMutation.isPending ? (
                  <div className="animate-spin">
                    <Send size={16} />
                  </div>
                ) : (
                  <Send size={16} />
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}