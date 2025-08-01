import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Users, MessageCircle, Crown, UserPlus, Send, Shield, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface RankGroup {
  id: string;
  name: string;
  description: string;
  groupType: string;
  memberCount: number;
  isActive: boolean;
  createdAt: string;
}

interface UserGroup extends RankGroup {
  role: string;
  joinedAt: string;
  unreadCount: number;
}

interface GroupMessage {
  id: string;
  message: string;
  messageType: string;
  isAnnouncement: boolean;
  createdAt: string;
  sender: {
    id: string;
    fullName: string;
    rank: string;
    maritimeRank: string;
  };
}

export function RankGroupsPanel() {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch groups based on user role (admins see all, users see only their groups)
  const { data: groups = [], isLoading: loadingGroups } = useQuery<RankGroup[]>({
    queryKey: ['/api/rank-groups'],
    refetchInterval: user?.isAdmin ? 30000 : 10000, // Admin: all groups every 30s, Users: their groups every 10s
  });

  // Fetch messages for selected group
  const { data: messagesData } = useQuery({
    queryKey: ['/api/rank-groups', selectedGroup, 'messages'],
    enabled: !!selectedGroup,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch members for selected group
  const { data: membersData } = useQuery({
    queryKey: ['/api/rank-groups', selectedGroup, 'members'],
    enabled: !!selectedGroup,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const response = await fetch(`/api/rank-groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ role: 'member' }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rank-groups'] });
      toast({ title: 'Successfully joined the group!' });
    },
    onError: () => {
      toast({ title: 'Failed to join group', variant: 'destructive' });
    },
  });

  // Leave group mutation
  const leaveGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const response = await fetch(`/api/rank-groups/${groupId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rank-groups'] });
      setSelectedGroup(null);
      toast({ title: 'Successfully left the group!' });
    },
    onError: () => {
      toast({ title: 'Failed to leave group', variant: 'destructive' });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ groupId, message, isAnnouncement }: { 
      groupId: string; 
      message: string; 
      isAnnouncement: boolean;
    }) => {
      const response = await fetch(`/api/rank-groups/${groupId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          groupId,
          message,
          messageType: 'text',
          isAnnouncement,
        }),
      });
      return response.json();
    },
    onSuccess: () => {
      setNewMessage('');
      setIsAnnouncement(false);
      queryClient.invalidateQueries({ 
        queryKey: ['/api/rank-groups', selectedGroup, 'messages'] 
      });
      toast({ title: 'Message sent!' });
    },
    onError: () => {
      toast({ title: 'Failed to send message', variant: 'destructive' });
    },
  });

  // Auto-assign to groups
  const autoAssignMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/rank-groups/auto-assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rank-groups/my-groups'] });
      toast({ title: `Auto-assigned to groups: ${data?.assignedGroups?.join(', ') || 'None'}` });
    },
    onError: () => {
      toast({ title: 'Failed to auto-assign groups', variant: 'destructive' });
    },
  });

  const handleSendMessage = () => {
    if (!selectedGroup || !newMessage.trim()) return;
    
    sendMessageMutation.mutate({
      groupId: selectedGroup,
      message: newMessage.trim(),
      isAnnouncement,
    });
  };

  const isUserInGroup = (groupId: string) => {
    return groups.some((group: any) => group.id === groupId && group.role); // Has role means user is in group
  };

  const selectedGroupData = groups.find((group: RankGroup) => group.id === selectedGroup);

  if (loadingGroups) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Users className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Loading Maritime Rank Groups...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Users className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Maritime Rank Groups</h2>
          {user?.isAdmin && <Shield className="h-5 w-5 text-blue-600" />}
        </div>
        {!user?.isAdmin && (
          <Button 
            onClick={() => autoAssignMutation.mutate()}
            disabled={autoAssignMutation.isPending}
            variant="outline"
          >
            <Crown className="h-4 w-4 mr-2" />
            Auto-Assign Groups
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Groups List */}
        <div className="lg:col-span-1">
          <h3 className="text-lg font-semibold mb-4">
            {user?.isAdmin ? 'All Groups (Admin View)' : 'Your Groups'}
          </h3>
          <div className="space-y-3">
            {groups.map((group: any) => {
              const isJoined = user?.isAdmin ? true : !!(group as any).role;
              const hasUnread = group.unreadCount > 0;
              
              return (
                <Card 
                  key={group.id} 
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${
                    selectedGroup === group.id 
                      ? 'ring-2 ring-blue-500 bg-blue-50 shadow-lg' 
                      : hasUnread 
                        ? 'bg-green-50 border-green-200' 
                        : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    setSelectedGroup(group.id);
                    setShowMembers(false); // Start with chat view
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${
                          group.isActive ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        <CardTitle className="text-base font-semibold">
                          {group.name}
                        </CardTitle>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={group.groupType === 'rank' ? 'default' : 'secondary'} className="text-xs">
                          {group.memberCount || 0}
                        </Badge>
                        {hasUnread && (
                          <Badge variant="destructive" className="animate-pulse">
                            {group.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardDescription className="text-sm text-gray-600">
                      {group.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {isJoined ? (
                          <>
                            <Badge variant="outline" className="text-xs">
                              {group.role || 'Admin'}
                            </Badge>
                            <MessageCircle className="h-4 w-4 text-blue-500" />
                          </>
                        ) : (
                          <Badge variant="outline" className="text-xs text-gray-500">
                            Not Joined
                          </Badge>
                        )}
                      </div>
                      
                      {!user?.isAdmin && (
                        <div className="flex space-x-1">
                          {isJoined ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                leaveGroupMutation.mutate(group.id);
                              }}
                              disabled={leaveGroupMutation.isPending}
                              className="text-xs px-2 py-1"
                            >
                              Leave
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                joinGroupMutation.mutate(group.id);
                              }}
                              disabled={joinGroupMutation.isPending}
                              className="text-xs px-2 py-1"
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              Join
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {selectedGroup === group.id && (
                      <div className="mt-2 pt-2 border-t text-xs text-green-600 font-medium">
                        ✓ Click to open chat • Click Members to view group
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2">
          {selectedGroup && selectedGroupData ? (
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <MessageCircle className="h-5 w-5" />
                      <span>{selectedGroupData.name}</span>
                      <Badge>{(selectedGroupData as any).role || 'Admin View'}</Badge>
                    </CardTitle>
                    <CardDescription>{selectedGroupData.description}</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant={!showMembers ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowMembers(false)}
                      className="flex items-center space-x-1"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>Chat</span>
                    </Button>
                    <Button
                      variant={showMembers ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowMembers(true)}
                      className="flex items-center space-x-1"
                    >
                      <Users className="h-4 w-4" />
                      <span>{selectedGroupData.memberCount || 0} Members</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Content Area - Messages or Members */}
              <CardContent className="flex-1 overflow-y-auto p-4">
                {showMembers ? (
                  /* Members List */
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 mb-4">
                      <Users className="h-5 w-5" />
                      <h3 className="font-semibold">Group Members ({membersData?.length || 0})</h3>
                    </div>
                    {membersData && membersData.length > 0 ? (
                      membersData.map((member: any) => (
                        <div key={member.id || member.userId} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{member.fullName || `${member.firstName} ${member.lastName}`}</span>
                              {member.isVerified && (
                                <Badge variant="secondary" className="text-xs">Verified</Badge>
                              )}
                              {member.role === 'admin' && (
                                <Badge variant="default" className="text-xs">Admin</Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {member.maritimeRank && (
                                <span className="font-medium">{member.maritimeRank}</span>
                              )}
                              {member.city && member.maritimeRank && <span> • </span>}
                              {member.city && <span>{member.city}</span>}
                              {member.joinedAt && (
                                <span className="text-xs block mt-1">
                                  Joined {new Date(member.joinedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {member.role || 'Member'}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No members in this group yet</p>
                        <p className="text-sm mt-2">Be the first to join!</p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Messages - WhatsApp Style */
                  <div className="space-y-3">
                    {Array.isArray(messagesData) && messagesData.length > 0 ? (
                      messagesData.map((message: GroupMessage) => (
                        <div key={message.id} className="space-y-1">
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-xs font-medium">
                                {message.sender.fullName?.charAt(0) || 'U'}
                              </span>
                            </div>
                            <span className="font-medium text-gray-700">{message.sender.fullName}</span>
                            {message.sender.maritimeRank && (
                              <Badge variant="outline" className="text-xs">
                                {message.sender.maritimeRank}
                              </Badge>
                            )}
                            <span className="text-xs">
                              {new Date(message.createdAt).toLocaleTimeString()}
                            </span>
                            {message.isAnnouncement && (
                              <Badge variant="secondary" className="text-xs">📢 Announcement</Badge>
                            )}
                          </div>
                          <div className={`p-3 rounded-lg ml-8 ${
                            message.isAnnouncement 
                              ? 'bg-blue-50 border-l-4 border-blue-400' 
                              : 'bg-gray-50 hover:bg-gray-100 transition-colors'
                          }`}>
                            <p className="text-sm">{message.message}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-500 py-12">
                        <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No messages yet</p>
                        <p className="text-sm">Start the conversation in this {selectedGroupData.name} group!</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>

              {/* Message Input */}
              <div className="border-t p-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="announcement"
                      checked={isAnnouncement}
                      onChange={(e) => setIsAnnouncement(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="announcement" className="text-sm text-gray-600">
                      Send as announcement
                    </label>
                  </div>
                  <div className="flex space-x-2">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="h-[600px] flex items-center justify-center">
              <div className="text-center text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a group to start chatting</p>
                <p className="text-sm">Join a group first to participate in discussions</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}