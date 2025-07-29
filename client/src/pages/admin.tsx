import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  userType: 'sailor' | 'local';
  isAdmin: boolean;
  rank?: string;
  shipName?: string;
  imoNumber?: string;
  city?: string;
  country?: string;
  isVerified: boolean;
  loginCount: number;
  lastLogin: string;
  whatsappNumber?: string;
}

interface AdminStats {
  totalUsers: number;
  sailors: number;
  locals: number;
  verifiedUsers: number;
  activeUsers: number;
  totalLogins: number;
}

export default function AdminPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("metrics");
  const [qbotRules, setQbotRules] = useState<string>("");
  const [loadingRules, setLoadingRules] = useState(false);

  // Fetch admin stats
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  // Fetch all users
  const { data: users, isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  // Fetch QBOT rules from database
  useEffect(() => {
    if (activeTab === 'qbot' && !qbotRules) {
      setLoadingRules(true);
      fetch('/api/bot-documentation/QBOTRULESV1')
        .then(res => res.json())
        .then(data => {
          if (data.doc_value) {
            setQbotRules(data.doc_value);
          } else {
            setQbotRules('Failed to load QBOT rules from database.');
          }
        })
        .catch(err => {
          console.error('Failed to load QBOT rules:', err);
          setQbotRules('Error loading QBOT rules. Please check database connection.');
        })
        .finally(() => setLoadingRules(false));
    }
  }, [activeTab, qbotRules]);

  // Filter users based on search
  const filteredUsers = users?.filter(user =>
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.shipName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.imoNumber?.includes(searchQuery)
  ) || [];

  // Mutation to update user admin status
  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      await apiRequest(`/api/admin/users/${userId}/admin`, "PATCH", { isAdmin });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User updated successfully",
        description: "Admin status has been changed",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating user",
        description: error instanceof Error ? error.message : "Failed to update user",
        variant: "destructive",
      });
    },
  });

  // Mutation to verify user
  const verifyUserMutation = useMutation({
    mutationFn: async ({ userId, isVerified }: { userId: string; isVerified: boolean }) => {
      await apiRequest(`/api/admin/users/${userId}/verify`, "PATCH", { isVerified });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User verification updated",
        description: "User verification status has been changed",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating verification",
        description: error instanceof Error ? error.message : "Failed to update verification",
        variant: "destructive",
      });
    },
  });

  if (statsLoading || usersLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-3xl text-ocean-teal mb-4"></i>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/")}
                className="mr-4 text-gray-600 hover:text-navy"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Back to Home
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  <i className="fas fa-shield-alt text-ocean-teal mr-3"></i>
                  QaaqConnect Admin Panel
                </h1>
                <p className="text-gray-600 mt-1">Manage users and system settings</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-ocean-teal text-white border-ocean-teal">
              <i className="fas fa-user-crown mr-1"></i>
              Administrator
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="metrics">
              <i className="fas fa-chart-line mr-2"></i>
              Metrics
            </TabsTrigger>
            <TabsTrigger value="qbot">
              <i className="fas fa-robot mr-2"></i>
              QBOT Rules
            </TabsTrigger>
            <TabsTrigger value="qoi">
              <i className="fas fa-comments mr-2"></i>
              QOI GPT Rules
            </TabsTrigger>
            <TabsTrigger value="users">
              <i className="fas fa-users mr-2"></i>
              User Management
            </TabsTrigger>
          </TabsList>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-ocean-teal">{stats?.totalUsers || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Sailors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats?.sailors || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Local Pros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-600">{stats?.locals || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Verified</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats?.verifiedUsers || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats?.activeUsers || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Logins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats?.totalLogins || 0}</div>
            </CardContent>
          </Card>
            </div>
          </TabsContent>

          {/* QBOT Rules Tab */}
          <TabsContent value="qbot" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* QBOT Overview Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-blue-600">
                    <i className="fas fa-robot mr-2"></i>
                    QBOT Maritime Assistant
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-2">Core Functions</h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Maritime professional networking</li>
                      <li>• "Koi Hai?" location discovery</li>
                      <li>• WhatsApp direct communication</li>
                      <li>• QAAQ Store recommendations</li>
                      <li>• Port and ship information</li>
                    </ul>
                  </div>
                  
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-yellow-800 mb-2">Response Standards</h3>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• Simple maritime language</li>
                      <li>• Safety prioritization</li>
                      <li>• Authentic QAAQ data only</li>
                      <li>• Location confidentiality</li>
                      <li>• Response time &lt;3 seconds</li>
                    </ul>
                  </div>

                  <div className="bg-red-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-red-800 mb-2">Restrictions</h3>
                    <ul className="text-sm text-red-700 space-y-1">
                      <li>• No personal contact sharing</li>
                      <li>• No financial/legal advice</li>
                      <li>• No ship position tracking</li>
                      <li>• No confidential data access</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* 25-Step Flowchart Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-indigo-600">
                    <i className="fas fa-sitemap mr-2"></i>
                    25-Step Operational Flowchart
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">Initial Contact (Steps 1-5)</h4>
                    <ul className="text-xs text-gray-700 space-y-1">
                      <li><span className="font-medium">Step 1:</span> User sends WhatsApp message</li>
                      <li><span className="font-medium">Step 2:</span> Authentication check → QAAQ database</li>
                      <li><span className="font-medium">Step 3:</span> New user onboarding if needed</li>
                      <li><span className="font-medium">Step 4:</span> Personalized greeting with rank/ship</li>
                      <li><span className="font-medium">Step 5:</span> Message classification (Technical/Location/Store/Chat/Emergency)</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">Technical Questions (Steps 6-9)</h4>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li><span className="font-medium">Step 6:</span> Maritime industry related? → YES/NO</li>
                      <li><span className="font-medium">Step 7:</span> Can QBOT answer? → Direct response</li>
                      <li><span className="font-medium">Step 8:</span> Complex? → QOI GPT handoff</li>
                      <li><span className="font-medium">Step 9:</span> Fallback → Connect to human experts</li>
                    </ul>
                  </div>

                  <div className="bg-green-50 p-3 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">Location Services (Steps 10-13)</h4>
                    <ul className="text-xs text-green-700 space-y-1">
                      <li><span className="font-medium">Step 10:</span> "Koi Hai?" query detection</li>
                      <li><span className="font-medium">Step 11:</span> Proximity search (50km→500km)</li>
                      <li><span className="font-medium">Step 12:</span> Port/Ship information request</li>
                      <li><span className="font-medium">Step 13:</span> Location privacy check</li>
                    </ul>
                  </div>

                  <div className="bg-purple-50 p-3 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-2">QAAQ Store (Steps 14-17)</h4>
                    <ul className="text-xs text-purple-700 space-y-1">
                      <li><span className="font-medium">Step 14:</span> Store inquiry identification</li>
                      <li><span className="font-medium">Step 15:</span> Category selection (Equipment/Services)</li>
                      <li><span className="font-medium">Step 16:</span> Product recommendations (Top 5)</li>
                      <li><span className="font-medium">Step 17:</span> Order processing → Team contact</li>
                    </ul>
                  </div>

                  <div className="bg-orange-50 p-3 rounded-lg">
                    <h4 className="font-semibold text-orange-800 mb-2">General Chat (Steps 18-21)</h4>
                    <ul className="text-xs text-orange-700 space-y-1">
                      <li><span className="font-medium">Step 18:</span> Non-technical chat detection</li>
                      <li><span className="font-medium">Step 19:</span> Maritime topics → Engage</li>
                      <li><span className="font-medium">Step 20:</span> Off-topic → Polite redirect</li>
                      <li><span className="font-medium">Step 21:</span> Conversation closure → "Fair winds!"</li>
                    </ul>
                  </div>

                  <div className="bg-red-50 p-3 rounded-lg">
                    <h4 className="font-semibold text-red-800 mb-2">Emergency & Health (Steps 22-25)</h4>
                    <ul className="text-xs text-red-700 space-y-1">
                      <li><span className="font-medium">Step 22:</span> Emergency detection protocol</li>
                      <li><span className="font-medium">Step 23:</span> Immediate response → Authorities</li>
                      <li><span className="font-medium">Step 24:</span> 24-hour follow-up check</li>
                      <li><span className="font-medium">Step 25:</span> System health check (Hourly)</li>
                    </ul>
                  </div>

                  <div className="bg-indigo-50 p-3 rounded-lg">
                    <h4 className="font-semibold text-indigo-800 mb-2">Decision Flow Visual</h4>
                    <pre className="text-xs text-indigo-700 overflow-x-auto">
START → Step 1 → Step 2 → Step 3/4
         ↓
      Step 5 (Classification)
         ├→ Technical → 6→7→8→9
         ├→ Location → 10→11/12→13
         ├→ Store → 14→15→16→17
         ├→ Chat → 18→19/20→21
         └→ Emergency → 22→23→24
                            ↓
                        Step 25 (24x7)
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* QBOT Rules Content */}
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle className="flex items-center text-navy">
                  <i className="fas fa-file-alt mr-2"></i>
                  QBOT Rules Documentation (From Database)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingRules ? (
                  <div className="flex items-center justify-center py-8">
                    <i className="fas fa-spinner fa-spin text-2xl text-ocean-teal mr-2"></i>
                    <span>Loading rules from database...</span>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg text-xs overflow-auto max-h-[600px]">
                      {qbotRules || 'No rules loaded yet.'}
                    </pre>
                    <div className="mt-4 text-sm text-gray-600">
                      <i className="fas fa-database mr-1"></i>
                      Rules loaded from shared QAAQ database (bot_documentation table)
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* QOI GPT Rules Tab */}
          <TabsContent value="qoi" className="space-y-6">
            <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-green-600">
                <i className="fas fa-comments mr-2"></i>
                QOI GPT Rules & Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">Q&A Functionality</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Maritime industry question answering</li>
                  <li>• Professional experience sharing</li>
                  <li>• Port services and local guidance</li>
                  <li>• Ship operations and regulations</li>
                  <li>• Career development advice</li>
                </ul>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-2">Engagement Standards</h3>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• Track question and answer counts (XQ YA format)</li>
                  <li>• Encourage professional networking</li>
                  <li>• Promote knowledge sharing culture</li>
                  <li>• Maintain maritime industry focus</li>
                  <li>• Support career development discussions</li>
                </ul>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="font-semibold text-orange-800 mb-2">Content Moderation</h3>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• Ensure professional maritime discussions</li>
                  <li>• Filter non-maritime related content</li>
                  <li>• Maintain respectful communication</li>
                  <li>• Protect user privacy and safety</li>
                </ul>
              </div>
            </CardContent>
          </Card>
          </TabsContent>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <i className="fas fa-users mr-2"></i>
              User Management
            </CardTitle>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search users by name, email, ship, or IMO..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-md"
                />
              </div>
              <Badge variant="secondary">
                {filteredUsers.length} users found
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-gray-600">User</th>
                    <th className="text-left p-3 font-medium text-gray-600">Type</th>
                    <th className="text-left p-3 font-medium text-gray-600">Ship/Location</th>
                    <th className="text-left p-3 font-medium text-gray-600">Contact</th>
                    <th className="text-left p-3 font-medium text-gray-600">Status</th>
                    <th className="text-left p-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div>
                          <div className="font-medium text-gray-900">{user.fullName}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          {user.rank && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {user.rank}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge 
                          variant={user.userType === 'sailor' ? 'default' : 'secondary'}
                          className={user.userType === 'sailor' ? 'bg-blue-100 text-blue-800' : 'bg-teal-100 text-teal-800'}
                        >
                          <i className={`fas ${user.userType === 'sailor' ? 'fa-ship' : 'fa-building'} mr-1`}></i>
                          {user.userType}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">
                          {user.shipName && (
                            <div>
                              <strong>Ship:</strong> {user.shipName}
                              {user.imoNumber && <div className="text-xs text-gray-500">IMO: {user.imoNumber}</div>}
                            </div>
                          )}
                          {user.city && (
                            <div><strong>Location:</strong> {user.city}, {user.country}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">
                          <div>{user.email}</div>
                          {user.whatsappNumber && (
                            <div className="text-xs text-gray-500">
                              <i className="fab fa-whatsapp mr-1"></i>
                              {user.whatsappNumber}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          {user.isVerified ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <i className="fas fa-check-circle mr-1"></i>
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                              <i className="fas fa-clock mr-1"></i>
                              Pending
                            </Badge>
                          )}
                          {user.isAdmin && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              <i className="fas fa-crown mr-1"></i>
                              Admin
                            </Badge>
                          )}
                          <div className="text-xs text-gray-500">
                            Logins: {user.loginCount}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => verifyUserMutation.mutate({
                              userId: user.id,
                              isVerified: !user.isVerified
                            })}
                            disabled={verifyUserMutation.isPending}
                          >
                            <i className={`fas ${user.isVerified ? 'fa-times' : 'fa-check'} mr-1`}></i>
                            {user.isVerified ? 'Unverify' : 'Verify'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleAdminMutation.mutate({
                              userId: user.id,
                              isAdmin: !user.isAdmin
                            })}
                            disabled={toggleAdminMutation.isPending}
                          >
                            <i className={`fas ${user.isAdmin ? 'fa-user-minus' : 'fa-user-plus'} mr-1`}></i>
                            {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}