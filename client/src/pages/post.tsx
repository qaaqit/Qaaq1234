import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, MapPin, Users, Clock, Heart, MessageCircle, Share2, ChevronDown, ChevronUp, Filter, Search, Plus, ChevronRight, Home, UserPlus, Settings, LogIn, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type User } from "@/lib/auth";
import UserDropdown from "@/components/user-dropdown";

interface CPSSGroup {
  id: string;
  groupId: string;
  groupName: string;
  breadcrumbPath: string;
  groupType: string;
  country?: string;
  port?: string;
  suburb?: string;
  service?: string;
  description?: string;
  memberCount: number;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface CPSSGroupPost {
  id: string;
  postId: string;
  groupId: string;
  userId: string;
  userName: string;
  content: string;
  postType: string;
  attachments: string[];
  likesCount: number;
  commentsCount: number;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PostProps {
  user: User;
}

interface CPSSTreeNode {
  id: string;
  name: string;
  type: 'country' | 'port' | 'suburb' | 'service';
  children: CPSSTreeNode[];
  groups: CPSSGroup[];
  expanded: boolean;
}

interface CPSSTreeNavigationProps {
  groups: CPSSGroup[];
  userGroups: CPSSGroup[];
  onJoinGroup: (group: CPSSGroup) => void;
  joinGroupMutation: any;
  groupsLoading: boolean;
}

function CPSSTreeNavigation({ groups, userGroups, onJoinGroup, joinGroupMutation, groupsLoading }: CPSSTreeNavigationProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  // Build hierarchical tree from groups
  const buildTree = (): CPSSTreeNode[] => {
    const tree: { [key: string]: CPSSTreeNode } = {};
    
    groups.forEach(group => {
      if (!group.country) return;
      
      // Country level
      const countryId = group.country;
      if (!tree[countryId]) {
        tree[countryId] = {
          id: countryId,
          name: group.country,
          type: 'country',
          children: [],
          groups: [],
          expanded: expandedNodes.has(countryId)
        };
      }
      
      // Port level
      if (group.port) {
        const portId = `${group.country}_${group.port}`;
        let portNode = tree[countryId].children.find(c => c.id === portId);
        if (!portNode) {
          portNode = {
            id: portId,
            name: group.port,
            type: 'port',
            children: [],
            groups: [],
            expanded: expandedNodes.has(portId)
          };
          tree[countryId].children.push(portNode);
        }
        
        // Suburb level
        if (group.suburb) {
          const suburbId = `${group.country}_${group.port}_${group.suburb}`;
          let suburbNode = portNode.children.find(c => c.id === suburbId);
          if (!suburbNode) {
            suburbNode = {
              id: suburbId,
              name: group.suburb,
              type: 'suburb',
              children: [],
              groups: [],
              expanded: expandedNodes.has(suburbId)
            };
            portNode.children.push(suburbNode);
          }
          
          // Service level
          if (group.service) {
            const serviceId = `${group.country}_${group.port}_${group.suburb}_${group.service}`;
            let serviceNode = suburbNode.children.find(c => c.id === serviceId);
            if (!serviceNode) {
              serviceNode = {
                id: serviceId,
                name: group.service,
                type: 'service',
                children: [],
                groups: [group],
                expanded: expandedNodes.has(serviceId)
              };
              suburbNode.children.push(serviceNode);
            } else {
              serviceNode.groups.push(group);
            }
          } else {
            suburbNode.groups.push(group);
          }
        } else {
          portNode.groups.push(group);
        }
      } else {
        tree[countryId].groups.push(group);
      }
    });
    
    return Object.values(tree);
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderTreeNode = (node: CPSSTreeNode, depth: number = 0): JSX.Element => {
    const hasChildren = node.children.length > 0;
    const hasGroups = node.groups.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const indent = depth * 24;

    return (
      <div key={node.id} className="w-full">
        <Collapsible open={isExpanded} onOpenChange={() => toggleNode(node.id)}>
          <Card className="border border-gray-200 bg-white">
            <CollapsibleTrigger asChild>
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                style={{ paddingLeft: `${16 + indent}px` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="w-2 h-2 bg-blue-300 rounded-full ml-1"></div>
                    <div className="w-2 h-2 bg-blue-200 rounded-full ml-1"></div>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {node.type === 'country' && '🌍'} 
                      {node.type === 'port' && '⚓'} 
                      {node.type === 'suburb' && '🏙️'} 
                      {node.type === 'service' && '🏪'} 
                      {node.name}
                    </h3>
                    <p className="text-sm text-gray-500 capitalize">{node.type}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {hasGroups && (
                    <Badge variant="outline" className="text-xs">
                      {node.groups.length} group{node.groups.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="w-8 h-8 p-0 text-red-500 hover:bg-red-50">
                      <Heart className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="w-8 h-8 p-0 text-blue-500 hover:bg-blue-50">
                      <Share2 className="w-4 h-4" />
                    </Button>
                    {(hasChildren || hasGroups) && (
                      isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="border-t border-gray-100">
                {/* Render groups at this level */}
                {hasGroups && (
                  <div className="p-4 space-y-3 bg-gray-50/50">
                    {node.groups.map((group) => {
                      const isJoined = userGroups.some(ug => ug.groupId === group.groupId);
                      
                      return (
                        <div key={group.groupId} className="bg-white rounded-lg p-4 border border-gray-100">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                <MapPin className="w-3 h-3" />
                                <span>{group.breadcrumbPath}</span>
                              </div>
                              <h4 className="font-medium text-gray-900 mb-2">{group.groupName}</h4>
                              {group.description && (
                                <p className="text-sm text-gray-600 mb-3">{group.description}</p>
                              )}
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  <span>{group.memberCount} members</span>
                                </div>
                                <Badge variant="outline" className="text-xs">{group.groupType}</Badge>
                              </div>
                            </div>
                            <div className="ml-4 flex items-center gap-2">
                              <Button variant="ghost" size="sm" className="w-8 h-8 p-0 text-blue-500 hover:bg-blue-50">
                                <Share2 className="w-4 h-4" />
                              </Button>
                              {isJoined ? (
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  Joined
                                </Badge>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onJoinGroup(group)}
                                  disabled={joinGroupMutation.isPending}
                                  className="text-xs w-8 h-8 p-0"
                                >
                                  <UserPlus className="w-3 h-3" />
                                </Button>
                              )}
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Render child nodes */}
                {hasChildren && (
                  <div className="space-y-2 p-2">
                    {node.children.map(child => renderTreeNode(child, depth + 1))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    );
  };

  const treeData = buildTree();
  const filteredTree = searchTerm 
    ? treeData.filter(node => 
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.groups.some(group => 
          group.groupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          group.breadcrumbPath.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : treeData;

  if (groupsLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="border">
            <div className="p-4 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SEMM System Header */}
      <Card className="border-2 border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full"></div>
                <div className="w-2 h-2 bg-blue-200 rounded-full ml-1"></div>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">CPSS Group Tree</h2>
                <p className="text-sm text-gray-600">Navigate maritime groups by location hierarchy</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Location
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search locations and groups..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tree Navigation */}
      <div className="space-y-3">
        {filteredTree.length === 0 ? (
          <Card className="border">
            <CardContent className="p-8 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">No groups found</h3>
              <p className="text-sm text-gray-600">Try adjusting your search terms or browse all locations.</p>
            </CardContent>
          </Card>
        ) : (
          filteredTree.map(node => renderTreeNode(node))
        )}
      </div>
    </div>
  );
}

export default function Post({ user }: PostProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedGroup, setSelectedGroup] = useState<CPSSGroup | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

  // Fetch all available groups
  const { data: allGroupsData, isLoading: groupsLoading } = useQuery<{ groups: CPSSGroup[] }>({
    queryKey: ['/api/cpss/groups'],
  });

  // Fetch user's joined groups
  const { data: userGroupsData, isLoading: userGroupsLoading } = useQuery<{ groups: CPSSGroup[] }>({
    queryKey: ['/api/cpss/groups/my-groups'],
    retry: false,
  });
  
  const allGroups = allGroupsData?.groups || [];
  const userGroups = userGroupsData?.groups || [];

  // Fetch posts for selected group
  const { data: postsData, isLoading: postsLoading } = useQuery<{ posts: CPSSGroupPost[] }>({
    queryKey: ['/api/cpss/groups', selectedGroup?.groupId, 'posts'],
    enabled: !!selectedGroup?.groupId,
  });

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      return apiRequest(`/api/cpss/groups/${groupId}/join`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cpss/groups/my-groups'] });
      toast({
        title: "Joined Group",
        description: "Welcome to the group! You can now participate in discussions.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Join",
        description: error.message || "Could not join the group",
        variant: "destructive",
      });
    },
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (postData: { content: string; postType: string }) => {
      return apiRequest(`/api/cpss/groups/${selectedGroup?.groupId}/posts`, 'POST', postData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cpss/groups', selectedGroup?.groupId, 'posts'] });
      setNewPostContent("");
      setIsCreatePostOpen(false);
      toast({
        title: "Post Created",
        description: "Your message has been shared with the group.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Post",
        description: error.message || "Could not create post",
        variant: "destructive",
      });
    },
  });

  const handleJoinGroup = async (group: CPSSGroup) => {
    await joinGroupMutation.mutateAsync(group.groupId);
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      toast({
        title: "Content Required",
        description: "Please write something to share",
        variant: "destructive",
      });
      return;
    }

    await createPostMutation.mutateAsync({
      content: newPostContent,
      postType: "discussion"
    });
  };

  const posts = postsData?.posts || [];

  const filteredGroups = allGroups.filter((group: CPSSGroup) =>
    group.groupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.breadcrumbPath.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/')}
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                <span className="font-semibold text-navy">QaaqConnect</span>
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-xl font-bold text-gray-900">Ch16 Broadcast</h1>
            </div>
            <UserDropdown user={user} className="bg-gray-50" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        <Tabs defaultValue="my-groups" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="my-groups">My Groups ({userGroups.length})</TabsTrigger>
            <TabsTrigger value="discover">Discover Groups</TabsTrigger>
          </TabsList>

          {/* My Groups Tab */}
          <TabsContent value="my-groups">
            {selectedGroup ? (
              /* Group View */
              <div className="space-y-6">
                {/* Group Header */}
                <div className="bg-white rounded-lg p-6 border">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Button
                        variant="ghost"
                        onClick={() => setSelectedGroup(null)}
                        className="mb-3 -ml-2"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Groups
                      </Button>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <span>CPSS Navigation:</span>
                        {selectedGroup.breadcrumbPath.split(' > ').map((crumb, index, arr) => (
                          <span key={index} className="flex items-center gap-1">
                            <span className="font-medium">{crumb}</span>
                            {index < arr.length - 1 && <ChevronRight className="w-3 h-3" />}
                          </span>
                        ))}
                      </div>
                      
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedGroup.groupName}</h2>
                      {selectedGroup.description && (
                        <p className="text-gray-600 mb-3">{selectedGroup.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{selectedGroup.memberCount} members</span>
                        </div>
                        <Badge variant="outline">{selectedGroup.groupType}</Badge>
                      </div>
                    </div>
                    
                    <Dialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen}>
                      <DialogTrigger asChild>
                        <Button className="flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          New Post
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Post in {selectedGroup.groupName}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Textarea
                            placeholder="Share something with the group..."
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            rows={4}
                          />
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsCreatePostOpen(false)}>
                              Cancel
                            </Button>
                            <Button 
                              onClick={handleCreatePost} 
                              disabled={createPostMutation.isPending}
                            >
                              {createPostMutation.isPending ? "Posting..." : "Post"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* Group Posts */}
                <div className="space-y-4">
                  {postsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-lg p-6 border animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="bg-white rounded-lg p-8 border text-center">
                      <MessageCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
                      <p className="text-gray-600 mb-4">Be the first to start a discussion in this group!</p>
                      <Button onClick={() => setIsCreatePostOpen(true)}>
                        Create First Post
                      </Button>
                    </div>
                  ) : (
                    posts.map((post) => (
                      <Card key={post.postId} className="border">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarFallback className="bg-navy text-white">
                                  {post.userName.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-gray-900">{post.userName}</div>
                                <div className="text-sm text-gray-500 flex items-center gap-2">
                                  <Clock className="w-3 h-3" />
                                  {formatTimeAgo(post.createdAt)}
                                  {post.isPinned && <Badge variant="outline" className="text-xs">Pinned</Badge>}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-800 mb-4">{post.content}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <button className="flex items-center gap-1 hover:text-red-500">
                              <Heart className="w-4 h-4" />
                              <span>{post.likesCount}</span>
                            </button>
                            <button className="flex items-center gap-1 hover:text-blue-500">
                              <MessageCircle className="w-4 h-4" />
                              <span>{post.commentsCount}</span>
                            </button>
                            <button className="flex items-center gap-1 hover:text-green-500">
                              <Share2 className="w-4 h-4" />
                              Share
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* Groups List */
              <div className="space-y-6">
                {userGroupsLoading ? (
                  <div className="grid gap-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="bg-white rounded-lg p-6 border animate-pulse">
                        <div className="h-6 bg-gray-200 rounded w-1/3 mb-3"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    ))}
                  </div>
                ) : userGroups.length === 0 ? (
                  <div className="bg-white rounded-lg p-8 border text-center">
                    <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No groups joined yet</h3>
                    <p className="text-gray-600 mb-4">Join groups to participate in location-based maritime discussions.</p>
                    <Button variant="outline">
                      Discover Groups
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {userGroups.map((group) => (
                      <Card key={group.groupId} className="border cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedGroup(group)}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                <MapPin className="w-3 h-3" />
                                <span>{group.breadcrumbPath}</span>
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">{group.groupName}</h3>
                              {group.description && (
                                <p className="text-gray-600 text-sm mb-3">{group.description}</p>
                              )}
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  <span>{group.memberCount} members</span>
                                </div>
                                <Badge variant="outline">{group.groupType}</Badge>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Discover Groups Tab */}
          <TabsContent value="discover">
            <CPSSTreeNavigation 
              groups={allGroups}
              userGroups={userGroups}
              onJoinGroup={handleJoinGroup}
              joinGroupMutation={joinGroupMutation}
              groupsLoading={groupsLoading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}