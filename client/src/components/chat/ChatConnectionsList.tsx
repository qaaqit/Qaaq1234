import { useState } from 'react';
import { MessageCircle, User, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { format, formatDistanceToNow } from 'date-fns';
import RealTimeChatWindow from './RealTimeChatWindow';

interface ChatConnection {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
  createdAt: string;
  acceptedAt?: string;
  sender: {
    id: string;
    fullName: string;
    rank?: string;
  };
  receiver: {
    id: string;
    fullName: string;
    rank?: string;
  };
  lastMessage?: {
    message: string;
    createdAt: string;
    senderId: string;
    isRead: boolean;
  };
  unreadCount: number;
}

interface ChatConnectionsListProps {
  currentUserId: string;
}

export default function ChatConnectionsList({ currentUserId }: ChatConnectionsListProps) {
  const [selectedConnection, setSelectedConnection] = useState<ChatConnection | null>(null);

  // Fetch chat connections
  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['chat-connections'],
    queryFn: async () => {
      const response = await apiRequest('/api/chat/connections');
      return response.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch unread counts
  const { data: unreadCounts = {} } = useQuery({
    queryKey: ['chat-unread-counts'],
    queryFn: async () => {
      const response = await apiRequest('/api/chat/unread-counts');
      return response.json();
    },
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  const handleConnectionClick = (connection: ChatConnection) => {
    setSelectedConnection(connection);
  };

  const handleCloseChat = () => {
    setSelectedConnection(null);
  };

  if (selectedConnection) {
    const otherUser = selectedConnection.senderId === currentUserId 
      ? selectedConnection.receiver 
      : selectedConnection.sender;

    return (
      <RealTimeChatWindow
        connectionId={selectedConnection.id}
        recipientName={otherUser.fullName}
        recipientRank={otherUser.rank}
        onClose={handleCloseChat}
        currentUserId={currentUserId}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <MessageCircle size={48} className="mb-4" />
        <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
        <p className="text-center text-sm">
          Start a conversation by clicking on a user's profile in the map discovery.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
      </div>
      
      <div className="divide-y divide-gray-200">
        {connections.map((connection) => {
          const otherUser = connection.senderId === currentUserId 
            ? connection.receiver 
            : connection.sender;
          
          const unreadCount = unreadCounts[connection.id] || 0;
          const lastMessage = connection.lastMessage;
          
          return (
            <button
              key={connection.id}
              onClick={() => handleConnectionClick(connection)}
              className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start space-x-3">
                {/* Avatar */}
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <User size={24} className="text-white" />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {otherUser.fullName}
                    </h3>
                    <div className="flex items-center space-x-2">
                      {lastMessage && (
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true })}
                        </span>
                      )}
                      {unreadCount > 0 && (
                        <span className="bg-orange-500 text-white text-xs rounded-full px-2 py-1 min-w-5 h-5 flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {otherUser.rank && (
                    <p className="text-sm text-gray-500 mb-1">{otherUser.rank}</p>
                  )}
                  
                  {lastMessage ? (
                    <p className="text-sm text-gray-600 truncate">
                      {lastMessage.senderId === currentUserId ? 'You: ' : ''}
                      {lastMessage.message}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      Connection established {formatDistanceToNow(new Date(connection.createdAt), { addSuffix: true })}
                    </p>
                  )}
                  
                  {/* Connection Status */}
                  {connection.status === 'pending' && (
                    <div className="flex items-center mt-2 text-xs text-orange-600">
                      <Clock size={12} className="mr-1" />
                      Pending acceptance
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}