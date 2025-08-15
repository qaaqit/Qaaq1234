import React, { useState, useEffect } from 'react';
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
  const [showMembersPage, setShowMembersPage] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Get user's maritime rank directly from Users table
  const userMaritimeRank = (user as any)?.maritimeRank || (user as any)?.rank;
  const displayRank = userMaritimeRank?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Maritime Professional';
  
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

  // Fetch messages for the rank-based chat
  const { data: messages = [], isLoading: loadingMessages } = useQuery<RankMessage[]>({
    queryKey: ['/api/rank-chat', userMaritimeRank, 'messages'],
    queryFn: async () => {
      const response = await fetch(`/api/rank-chat/${encodeURIComponent(userMaritimeRank)}/messages`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    refetchInterval: 3000, // Refresh every 3 seconds for real-time chat
  });


  // Send message mutation for rank chat
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message }: { message: string }) => {
      const response = await fetch(`/api/rank-chat/${encodeURIComponent(userMaritimeRank)}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          senderRank: userMaritimeRank,
        }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ 
        queryKey: ['/api/rank-chat', userMaritimeRank, 'messages'] 
      });
      console.log('Message sent to rank chat!');
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
    },
  });


  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    sendMessageMutation.mutate({
      message: newMessage.trim(),
    });
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

  // Sort members alphabetically by name for the members page
  const sortedMembers = [...rankMembers].sort((a, b) => 
    (a.fullName || '').localeCompare(b.fullName || '', undefined, { sensitivity: 'base' })
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
            <Anchor className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {showMembersPage ? `${displayRank} Members` : `${displayRank} Group Chat`}
            </h2>
          </div>
          {(user as any)?.isAdmin && <Shield className="h-5 w-5 text-orange-600" />}
        </div>
        <div className="flex items-center space-x-2">
          {showMembersPage && (
            <Button
              onClick={() => setShowMembersPage(false)}
              variant="outline"
              size="sm"
              className="text-orange-600 border-orange-300 hover:bg-orange-50"
            >
              Back to Chat
            </Button>
          )}
        </div>
      </div>
      
      {showMembersPage ? (
        /* Group Members Page */
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg border border-orange-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="h-6 w-6 text-orange-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    All {displayRank} Professionals
                  </h3>
                  <p className="text-sm text-gray-600">
                    {sortedMembers.length} members in this maritime rank group
                  </p>
                </div>
              </div>
              <Badge className="bg-orange-100 text-orange-800 text-lg px-3 py-1">
                {sortedMembers.length}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedMembers.map((member) => (
              <Card key={member.id} className="hover:shadow-md transition-shadow cursor-pointer border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-lg">
                      {member.fullName?.charAt(0) || 'M'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold text-gray-900 truncate">{member.fullName}</h4>
                        {member.isOnline && (
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Online"></div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{member.city || 'Unknown Port'}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Rank:</span>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        {(member.maritimeRank || member.rank || '').replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    
                    {member.questionCount !== undefined && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Q&A Activity:</span>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {member.questionCount} Q&As
                        </Badge>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        member.isOnline 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {member.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <Button 
                      size="sm" 
                      className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
                      onClick={() => {
                        // Handle direct message or contact action
                        console.log('Contact member:', member.fullName);
                      }}
                    >
                      <MessageCircle className="h-3 w-3 mr-1" />
                      Message
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {sortedMembers.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">No {displayRank} Professionals Found</h3>
              <p className="text-gray-500">There are currently no members in this maritime rank group.</p>
            </div>
          )}
        </div>
      ) : (
        /* Original Chat Interface */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Maritime Professionals List */}
          <div className="lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {displayRank} Professionals
              </h3>
              <Button
                variant={!showMembers ? "default" : "outline"}
                size="sm"
                onClick={() => setShowMembers(!showMembers)}
                className="flex items-center space-x-1"
              >
                <Users className="h-4 w-4" />
                <span>{rankMembers.length}</span>
              </Button>
            </div>
            
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {rankMembers.map((member) => (
                <Card key={member.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-sm">
                        {member.fullName?.charAt(0) || 'M'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900 truncate">{member.fullName}</p>
                          {member.isOnline && (
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>{member.city || 'Unknown Port'}</span>
                          {member.questionCount && (
                            <Badge variant="outline" className="text-xs">
                              {member.questionCount} Q&As
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* 1V ALL Chat Area */}
          <div className="lg:col-span-3">
            <Card className="h-[600px] flex flex-col bg-gradient-to-br from-orange-50 to-red-50">
              <CardHeader className="border-b bg-white/80 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                  <CardTitle className="flex items-center space-x-2">
                    <button 
                      onClick={() => setShowMembersPage(!showMembersPage)}
                      className="hover:bg-orange-100 p-1 rounded transition-colors"
                      title="View all group members"
                    >
                      <MessageCircle className="h-5 w-5 text-orange-600" />
                    </button>
                    <span>{displayRank} Group • 1V ALL</span>
                    <Badge className="bg-orange-100 text-orange-800">{rankMembers.length} Members</Badge>
                  </CardTitle>
                  <CardDescription>Connect with all maritime professionals of your rank</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600">Live Chat</span>
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
                      message.senderId === (user as any)?.id 
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
                  {(user as any)?.fullName?.charAt(0) || 'M'}
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
                      disabled={!newMessage.trim() || sendMessageMutation.isPending}
                      className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send to All {displayRank}s
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}