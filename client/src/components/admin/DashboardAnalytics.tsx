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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-900 p-6 relative overflow-hidden">
      {/* Maritime Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-blue-400/10 rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-teal-400/10 rounded-full animate-float"></div>
        <div className="absolute top-3/4 left-1/4 w-48 h-48 bg-cyan-400/10 rounded-full animate-pulse delay-1000"></div>
      </div>

      {/* Header with Enhanced Maritime Design */}
      <div className="flex justify-between items-center mb-8 relative z-10">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full animate-maritime-glow">
            <TrendingUp className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent">
              Maritime Analytics
            </h2>
            <p className="text-blue-200">Real-time platform insights</p>
          </div>
        </div>
        <Button 
          onClick={handleManualRefresh}
          disabled={isLoading}
          className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : 'group-hover:animate-spin'}`} />
          {isLoading ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>

      {/* Enhanced Stats Cards with Maritime Theme */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 relative z-10">
        <Card className="group bg-gradient-to-br from-blue-800/80 to-blue-900/80 backdrop-blur-lg border border-blue-400/30 hover:border-blue-300/50 shadow-xl hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-500 transform hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-200">Total Users</p>
                <p className="text-3xl font-bold text-white group-hover:text-blue-100 transition-colors duration-300">
                  {data.subscriptionData.total.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-full group-hover:bg-blue-400/30 transition-all duration-300">
                <Users className="h-8 w-8 text-blue-300 group-hover:animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group bg-gradient-to-br from-teal-800/80 to-teal-900/80 backdrop-blur-lg border border-teal-400/30 hover:border-teal-300/50 shadow-xl hover:shadow-2xl hover:shadow-teal-500/20 transition-all duration-500 transform hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-teal-200">Sailors</p>
                <p className="text-3xl font-bold text-white group-hover:text-teal-100 transition-colors duration-300">
                  {data.userTypeData.find(d => d.name === 'On Ship')?.value?.toLocaleString() || 0}
                </p>
              </div>
              <div className="p-3 bg-teal-500/20 rounded-full group-hover:bg-teal-400/30 transition-all duration-300">
                <Ship className="h-8 w-8 text-teal-300 group-hover:animate-wave" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group bg-gradient-to-br from-yellow-800/80 to-amber-900/80 backdrop-blur-lg border border-yellow-400/30 hover:border-yellow-300/50 shadow-xl hover:shadow-2xl hover:shadow-yellow-500/20 transition-all duration-500 transform hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-200">Premium Users</p>
                <p className="text-3xl font-bold text-white group-hover:text-yellow-100 transition-colors duration-300">
                  {data.subscriptionData.premium.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-full group-hover:bg-yellow-400/30 transition-all duration-300">
                <Crown className="h-8 w-8 text-yellow-300 group-hover:animate-bounce" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group bg-gradient-to-br from-purple-800/80 to-indigo-900/80 backdrop-blur-lg border border-purple-400/30 hover:border-purple-300/50 shadow-xl hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-500 transform hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-200">Countries</p>
                <p className="text-3xl font-bold text-white group-hover:text-purple-100 transition-colors duration-300">
                  {data.countryData.length}
                </p>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-full group-hover:bg-purple-400/30 transition-all duration-300">
                <Globe className="h-8 w-8 text-purple-300 group-hover:animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Charts Grid with Maritime Theme */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
        {/* Unique IP Addresses Trend - Enhanced */}
        <Card className="group bg-gradient-to-br from-gray-800/90 to-blue-900/90 backdrop-blur-lg border border-blue-400/30 hover:border-blue-300/50 shadow-xl hover:shadow-2xl transition-all duration-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-300 group-hover:animate-pulse" />
              </div>
              <div>
                <span className="bg-gradient-to-r from-blue-200 to-cyan-200 bg-clip-text text-transparent font-bold">
                  Live IP Traffic
                </span>
                <p className="text-xs text-blue-300 mt-1">Last 6 hours activity</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.ipTrendData}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#374151" opacity={0.3} />
                  <XAxis 
                    dataKey="hour" 
                    stroke="#94a3b8"
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '12px',
                      color: '#ffffff',
                      backdropFilter: 'blur(10px)'
                    }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="uniqueIPs" 
                    stroke="url(#blueGradient)" 
                    strokeWidth={3}
                    name="Unique IPs"
                    dot={false}
                    activeDot={{ r: 6, fill: '#3b82f6', stroke: '#60a5fa', strokeWidth: 2 }}
                  />
                  <defs>
                    <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* User Growth Trend - Enhanced */}
        <Card className="group bg-gradient-to-br from-gray-800/90 to-teal-900/90 backdrop-blur-lg border border-teal-400/30 hover:border-teal-300/50 shadow-xl hover:shadow-2xl transition-all duration-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white">
              <div className="p-2 bg-teal-500/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-teal-300 group-hover:animate-bounce" />
              </div>
              <div>
                <span className="bg-gradient-to-r from-teal-200 to-green-200 bg-clip-text text-transparent font-bold">
                  Maritime Growth
                </span>
                <p className="text-xs text-teal-300 mt-1">30-day user expansion</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.timeSeriesData}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#374151" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8"
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                      border: '1px solid rgba(20, 184, 166, 0.3)',
                      borderRadius: '12px',
                      color: '#ffffff',
                      backdropFilter: 'blur(10px)'
                    }}
                    labelStyle={{ color: '#94a3b8' }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="newUsers" 
                    stroke="url(#tealGradient)" 
                    strokeWidth={3}
                    name="New Users"
                    dot={false}
                    activeDot={{ r: 6, fill: '#14b8a6', stroke: '#5eead4', strokeWidth: 2 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="verifiedUsers" 
                    stroke="url(#greenGradient)" 
                    strokeWidth={3}
                    name="Verified Users"
                    dot={false}
                    activeDot={{ r: 6, fill: '#10b981', stroke: '#6ee7b7', strokeWidth: 2 }}
                  />
                  <defs>
                    <linearGradient id="tealGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14b8a6" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                    <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Premium vs Free Users - Enhanced */}
        <Card className="group bg-gradient-to-br from-gray-800/90 to-amber-900/90 backdrop-blur-lg border border-amber-400/30 hover:border-amber-300/50 shadow-xl hover:shadow-2xl transition-all duration-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Crown className="h-6 w-6 text-amber-300 group-hover:animate-bounce" />
              </div>
              <div>
                <span className="bg-gradient-to-r from-amber-200 to-yellow-200 bg-clip-text text-transparent font-bold">
                  Subscription Tiers
                </span>
                <p className="text-xs text-amber-300 mt-1">Premium vs Free distribution</p>
              </div>
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
                    outerRadius={110}
                    innerRadius={60}
                    dataKey="value"
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                    stroke="#1f2937"
                    strokeWidth={2}
                  >
                    {subscriptionChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '12px',
                      color: '#ffffff',
                      backdropFilter: 'blur(10px)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* User Types Distribution - Enhanced */}
        <Card className="group bg-gradient-to-br from-gray-800/90 to-violet-900/90 backdrop-blur-lg border border-violet-400/30 hover:border-violet-300/50 shadow-xl hover:shadow-2xl transition-all duration-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white">
              <div className="p-2 bg-violet-500/20 rounded-lg">
                <Users className="h-6 w-6 text-violet-300 group-hover:animate-pulse" />
              </div>
              <div>
                <span className="bg-gradient-to-r from-violet-200 to-purple-200 bg-clip-text text-transparent font-bold">
                  Maritime Professionals
                </span>
                <p className="text-xs text-violet-300 mt-1">Role distribution breakdown</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.userTypeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#374151" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#94a3b8"
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '12px',
                      color: '#ffffff',
                      backdropFilter: 'blur(10px)'
                    }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {data.userTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Daily Activity - Enhanced */}
        <Card className="group bg-gradient-to-br from-gray-800/90 to-emerald-900/90 backdrop-blur-lg border border-emerald-400/30 hover:border-emerald-300/50 shadow-xl hover:shadow-2xl transition-all duration-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <UserCheck className="h-6 w-6 text-emerald-300 group-hover:animate-pulse" />
              </div>
              <div>
                <span className="bg-gradient-to-r from-emerald-200 to-teal-200 bg-clip-text text-transparent font-bold">
                  Daily Activity
                </span>
                <p className="text-xs text-emerald-300 mt-1">7-day active user trends</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.loginActivity} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#374151" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8"
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short' })}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '12px',
                      color: '#ffffff',
                      backdropFilter: 'blur(10px)'
                    }}
                    labelStyle={{ color: '#94a3b8' }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Bar 
                    dataKey="activeUsers" 
                    fill="url(#emeraldGradient)" 
                    radius={[6, 6, 0, 0]}
                    name="Active Users"
                  />
                  <defs>
                    <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Country Distribution - Enhanced Maritime Theme */}
      {data.countryData.length > 0 && (
        <div className="mt-8 relative z-10">
          <Card className="group bg-gradient-to-br from-gray-800/90 to-indigo-900/90 backdrop-blur-lg border border-indigo-400/30 hover:border-indigo-300/50 shadow-xl hover:shadow-2xl transition-all duration-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                  <Globe className="h-6 w-6 text-indigo-300 group-hover:animate-spin-slow" />
                </div>
                <div>
                  <span className="bg-gradient-to-r from-indigo-200 to-blue-200 bg-clip-text text-transparent font-bold">
                    Global Maritime Presence
                  </span>
                  <p className="text-xs text-indigo-300 mt-1">Top 10 countries by professional network</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.countryData.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="#374151" opacity={0.3} />
                    <XAxis 
                      dataKey="country" 
                      stroke="#94a3b8"
                      fontSize={12}
                      axisLine={false}
                      tickLine={false}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={12}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: '12px',
                        color: '#ffffff',
                        backdropFilter: 'blur(10px)'
                      }}
                    />
                    <Bar 
                      dataKey="users" 
                      fill="url(#purpleGradient)" 
                      radius={[6, 6, 0, 0]}
                      name="Maritime Professionals"
                    />
                    <defs>
                      <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}