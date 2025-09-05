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
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line } from "recharts";
import { FileText } from "lucide-react";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import DashboardAnalytics from "@/components/admin/DashboardAnalytics";
import DatabaseBackupMetrics from "@/components/admin/DatabaseBackupMetrics";
import SearchAnalyticsPanel from "@/components/search-analytics-panel";
import { useAuth } from "@/contexts/AuthContext";

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
  questionCount: number;
}

interface AdminStats {
  totalUsers: number;
  sailors: number;
  locals: number;
  verifiedUsers: number;
  activeUsers: number;
  totalLogins: number;
}

interface CountryAnalytics {
  country: string;
  userCount: number;
  verifiedCount: number;
  activeCount: number;
  totalHits: number;
}

interface ChatMetrics {
  date: string;
  webchat: number;
  whatsapp: number;
}

// Helper function to generate time series data from real stats
function generateTimeSeriesFromStats(stats: AdminStats, countryData: CountryAnalytics[]): any[] {
  const baseUsers = Math.floor(stats.totalUsers / 30); // Average users per day over 30 days
  const baseViews = Math.floor(stats.totalLogins / 7); // Average views per day over 7 days
  
  return Array.from({ length: 7 }, (_, i) => {
    const variation = Math.random() * 0.4 + 0.8; // Random variation between 0.8 and 1.2
    return {
      date: `${new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      views: Math.round(baseViews * variation),
      users: Math.round(baseUsers * variation)
    };
  });
}

// Helper function to get country codes
function getCountryCode(country: string): string {
  const countryCodeMap: Record<string, string> = {
    'India': 'IN',
    'United States': 'US',
    'United Kingdom': 'GB',
    'Germany': 'DE',
    'France': 'FR',
    'Canada': 'CA',
    'Australia': 'AU',
    'Japan': 'JP',
    'China': 'CN',
    'Brazil': 'BR',
    'Singapore': 'SG',
    'Norway': 'NO',
    'Netherlands': 'NL',
    'Philippines': 'PH',
    'Greece': 'GR',
    'South Korea': 'KR',
    'Italy': 'IT',
    'Spain': 'ES',
    'Mexico': 'MX',
    'Turkey': 'TR'
  };
  return countryCodeMap[country] || 'IN';
}

export default function AdminPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("analytics");
  const [qbotRules, setQbotRules] = useState<string>("");
  const [loadingRules, setLoadingRules] = useState(false);
  const [glossaryUpdating, setGlossaryUpdating] = useState(false);
  
  // Authentication check
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Check if user is admin
  const isAdmin = user?.isAdmin || 
                  user?.fullName === '+919029010070' || 
                  user?.id === '44885683' ||
                  user?.id === '+919029010070' ||
                  user?.id === '5791e66f-9cc1-4be4-bd4b-7fc1bd2e258e' ||
                  user?.id === '45016180';
  
  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) {
      setLocation("/login");
    }
  }, [authLoading, isAuthenticated, isAdmin, setLocation]);
  
  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-blue-200">Verifying admin access...</p>
        </div>
      </div>
    );
  }
  
  // Fetch admin stats - only if authenticated and admin
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated && isAdmin,
  });

  // Fetch all users
  const { data: users, isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated && isAdmin,
  });

  // Fetch country analytics
  const { data: countryAnalytics, isLoading: countryLoading } = useQuery<CountryAnalytics[]>({
    queryKey: ["/api/admin/analytics/countries"],
    enabled: isAuthenticated && isAdmin,
  });
  
  // Don't render admin panel if not authenticated or not admin
  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  // Manual glossary update mutation
  const glossaryUpdateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/admin/glossary/update", "POST");
    },
    onSuccess: (data: any) => {
      const { newKeywordsAdded = 0, totalKeywords = 0, previousTotal = 0 } = data;
      
      toast({
        title: "Glossary Update Complete ✅",
        description: newKeywordsAdded > 0 
          ? `Added ${newKeywordsAdded} new keywords. Total: ${totalKeywords} (was ${previousTotal})`
          : `No new keywords found. Total remains: ${totalKeywords}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to update glossary",
        variant: "destructive",
      });
    }
  });

  const handleGlossaryUpdate = async () => {
    setGlossaryUpdating(true);
    try {
      await glossaryUpdateMutation.mutateAsync();
    } finally {
      setGlossaryUpdating(false);
    }
  };

  // Fetch chat metrics
  const { data: chatMetrics, isLoading: chatMetricsLoading } = useQuery<ChatMetrics[]>({
    queryKey: ["/api/admin/analytics/chat-metrics"],
    enabled: isAuthenticated && isAdmin,
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

  if (statsLoading || usersLoading || countryLoading) {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 relative overflow-hidden">
      {/* Animated Maritime Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-200/20 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-teal-200/20 rounded-full animate-bounce"></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-cyan-200/15 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-orange-200/20 rounded-full animate-bounce delay-500"></div>
      </div>
      
      <div className="bg-gradient-to-r from-blue-600 via-teal-600 to-cyan-600 shadow-lg border-b backdrop-blur-sm relative">
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
                <h1 className="text-3xl font-bold text-white drop-shadow-lg">
                  <i className="fas fa-shield-alt text-yellow-300 mr-3 animate-pulse"></i>
                  QaaqConnect Admin Panel
                </h1>
                <p className="text-blue-100 mt-1 drop-shadow">Manage users and system settings</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-yellow-400/20 text-yellow-100 border-yellow-300 backdrop-blur-sm animate-pulse">
              <i className="fas fa-user-crown mr-1 text-yellow-300"></i>
              Administrator
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 relative z-10">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setLocation("/admin/bot-rules")}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
            >
              <i className="fas fa-file-text mr-2 animate-pulse"></i>
              Edit QBOT Rules
            </Button>
            
            <Button
              onClick={() => setLocation("/admin/token-limits")}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
              data-testid="button-token-limits"
            >
              <i className="fas fa-cog mr-2 animate-spin-slow"></i>
              Configure Token Limits
            </Button>
            
            <Button
              onClick={handleGlossaryUpdate}
              disabled={glossaryUpdating || glossaryUpdateMutation.isPending}
              className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 backdrop-blur-sm disabled:opacity-50"
              data-testid="button-update-glossary"
            >
              {glossaryUpdating || glossaryUpdateMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Updating Glossary...
                </>
              ) : (
                <>
                  <i className="fas fa-sync-alt mr-2"></i>
                  Update Maritime Glossary
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            <i className="fas fa-info-circle mr-1"></i>
            Manual glossary update scans for new "What is..." questions and adds maritime terms to the database.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Enhanced Maritime-themed Navigation */}
          <div className="space-y-3">
            {/* First Row: Analytics, Metrics, QBOT */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setActiveTab("analytics")}
                className={`group flex items-center justify-center px-4 py-4 text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-105 ${
                  activeTab === "analytics"
                    ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30 scale-105"
                    : "bg-white/80 backdrop-blur-sm text-gray-700 border border-blue-200/50 hover:bg-blue-50/80 hover:border-blue-300 shadow-md hover:shadow-lg"
                }`}
              >
                <i className={`fas fa-chart-pie mr-2 ${activeTab === "analytics" ? "animate-pulse" : "group-hover:animate-bounce"}`}></i>
                Analytics
              </button>
              <button
                onClick={() => setActiveTab("metrics")}
                className={`group flex items-center justify-center px-4 py-4 text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-105 ${
                  activeTab === "metrics"
                    ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30 scale-105"
                    : "bg-white/80 backdrop-blur-sm text-gray-700 border border-teal-200/50 hover:bg-teal-50/80 hover:border-teal-300 shadow-md hover:shadow-lg"
                }`}
              >
                <i className={`fas fa-chart-line mr-2 ${activeTab === "metrics" ? "animate-pulse" : "group-hover:animate-bounce"}`}></i>
                Metrics
              </button>
              <button
                onClick={() => setActiveTab("qbot")}
                className={`group flex items-center justify-center px-4 py-4 text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-105 ${
                  activeTab === "qbot"
                    ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30 scale-105"
                    : "bg-white/80 backdrop-blur-sm text-gray-700 border border-cyan-200/50 hover:bg-cyan-50/80 hover:border-cyan-300 shadow-md hover:shadow-lg"
                }`}
              >
                <i className={`fas fa-robot mr-2 ${activeTab === "qbot" ? "animate-pulse" : "group-hover:animate-bounce"}`}></i>
                QBOT
              </button>
            </div>
            
            {/* Second Row: DB Backups, Search Analytics, QOI, User Management */}
            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={() => setActiveTab("backups")}
                className={`group flex items-center justify-center px-4 py-4 text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-105 ${
                  activeTab === "backups"
                    ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30 scale-105"
                    : "bg-white/80 backdrop-blur-sm text-gray-700 border border-red-200/50 hover:bg-red-50/80 hover:border-red-300 shadow-md hover:shadow-lg"
                }`}
              >
                <i className={`fas fa-database mr-2 ${activeTab === "backups" ? "animate-pulse" : "group-hover:animate-bounce"}`}></i>
                DB Backups
              </button>
              <button
                onClick={() => setActiveTab("search")}
                className={`group flex items-center justify-center px-4 py-4 text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-105 ${
                  activeTab === "search"
                    ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30 scale-105"
                    : "bg-white/80 backdrop-blur-sm text-gray-700 border border-indigo-200/50 hover:bg-indigo-50/80 hover:border-indigo-300 shadow-md hover:shadow-lg"
                }`}
              >
                <i className={`fas fa-search mr-2 ${activeTab === "search" ? "animate-pulse" : "group-hover:animate-bounce"}`}></i>
                Search
              </button>
              <button
                onClick={() => setActiveTab("qoi")}
                className={`group flex items-center justify-center px-4 py-4 text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-105 ${
                  activeTab === "qoi"
                    ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30 scale-105"
                    : "bg-white/80 backdrop-blur-sm text-gray-700 border border-emerald-200/50 hover:bg-emerald-50/80 hover:border-emerald-300 shadow-md hover:shadow-lg"
                }`}
              >
                <i className={`fas fa-comments mr-2 ${activeTab === "qoi" ? "animate-pulse" : "group-hover:animate-bounce"}`}></i>
                QOI GPT
              </button>
              <button
                onClick={() => setActiveTab("users")}
                className={`group flex items-center justify-center px-4 py-4 text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-105 ${
                  activeTab === "users"
                    ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30 scale-105"
                    : "bg-white/80 backdrop-blur-sm text-gray-700 border border-violet-200/50 hover:bg-violet-50/80 hover:border-violet-300 shadow-md hover:shadow-lg"
                }`}
              >
                <i className={`fas fa-users mr-2 ${activeTab === "users" ? "animate-pulse" : "group-hover:animate-bounce"}`}></i>
                Users
              </button>
            </div>
          </div>

          {/* Analytics Tab - Modern Dashboard with Charts */}
          <TabsContent value="analytics" className="space-y-6">
            <DashboardAnalytics />
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="group p-4 bg-gradient-to-br from-white/90 to-blue-50/90 backdrop-blur-sm border border-blue-200/50 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-xs font-medium text-blue-700 flex items-center">
                <i className="fas fa-users mr-2 text-blue-500 group-hover:animate-pulse"></i>
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-2xl font-bold text-blue-600 group-hover:text-blue-700 transition-colors">{stats?.totalUsers || 0}</div>
            </CardContent>
          </Card>
          
          <Card className="group p-4 bg-gradient-to-br from-white/90 to-teal-50/90 backdrop-blur-sm border border-teal-200/50 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-xs font-medium text-teal-700 flex items-center">
                <i className="fas fa-anchor mr-2 text-teal-500 group-hover:animate-bounce"></i>
                Sailors
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-2xl font-bold text-teal-600 group-hover:text-teal-700 transition-colors">{stats?.sailors || 0}</div>
            </CardContent>
          </Card>

          <Card className="group p-4 bg-gradient-to-br from-white/90 to-cyan-50/90 backdrop-blur-sm border border-cyan-200/50 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-xs font-medium text-cyan-700 flex items-center">
                <i className="fas fa-compass mr-2 text-cyan-500 group-hover:animate-spin"></i>
                Local Pros
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-2xl font-bold text-cyan-600 group-hover:text-cyan-700 transition-colors">{stats?.locals || 0}</div>
            </CardContent>
          </Card>

          <Card className="group p-4 bg-gradient-to-br from-white/90 to-emerald-50/90 backdrop-blur-sm border border-emerald-200/50 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-xs font-medium text-emerald-700 flex items-center">
                <i className="fas fa-certificate mr-2 text-emerald-500 group-hover:animate-pulse"></i>
                Verified
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-2xl font-bold text-emerald-600 group-hover:text-emerald-700 transition-colors">{stats?.verifiedUsers || 0}</div>
            </CardContent>
          </Card>

          <Card className="group p-4 bg-gradient-to-br from-white/90 to-purple-50/90 backdrop-blur-sm border border-purple-200/50 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-xs font-medium text-purple-700 flex items-center">
                <i className="fas fa-heartbeat mr-2 text-purple-500 group-hover:animate-pulse"></i>
                Active Users
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-2xl font-bold text-purple-600 group-hover:text-purple-700 transition-colors">{stats?.activeUsers || 0}</div>
            </CardContent>
          </Card>

          <Card className="group p-4 bg-gradient-to-br from-white/90 to-orange-50/90 backdrop-blur-sm border border-orange-200/50 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-xs font-medium text-orange-700 flex items-center">
                <i className="fas fa-ship mr-2 text-orange-500 group-hover:animate-bounce"></i>
                Total Logins
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-2xl font-bold text-orange-600 group-hover:text-orange-700 transition-colors">{stats?.totalLogins || 0}</div>
            </CardContent>
          </Card>
            </div>

            {/* Top Countries Analytics Chart */}
            <div className="mt-8">
              <Card className="bg-gradient-to-br from-white/95 to-blue-50/95 backdrop-blur-sm border border-blue-200/60 shadow-xl hover:shadow-2xl transition-all duration-500">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
                    <i className="fas fa-globe mr-3 text-blue-600 animate-spin-slow"></i>
                    <span className="bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                      Top Countries by Hits
                    </span>
                  </CardTitle>
                  <p className="text-sm text-blue-600/80">Maritime professionals worldwide activity</p>
                </CardHeader>
                <CardContent>
                  {countryAnalytics && countryAnalytics.length > 0 ? (
                    <div className="space-y-4">
                      <ChartContainer
                        config={{
                          totalHits: {
                            label: "Total Hits",
                            color: "#0ea5e9",
                          },
                          userCount: {
                            label: "Users",
                            color: "#10b981",
                          },
                          activeCount: {
                            label: "Active Users",
                            color: "#f59e0b",
                          },
                        }}
                        className="h-[300px]"
                      >
                        <BarChart data={countryAnalytics}>
                          <XAxis dataKey="country" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="totalHits" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ChartContainer>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                        {countryAnalytics.slice(0, 6).map((country, index) => (
                          <div key={country.country} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-800 flex items-center">
                                <span className="text-lg mr-2">
                                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🌍'}
                                </span>
                                {country.country}
                              </h4>
                              <span className="text-sm font-semibold text-ocean-teal">
                                {country.totalHits} hits
                              </span>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex justify-between">
                                <span>Total Users:</span>
                                <span className="font-medium">{country.userCount}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Active Users:</span>
                                <span className="font-medium text-green-600">{country.activeCount}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Verified:</span>
                                <span className="font-medium text-blue-600">{country.verifiedCount}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <i className="fas fa-chart-bar text-3xl mb-4"></i>
                      <p>No country data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Chat Metrics Line Chart */}
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
                    <i className="fas fa-comments mr-2 text-orange-600"></i>
                    Daily Chat Questions Growth
                  </CardTitle>
                  <p className="text-sm text-gray-600">Cumulative growth of Web Chat vs WhatsApp questions over the last 30 days</p>
                </CardHeader>
                <CardContent>
                  {chatMetrics && chatMetrics.length > 0 && !chatMetricsLoading ? (
                    (() => {
                      // Convert to cumulative data
                      let webchatCumulative = 0;
                      let whatsappCumulative = 0;
                      const cumulativeData = chatMetrics.map(item => {
                        webchatCumulative += item.webchat;
                        whatsappCumulative += item.whatsapp;
                        return {
                          ...item,
                          webchatCumulative,
                          whatsappCumulative,
                          totalCumulative: webchatCumulative + whatsappCumulative
                        };
                      });

                      return (
                        <ChartContainer
                          config={{
                            webchatCumulative: {
                              label: "Web Chat (Cumulative)",
                              color: "#ea580c",
                            },
                            whatsappCumulative: {
                              label: "WhatsApp (Cumulative)",
                              color: "#25d366",
                            },
                            totalCumulative: {
                              label: "Total Questions",
                              color: "#6b7280",
                            },
                          }}
                          className="h-[400px]"
                        >
                          <LineChart data={cumulativeData}>
                            <XAxis 
                              dataKey="date" 
                              tick={{ fontSize: 12 }}
                              tickFormatter={(value) => {
                                const date = new Date(value);
                                return `${date.getMonth() + 1}/${date.getDate()}`;
                              }}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <ChartTooltip 
                              content={<ChartTooltipContent />}
                              labelFormatter={(value) => {
                                const date = new Date(value);
                                return date.toLocaleDateString();
                              }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="webchatCumulative" 
                              stroke="#ea580c" 
                              strokeWidth={3}
                              dot={{ fill: "#ea580c", strokeWidth: 2, r: 3 }}
                              activeDot={{ r: 6, stroke: "#ea580c", strokeWidth: 2 }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="whatsappCumulative" 
                              stroke="#25d366" 
                              strokeWidth={3}
                              dot={{ fill: "#25d366", strokeWidth: 2, r: 3 }}
                              activeDot={{ r: 6, stroke: "#25d366", strokeWidth: 2 }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="totalCumulative" 
                              stroke="#6b7280" 
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              dot={false}
                              activeDot={{ r: 5, stroke: "#6b7280", strokeWidth: 2 }}
                            />
                          </LineChart>
                        </ChartContainer>
                      );
                    })()
                  ) : chatMetricsLoading ? (
                    <div className="flex items-center justify-center h-[400px]">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
                        <p className="text-gray-400">Loading chat metrics...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 text-gray-500">
                      <i className="fas fa-chart-line text-4xl mb-4"></i>
                      <p>No chat metrics data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Database Backup Metrics Tab */}
          <TabsContent value="backups" className="space-y-6">
            <DatabaseBackupMetrics />
          </TabsContent>

          {/* Search Analytics Tab */}
          <TabsContent value="search" className="space-y-6">
            <SearchAnalyticsPanel />
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
                  <i className="fas fa-users mr-2 text-orange-600"></i>
                  Maritime Professionals
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
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const token = localStorage.getItem('token');
                        window.open(`/api/admin/users/export/csv?token=${token}`, '_blank');
                      }}
                      className="text-xs"
                    >
                      <i className="fas fa-file-csv mr-1"></i>
                      CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const token = localStorage.getItem('token');
                        window.open(`/api/admin/users/export/vcf?token=${token}`, '_blank');
                      }}
                      className="text-xs"
                    >
                      <i className="fas fa-address-book mr-1"></i>
                      VCF
                    </Button>
                    <Badge variant="secondary">
                      {filteredUsers.length} professionals found
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Users sorted by last login time (most recent first)
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[80vh] overflow-y-auto">
                  {filteredUsers.map((user) => (
                    <Card key={user.id} className="hover:shadow-md transition-shadow border-l-4 border-l-orange-500">
                      <CardContent className="p-4">
                        {/* User Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 text-sm truncate">
                              {user.fullName}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {user.email}
                            </div>
                            {user.whatsappNumber && (
                              <div className="text-xs text-green-600 mt-1">
                                <i className="fab fa-whatsapp mr-1"></i>
                                {user.whatsappNumber}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end space-y-1">
                            {user.maritimeRank && (
                              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                <i className="fas fa-anchor mr-1"></i>
                                {user.maritimeRank}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Maritime Info */}
                        <div className="space-y-2 mb-3">
                          {user.shipName && (
                            <div className="bg-blue-50 p-2 rounded text-xs">
                              <div className="font-medium text-blue-800">
                                <i className="fas fa-ship mr-1"></i>
                                {user.shipName}
                              </div>
                              {user.imoNumber && (
                                <div className="text-blue-600">IMO: {user.imoNumber}</div>
                              )}
                            </div>
                          )}
                          {user.city && (
                            <div className="text-xs text-gray-600">
                              <i className="fas fa-map-marker-alt mr-1"></i>
                              {user.city}, {user.country}
                            </div>
                          )}
                        </div>

                        {/* Activity Stats */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="bg-orange-50 p-2 rounded text-center">
                            <div className="text-lg font-bold text-orange-600">{user.questionCount}</div>
                            <div className="text-xs text-orange-700">Questions</div>
                          </div>
                          <div className="bg-green-50 p-2 rounded text-center">
                            <div className="text-lg font-bold text-green-600">{user.loginCount}</div>
                            <div className="text-xs text-green-700">Logins</div>
                          </div>
                        </div>

                        {/* Status Badges */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {user.isVerified ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                              <i className="fas fa-check-circle mr-1"></i>
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                              <i className="fas fa-clock mr-1"></i>
                              Pending
                            </Badge>
                          )}
                          {user.isAdmin && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                              <i className="fas fa-crown mr-1"></i>
                              Admin
                            </Badge>
                          )}
                        </div>

                        {/* Last Login */}
                        {user.lastLogin && (
                          <div className="text-xs text-gray-500 mb-3">
                            <i className="fas fa-clock mr-1"></i>
                            Last login: {new Date(user.lastLogin).toLocaleDateString()}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs"
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
                            className="flex-1 text-xs"
                            onClick={() => toggleAdminMutation.mutate({
                              userId: user.id,
                              isAdmin: !user.isAdmin
                            })}
                            disabled={toggleAdminMutation.isPending}
                          >
                            <i className={`fas ${user.isAdmin ? 'fa-user-minus' : 'fa-user-plus'} mr-1`}></i>
                            {user.isAdmin ? 'Remove' : 'Admin'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}