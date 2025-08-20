import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Users, Ship, UserCheck, Crown, Globe, TrendingUp, RefreshCw } from 'lucide-react';

interface DashboardData {
  timeSeriesData: { date: string; newUsers: number; verifiedUsers: number; }[];
  userTypeData: { name: string; value: number; }[];
  countryData: { country: string; users: number; }[];
  subscriptionData: { premium: number; free: number; total: number; };
  loginActivity: { date: string; activeUsers: number; }[];
  ipTrendData: { hour: string; uniqueIPs: number; }[];
}

// Replit Analytics Colors - exact match
const COLORS = ['#0969da', '#7c3aed', '#059669', '#dc2626', '#ea580c', '#0891b2', '#7c2d12', '#a21caf'];
const PIE_COLORS = ['#0969da', '#7c3aed', '#059669', '#dc2626'];

export default function DashboardAnalytics() {
  const queryClient = useQueryClient();
  
  const { data, isLoading, error, refetch } = useQuery<DashboardData>({
    queryKey: ['/api/admin/analytics/dashboard'],
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    refetchInterval: false, // No auto-refresh - load only on demand
    refetchOnWindowFocus: false, // No refresh on window focus
    refetchOnReconnect: false, // No refresh on network reconnect
  });

  const handleManualRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse bg-gray-900 border-gray-800">
              <CardHeader>
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-48 bg-gray-800 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-950 p-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="text-center text-red-400">
              <TrendingUp className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-white">Analytics Unavailable</h3>
              <p className="text-sm text-gray-400">Unable to load analytics data. Please try again.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const subscriptionChartData = [
    { name: 'Premium', value: data.subscriptionData.premium, color: '#eab308' },
    { name: 'Free', value: data.subscriptionData.free, color: '#6b7280' }
  ];

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* Header with Manual Refresh Button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
        <Button 
          onClick={handleManualRefresh}
          disabled={isLoading}
          variant="outline"
          className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>

      {/* Header Stats - Replit Style */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-white">{data.subscriptionData.total.toLocaleString()}</p>
              </div>
              <Users className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Sailors</p>
                <p className="text-2xl font-bold text-white">
                  {data.userTypeData.find(d => d.name === 'On Ship')?.value?.toLocaleString() || 0}
                </p>
              </div>
              <Ship className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Premium Users</p>
                <p className="text-2xl font-bold text-white">{data.subscriptionData.premium.toLocaleString()}</p>
              </div>
              <Crown className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Countries</p>
                <p className="text-2xl font-bold text-white">{data.countryData.length}</p>
              </div>
              <Globe className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid - Replit Style */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unique IP Addresses Trend - 6 Hours */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="h-5 w-5 text-blue-400" />
              Unique IP addresses (Last 6 hours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.ipTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="hour" 
                    stroke="#9ca3af"
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#9ca3af" 
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#ffffff'
                    }}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="uniqueIPs" 
                    stroke="#0969da" 
                    strokeWidth={2}
                    name="Unique IPs"
                    dot={false}
                    activeDot={{ r: 4, fill: '#0969da' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* User Growth Trend */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="h-5 w-5 text-blue-400" />
              User Growth (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9ca3af"
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis 
                    stroke="#9ca3af" 
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#ffffff'
                    }}
                    labelStyle={{ color: '#9ca3af' }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="newUsers" 
                    stroke="#0969da" 
                    strokeWidth={2}
                    name="New Users"
                    dot={false}
                    activeDot={{ r: 4, fill: '#0969da' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="verifiedUsers" 
                    stroke="#059669" 
                    strokeWidth={2}
                    name="Verified Users"
                    dot={false}
                    activeDot={{ r: 4, fill: '#059669' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Premium vs Free Users */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Crown className="h-5 w-5 text-yellow-400" />
              Subscription Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subscriptionChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                  >
                    {subscriptionChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#ffffff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* User Types Distribution */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="h-5 w-5 text-blue-400" />
              User Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.userTypeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#9ca3af"
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#9ca3af" 
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#ffffff'
                    }}
                  />
                  <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                    {data.userTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Daily Activity */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <UserCheck className="h-5 w-5 text-green-400" />
              Daily Active Users (7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.loginActivity} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9ca3af"
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short' })}
                  />
                  <YAxis 
                    stroke="#9ca3af" 
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#ffffff'
                    }}
                    labelStyle={{ color: '#9ca3af' }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Bar 
                    dataKey="activeUsers" 
                    fill="#059669" 
                    radius={[2, 2, 0, 0]}
                    name="Active Users"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Country Distribution */}
      {data.countryData.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Globe className="h-5 w-5 text-purple-400" />
              Top Countries by Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.countryData.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="country" 
                    stroke="#9ca3af"
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    stroke="#9ca3af" 
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#ffffff'
                    }}
                  />
                  <Bar 
                    dataKey="users" 
                    fill="#7c3aed" 
                    radius={[2, 2, 0, 0]}
                    name="Users"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}