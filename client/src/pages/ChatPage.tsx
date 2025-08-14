import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Phone, Video, MoreHorizontal } from "lucide-react";
import { getStoredUser } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

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
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Chat Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackClick}
            data-testid="button-back-to-dm"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              {otherUser?.profile ? (
                <img 
                  src={otherUser.profile} 
                  alt={otherUser.name} 
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <span className="text-orange-600 font-semibold text-sm">
                  {otherUser?.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              )}
            </div>
            
            <div>
              <h2 className="font-semibold text-gray-900" data-testid="text-chat-user-name">
                {otherUser?.name || 'Unknown User'}
              </h2>
              <p className="text-sm text-gray-500">Online</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" data-testid="button-voice-call">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm" data-testid="button-video-call">
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm" data-testid="button-more-options">
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messagesLoading ? (
          <div className="text-center text-gray-500">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet</p>
            <p className="text-sm">Send a message to start the conversation</p>
          </div>
        ) : (
          messages.map((message) => {
            const isMyMessage = message.senderId === user?.id;
            return (
              <div
                key={message.id}
                className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                data-testid={`message-${message.id}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isMyMessage
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-900 border'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    isMyMessage ? 'text-orange-100' : 'text-gray-500'
                  }`}>
                    {formatDistanceToNow(new Date(message.sentAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t p-4">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
            disabled={sendMessageMutation.isPending}
            data-testid="input-message"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            className="bg-orange-500 hover:bg-orange-600 text-white"
            data-testid="button-send-message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}