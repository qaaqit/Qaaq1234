import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

  // Fetch admin stats
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  // Fetch all users
  const { data: users, isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

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
      await apiRequest(`/api/admin/users/${userId}/admin`, {
        method: "PATCH",
        body: { isAdmin },
      });
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
      await apiRequest(`/api/admin/users/${userId}/verify`, {
        method: "PATCH",
        body: { isVerified },
      });
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

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats Dashboard */}
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

        {/* User Management */}
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
      </div>
    </div>
  );
}