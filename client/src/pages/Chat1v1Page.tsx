import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  Anchor,
  Ban
} from "lucide-react";
import { getStoredUser } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import MessageStatus from "@/components/MessageStatus";

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
  isDelivered?: boolean;
  readAt?: string;
  deliveredAt?: string;
}

export default function ChatPage() {
  const [, params] = useRoute("/chat/:connectionId");
  const [, setLocation] = useLocation();
  const [user, setUser] = useState(getStoredUser());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const connectionId = params?.connectionId;

  // Check for Replit Auth user if no stored user
  useEffect(() => {
    if (!user) {
      const checkAuth = async () => {
        try {
          // Get JWT token from localStorage for QAAQ authentication
          const token = localStorage.getItem('auth_token');
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          
          if (token) {
            headers.Authorization = `Bearer ${token}`;
          }
          
          const response = await fetch('/api/auth/user', {
            credentials: 'include',
            headers,
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
      const response = await apiRequest(`/api/chat/connection/${connectionId}`, 'GET');
      return response.json();
    },
    enabled: !!connectionId,
  });

  // Fetch messages for this connection (initial load only)
  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ['/api/chat/messages', connectionId],
    queryFn: async () => {
      const response = await apiRequest(`/api/chat/messages/${connectionId}`, 'GET');
      return response.json();
    },
    enabled: !!connectionId,
    refetchInterval: false, // Disable polling - use WebSocket for real-time updates
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

  // Block connection mutation
  const blockConnectionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/chat/block/${connectionId}`, 'POST');
    },
    onSuccess: () => {
      // Navigate back to DM page after blocking
      setLocation("/dm");
      queryClient.invalidateQueries({ queryKey: ['/api/chat/connections'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to block connection. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Set up WebSocket connection for real-time messaging
  useEffect(() => {
    if (!connectionId || !user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected for chat');
      setSocket(ws);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new_message' && data.connectionId === connectionId) {
          // Update messages in real-time
          queryClient.setQueryData(['/api/chat/messages', connectionId], (oldMessages: ChatMessage[] | undefined) => {
            return [...(oldMessages || []), {
              id: data.message.id,
              connectionId: data.message.connectionId,
              senderId: data.message.senderId,
              content: data.message.content,
              messageType: 'text',
              sentAt: data.message.createdAt || new Date().toISOString(),
              isRead: data.message.isRead
            }];
          });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setSocket(null);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [connectionId, user, queryClient]);

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
      <div className="flex flex-col h-[90vh] bg-gray-50">
        <div className="p-4 text-center">
          <p>Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[90vh] bg-gradient-to-br from-slate-50 via-blue-50 to-orange-50">
      {/* Compact Chat Header - Optimized for Mobile */}
      <div className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 shadow-lg relative overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 bg-black/10"></div>
        
        <div className="relative z-10 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackClick}
              className="text-white hover:bg-white/20 p-1.5"
              data-testid="button-back-to-dm"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Avatar className="w-10 h-10 border-2 border-white/30">
                  {otherUser?.profile ? (
                    <AvatarImage 
                      src={otherUser.profile} 
                      alt={otherUser.name}
                      className="object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="bg-white/20 text-white font-bold text-sm">
                    {otherUser?.name?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                
                {/* Online Status Indicator */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border border-white">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse m-0.5"></div>
                </div>
              </div>
              
              <div className="min-w-0">
                <h2 className="font-bold text-white text-base truncate" data-testid="text-chat-user-name">
                  {otherUser?.name || 'Unknown User'}
                </h2>
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse"></div>
                  <p className="text-white/90 text-xs font-medium">Online</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-0.5">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:bg-white/20 p-2 rounded-full"
              data-testid="button-voice-call"
            >
              <Phone className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:bg-white/20 p-2 rounded-full"
              data-testid="button-video-call"
            >
              <Video className="w-4 h-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:bg-white/20 p-2 rounded-full"
                  data-testid="button-more-options"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem 
                  onClick={() => blockConnectionMutation.mutate()}
                  className="text-red-600 focus:text-red-700 cursor-pointer"
                  data-testid="menu-block-user"
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Block User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Compact Messages Area - Mobile Optimized */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-blue-50/30 to-orange-50/30 min-h-0">
        {messagesLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-orange-300 border-t-orange-600 mb-3"></div>
              <p className="text-gray-600 text-sm font-medium">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center mb-4">
              <Anchor className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Start chatting!</h3>
            <p className="text-gray-600 text-sm px-4">Send your first message to connect with this maritime professional.</p>
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
                  <Avatar className="w-6 h-6 mb-1">
                    {otherUser?.profile ? (
                      <AvatarImage src={otherUser.profile} alt={otherUser.name} />
                    ) : null}
                    <AvatarFallback className="bg-orange-100 text-orange-700 text-xs font-bold">
                      {otherUser?.name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className={`max-w-xs ${!isMyMessage && !showAvatar ? 'ml-8' : ''}`}>
                  <div
                    className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                      isMyMessage
                        ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-br-md'
                        : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    
                    <div className={`flex items-center justify-between mt-1.5 ${isMyMessage ? 'text-orange-100' : 'text-gray-500'}`}>
                      <p className="text-xs">
                        {(() => {
                          try {
                            const date = new Date(message.sentAt);
                            if (isNaN(date.getTime())) {
                              return 'just now';
                            }
                            return formatDistanceToNow(date, { addSuffix: true });
                          } catch (error) {
                            return 'just now';
                          }
                        })()}
                      </p>
                      
                      {isMyMessage && (
                        <MessageStatus 
                          isRead={message.isRead}
                          isDelivered={true}
                          readAt={message.readAt}
                          deliveredAt={message.deliveredAt || message.sentAt}
                          className="ml-2"
                        />
                      )}
                    </div>
                  </div>
                </div>
                
                {isMyMessage && showAvatar && (
                  <Avatar className="w-6 h-6 mb-1">
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

      {/* Compact Message Input - Mobile Optimized */}
      <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200 p-3 shadow-lg flex-shrink-0">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <Button 
            type="button"
            variant="ghost" 
            size="sm" 
            className="text-gray-500 hover:text-orange-600 hover:bg-orange-50 p-1.5 rounded-full flex-shrink-0"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="w-full pl-3 pr-10 py-2.5 rounded-full border-2 border-gray-200 focus:border-orange-400 focus:ring-1 focus:ring-orange-200 bg-gray-50 placeholder:text-gray-500 text-sm"
              disabled={sendMessageMutation.isPending}
              data-testid="input-message"
            />
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1.5 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-orange-600 p-1 rounded-full"
            >
              <Smile className="w-4 h-4" />
            </Button>
          </div>
          
          {newMessage.trim() ? (
            <Button
              type="submit"
              size="sm"
              disabled={sendMessageMutation.isPending}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white p-2.5 rounded-full shadow-md hover:shadow-lg transition-all duration-200 flex-shrink-0"
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-orange-600 hover:bg-orange-50 p-2.5 rounded-full flex-shrink-0"
            >
              <Mic className="w-4 h-4" />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}