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
              const isJoined = user?.isAdmin ? true : !!(group as any).role; // Admin can see all, users only their groups
              
              return (
                <Card 
                  key={group.id} 
                  className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedGroup === group.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedGroup(group.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{group.name}</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge variant={group.groupType === 'rank' ? 'default' : 'secondary'}>
                          {group.memberCount || 0} members
                        </Badge>
                        {group.unreadCount > 0 && (
                          <Badge variant="destructive">
                            {group.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardDescription className="text-xs">
                      {group.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {isJoined ? (
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{group.role || 'Admin View'}</Badge>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            leaveGroupMutation.mutate(group.id);
                          }}
                          disabled={leaveGroupMutation.isPending}
                        >
                          Leave
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          joinGroupMutation.mutate(group.id);
                        }}
                        disabled={joinGroupMutation.isPending}
                        className="w-full"
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Join
                      </Button>
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
                      variant={showMembers ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowMembers(!showMembers)}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      {selectedGroupData.memberCount} Members
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
                      <h3 className="font-semibold">Group Members ({Array.isArray(membersData) ? membersData.length : 0})</h3>
                    </div>
                    {Array.isArray(membersData) && membersData.length > 0 ? (
                      membersData.map((member: any) => (
                        <div key={member.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{member.fullName}</span>
                              {member.isVerified && (
                                <Badge variant="secondary" className="text-xs">Verified</Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {member.maritimeRank && (
                                <span className="font-medium">{member.maritimeRank}</span>
                              )}
                              {member.city && member.maritimeRank && <span> • </span>}
                              {member.city && <span>{member.city}</span>}
                            </div>
                          </div>
                          <Badge variant="outline">{member.role}</Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No members found in this group</p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Messages */
                  <div className="space-y-4">
                    {Array.isArray(messagesData) && messagesData.length > 0 ? (
                      messagesData.map((message: GroupMessage) => (
                        <div key={message.id} className="space-y-1">
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <span className="font-medium">{message.sender.fullName}</span>
                            {message.sender.maritimeRank && (
                              <Badge variant="outline" className="text-xs">
                                {message.sender.maritimeRank}
                              </Badge>
                            )}
                            <span>{new Date(message.createdAt).toLocaleString()}</span>
                            {message.isAnnouncement && (
                              <Badge variant="secondary">Announcement</Badge>
                            )}
                          </div>
                          <div className={`p-3 rounded-lg ${
                            message.isAnnouncement 
                              ? 'bg-blue-50 border-blue-200 border' 
                              : 'bg-gray-50'
                          }`}>
                            {message.message}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No messages yet. Start the conversation!</p>
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