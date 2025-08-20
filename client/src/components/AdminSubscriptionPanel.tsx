import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Crown, Sparkles, TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';

export function AdminSubscriptionPanel() {
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch subscription data
  const { data: subscriptions, isLoading: subscriptionsLoading } = useQuery({
    queryKey: ['/api/admin/subscriptions'],
    refetchInterval: false, // DISABLED for stability testing
  });

  // Fetch payment analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/admin/payment-analytics'],
    refetchInterval: false, // DISABLED for stability testing
  });

  if (subscriptionsLoading || analyticsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const subscriptionData = subscriptions?.subscriptions || [];
  const analyticsData = analytics?.analytics || [];

  // Calculate metrics
  const totalActiveSubscriptions = subscriptionData.filter((sub: any) => sub.status === 'active').length;
  const totalRevenue = analyticsData.reduce((sum: number, item: any) => sum + (item.total_revenue || 0), 0);
  const premiumUsers = subscriptionData.filter((sub: any) => sub.subscription_type === 'premium' && sub.status === 'active').length;
  const superUsers = subscriptionData.filter((sub: any) => sub.subscription_type === 'super_user' && sub.status === 'active').length;

  const formatCurrency = (amount: number) => {
    return `₹${(amount / 100).toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default', color: 'bg-green-500' },
      created: { variant: 'secondary', color: 'bg-yellow-500' },
      cancelled: { variant: 'destructive', color: 'bg-red-500' },
      completed: { variant: 'outline', color: 'bg-blue-500' },
      expired: { variant: 'outline', color: 'bg-gray-500' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.created;
    return (
      <Badge variant={config.variant as any} className="capitalize">
        {status}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Crown className="h-6 w-6 text-orange-500" />
        <h2 className="text-2xl font-bold">Subscription Management</h2>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActiveSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              {premiumUsers} Premium, {superUsers} Super User
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              All time earnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Premium Users</CardTitle>
            <Crown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{premiumUsers}</div>
            <p className="text-xs text-muted-foreground">
              Active premium subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Super Users</CardTitle>
            <Sparkles className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{superUsers}</div>
            <p className="text-xs text-muted-foreground">
              Active super user subscriptions
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Subscriptions</CardTitle>
              <CardDescription>Latest subscription activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subscriptionData.slice(0, 5).map((sub: any) => (
                  <div key={sub.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {sub.subscription_type === 'premium' ? (
                          <Crown className="h-4 w-4 text-orange-500" />
                        ) : (
                          <Sparkles className="h-4 w-4 text-purple-500" />
                        )}
                        <div>
                          <p className="font-medium">{sub.user_name || sub.user_email}</p>
                          <p className="text-sm text-muted-foreground">
                            {sub.subscription_type === 'premium' ? 'Premium' : 'Super User'} Plan
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(sub.status)}
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatCurrency(sub.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Subscriptions</CardTitle>
              <CardDescription>Manage user subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">User</th>
                      <th className="text-left p-2">Plan</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Amount</th>
                      <th className="text-left p-2">Created</th>
                      <th className="text-left p-2">Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptionData.map((sub: any) => (
                      <tr key={sub.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          <div>
                            <p className="font-medium">{sub.user_name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">{sub.user_email}</p>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {sub.subscription_type === 'premium' ? (
                              <Crown className="h-4 w-4 text-orange-500" />
                            ) : (
                              <Sparkles className="h-4 w-4 text-purple-500" />
                            )}
                            <span className="capitalize">{sub.subscription_type.replace('_', ' ')}</span>
                          </div>
                        </td>
                        <td className="p-2">{getStatusBadge(sub.status)}</td>
                        <td className="p-2">{formatCurrency(sub.amount)}</td>
                        <td className="p-2">{formatDate(sub.created_at)}</td>
                        <td className="p-2">
                          {sub.premium_expires_at || sub.super_user_expires_at ? 
                            formatDate(sub.premium_expires_at || sub.super_user_expires_at) : 
                            'N/A'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Analytics</CardTitle>
              <CardDescription>Monthly breakdown of subscription revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.map((item: any) => (
                  <div key={`${item.month}-${item.subscription_type}`} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {new Date(item.month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                        </p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {item.subscription_type?.replace('_', ' ')} Plan
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(item.total_revenue)}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.subscription_count} subscriptions
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}