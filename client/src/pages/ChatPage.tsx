import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Send, 
  Phone, 
  Video, 
  MoreHorizontal, 
  Paperclip, 
  Smile, 
  Mic,
  Check,
  CheckCheck,
  Clock,
  MapPin,
  Anchor
} from "lucide-react";
import { getStoredUser } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatConnection {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
  createdAt: string;
  senderName: string;
  receiverName: string;
  senderProfile?: string;
  receiverProfile?: string;
}

interface ChatMessage {
  id: string;
  connectionId: string;
  senderId: string;
  content: string;
  messageType: string;
  sentAt: string;
  isRead: boolean;
}

export default function ChatPage() {
  const [, params] = useRoute("/chat/:connectionId");
  const [, setLocation] = useLocation();
  const [user, setUser] = useState(getStoredUser());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const connectionId = params?.connectionId;

  // Check for Replit Auth user if no stored user
  useEffect(() => {
    if (!user) {
      const checkAuth = async () => {
        try {
          const response = await fetch('/api/auth/user', {
            credentials: 'include',
          });
          
          if (response.ok) {
            const replitUser = await response.json();
            if (replitUser) {
              setUser({
                id: replitUser.id,
                fullName: replitUser.fullName || replitUser.email,
                email: replitUser.email,
                userType: replitUser.userType || 'sailor',
                isAdmin: replitUser.isAdmin || false,
                nickname: replitUser.nickname,
                isVerified: true,
                loginCount: replitUser.loginCount || 0
              });
            }
          }
        } catch (error) {
          console.log('No auth session found');
        }
      };
      
      checkAuth();
    }
  }, [user]);

  // Fetch connection details
  const { data: connection, isLoading: connectionLoading } = useQuery<ChatConnection>({
    queryKey: ['/api/chat/connection', connectionId],
    queryFn: async () => {
      const response = await fetch(`/api/chat/connection/${connectionId}`);
      if (!response.ok) throw new Error('Failed to fetch connection');
      return response.json();
    },
    enabled: !!connectionId,
  });

  // Fetch messages for this connection
  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ['/api/chat/messages', connectionId],
    queryFn: async () => {
      const response = await fetch(`/api/chat/messages/${connectionId}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!connectionId,
    refetchInterval: 3000, // Poll for new messages every 3 seconds
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest('/api/chat/send', 'POST', {
        connectionId,
        content
      });
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ['/api/chat/messages', connectionId] });
    },
    onError: (error: any) => {
      toast({
        title: "Send Failed",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Get the other user's details
  const otherUser = connection && user ? (
    connection.senderId === user.id 
      ? { name: connection.receiverName, profile: connection.receiverProfile }
      : { name: connection.senderName, profile: connection.senderProfile }
  ) : null;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

  const handleBackClick = () => {
    setLocation("/dm");
  };

  if (!connectionId) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="p-4 text-center">
          <p>Invalid chat connection</p>
          <Button onClick={handleBackClick} variant="outline" className="mt-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Messages
          </Button>
        </div>
      </div>
    );
  }

  if (connectionLoading || !connection) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="p-4 text-center">
          <p>Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-orange-50">
      {/* Enhanced Chat Header with Maritime Theme */}
      <div className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        
        <div className="relative z-10 px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackClick}
              className="text-white hover:bg-white/20 p-2"
              data-testid="button-back-to-dm"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Avatar className="w-12 h-12 border-2 border-white/30">
                  {otherUser?.profile ? (
                    <AvatarImage 
                      src={otherUser.profile} 
                      alt={otherUser.name}
                      className="object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="bg-white/20 text-white font-bold text-lg">
                    {otherUser?.name?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                
                {/* Online Status Indicator */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              
              <div>
                <h2 className="font-bold text-white text-lg" data-testid="text-chat-user-name">
                  {otherUser?.name || 'Unknown User'}
                </h2>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                  <p className="text-white/90 text-sm font-medium">Online now</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:bg-white/20 p-3 rounded-full"
              data-testid="button-voice-call"
            >
              <Phone className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:bg-white/20 p-3 rounded-full"
              data-testid="button-video-call"
            >
              <Video className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:bg-white/20 p-3 rounded-full"
              data-testid="button-more-options"
            >
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-blue-50/30 to-orange-50/30">
        {messagesLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-300 border-t-orange-600 mb-4"></div>
              <p className="text-gray-600 font-medium">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center mb-6">
              <Anchor className="w-10 h-10 text-orange-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Start the conversation!</h3>
            <p className="text-gray-600 max-w-md">Send your first message to connect with this maritime professional and begin networking.</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isMyMessage = message.senderId === user?.id;
            const showAvatar = index === 0 || messages[index - 1]?.senderId !== message.senderId;
            
            return (
              <div
                key={message.id}
                className={`flex items-end space-x-2 ${isMyMessage ? 'justify-end flex-row-reverse space-x-reverse' : 'justify-start'}`}
                data-testid={`message-${message.id}`}
              >
                {!isMyMessage && showAvatar && (
                  <Avatar className="w-8 h-8 mb-1">
                    {otherUser?.profile ? (
                      <AvatarImage src={otherUser.profile} alt={otherUser.name} />
                    ) : null}
                    <AvatarFallback className="bg-orange-100 text-orange-700 text-xs font-bold">
                      {otherUser?.name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className={`max-w-xs lg:max-w-md ${!isMyMessage && !showAvatar ? 'ml-10' : ''}`}>
                  <div
                    className={`px-5 py-3 rounded-2xl shadow-md ${
                      isMyMessage
                        ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-br-md'
                        : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    
                    <div className={`flex items-center justify-between mt-2 ${isMyMessage ? 'text-orange-100' : 'text-gray-500'}`}>
                      <p className="text-xs">
                        {formatDistanceToNow(new Date(message.sentAt), { addSuffix: true })}
                      </p>
                      
                      {isMyMessage && (
                        <div className="flex items-center space-x-1">
                          {message.isRead ? (
                            <CheckCheck className="w-4 h-4 text-blue-200" />
                          ) : (
                            <Check className="w-4 h-4 text-orange-200" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {isMyMessage && showAvatar && (
                  <Avatar className="w-8 h-8 mb-1">
                    <AvatarFallback className="bg-orange-500 text-white text-xs font-bold">
                      {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Message Input */}
      <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200 p-4 shadow-lg">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Button 
              type="button"
              variant="ghost" 
              size="sm" 
              className="text-gray-500 hover:text-orange-600 hover:bg-orange-50 p-2 rounded-full"
            >
              <Paperclip className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="w-full pl-4 pr-12 py-3 rounded-full border-2 border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 bg-gray-50 placeholder:text-gray-500"
              disabled={sendMessageMutation.isPending}
              data-testid="input-message"
            />
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-orange-600 p-1 rounded-full"
            >
              <Smile className="w-5 h-5" />
            </Button>
          </div>
          
          {newMessage.trim() ? (
            <Button
              type="submit"
              size="sm"
              disabled={sendMessageMutation.isPending}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              data-testid="button-send-message"
            >
              <Send className="w-5 h-5" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-orange-600 hover:bg-orange-50 p-3 rounded-full"
            >
              <Mic className="w-5 h-5" />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}