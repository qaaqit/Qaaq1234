import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Wrench, 
  DollarSign, 
  Calendar, 
  Users, 
  Clock, 
  MapPin,
  Settings,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface WorkshopProfile {
  id: string;
  displayId: string;
  fullName: string;
  email: string;
  homePort: string;
  maritimeExpertise: string[];
  isVerified: boolean;
  isActive: boolean;
  services: string;
}

interface BookingSummary {
  pending: number;
  confirmed: number;
  inProgress: number;
  completed: number;
  totalRevenue: number;
  thisMonth: number;
}

interface TaskSummary {
  totalTasks: number;
  activeTasks: number;
  completionRate: number;
  averageHours: number;
}

interface PricingSummary {
  totalCategories: number;
  averageRate: number;
  lastUpdated: string;
  needsUpdate: number;
}

export default function WorkshopOwnerDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Redirect non-authenticated users
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/login');
      return;
    }
  }, [isAuthenticated, setLocation]);

  // Fetch workshop profile for current user
  const { data: workshopProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/workshop-owner/profile', user?.id],
    enabled: !!user?.id
  });

  // Fetch dashboard statistics
  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/workshop-owner/dashboard-stats', user?.id],
    enabled: !!user?.id
  });

  // Fetch recent bookings
  const { data: recentBookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['/api/workshop-owner/recent-bookings', user?.id],
    enabled: !!user?.id,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  if (!isAuthenticated || profileLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Wrench className="text-2xl text-white" />
          </div>
          <p className="text-gray-600">Loading workshop dashboard...</p>
        </div>
      </div>
    );
  }

  // Check if user is a workshop provider
  if (!user?.isWorkshopProvider && !user?.isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-2xl text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Restricted</h2>
          <p className="text-gray-600 mb-6">
            This dashboard is only available to registered workshop service providers.
          </p>
          <Button 
            onClick={() => setLocation('/')}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  const bookingStats: BookingSummary = dashboardStats?.bookings || {
    pending: 0,
    confirmed: 0,
    inProgress: 0,
    completed: 0,
    totalRevenue: 0,
    thisMonth: 0
  };

  const taskStats: TaskSummary = dashboardStats?.tasks || {
    totalTasks: 0,
    activeTasks: 0,
    completionRate: 0,
    averageHours: 0
  };

  const pricingStats: PricingSummary = dashboardStats?.pricing || {
    totalCategories: 0,
    averageRate: 0,
    lastUpdated: new Date().toISOString(),
    needsUpdate: 0
  };

  const handleNavigateToTasks = () => {
    setLocation('/workshop-owner/tasks');
  };

  const handleNavigateToPricing = () => {
    setLocation('/workshop-owner/pricing');
  };

  const handleNavigateToBookings = () => {
    setLocation('/workshop-owner/bookings');
  };

  const handleNavigateToSettings = () => {
    setLocation('/workshop-owner/settings');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Wrench className="text-xl text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Workshop Dashboard</h1>
                <div className="flex items-center space-x-3 mt-1">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {workshopProfile?.homePort || user?.city || 'Location not set'}
                    </span>
                  </div>
                  {workshopProfile?.displayId && (
                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                      {workshopProfile.displayId}
                    </Badge>
                  )}
                  {workshopProfile?.isVerified && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button
              onClick={handleNavigateToSettings}
              variant="outline"
              className="flex items-center space-x-2"
              data-testid="button-settings"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="bookings" data-testid="tab-bookings">Bookings</TabsTrigger>
            <TabsTrigger value="tasks" data-testid="tab-tasks">Tasks</TabsTrigger>
            <TabsTrigger value="pricing" data-testid="tab-pricing">Pricing</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-blue-700">Pending Bookings</CardTitle>
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-900" data-testid="metric-pending-bookings">
                    {bookingStats.pending}
                  </div>
                  <p className="text-xs text-blue-600 mt-1">Require response</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-green-700">Active Jobs</CardTitle>
                    <Users className="w-4 h-4 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-900" data-testid="metric-active-jobs">
                    {bookingStats.inProgress}
                  </div>
                  <p className="text-xs text-green-600 mt-1">In progress</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-orange-700">This Month</CardTitle>
                    <DollarSign className="w-4 h-4 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-900" data-testid="metric-monthly-revenue">
                    ${bookingStats.thisMonth.toLocaleString()}
                  </div>
                  <p className="text-xs text-orange-600 mt-1">Revenue</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-purple-700">Completion Rate</CardTitle>
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-900" data-testid="metric-completion-rate">
                    {taskStats.completionRate}%
                  </div>
                  <p className="text-xs text-purple-600 mt-1">Task success rate</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-orange-600" />
                  <span>Quick Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    onClick={handleNavigateToTasks}
                    className="bg-blue-600 hover:bg-blue-700 h-auto py-4 px-6"
                    data-testid="button-manage-tasks"
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <Wrench className="w-6 h-6" />
                      <div className="text-center">
                        <div className="font-semibold">Manage Tasks</div>
                        <div className="text-xs opacity-90">{taskStats.activeTasks} active tasks</div>
                      </div>
                    </div>
                  </Button>

                  <Button
                    onClick={handleNavigateToPricing}
                    className="bg-green-600 hover:bg-green-700 h-auto py-4 px-6"
                    data-testid="button-update-pricing"
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <DollarSign className="w-6 h-6" />
                      <div className="text-center">
                        <div className="font-semibold">Update Pricing</div>
                        <div className="text-xs opacity-90">{pricingStats.totalCategories} categories</div>
                      </div>
                    </div>
                  </Button>

                  <Button
                    onClick={handleNavigateToBookings}
                    className="bg-orange-600 hover:bg-orange-700 h-auto py-4 px-6"
                    data-testid="button-view-bookings"
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <Calendar className="w-6 h-6" />
                      <div className="text-center">
                        <div className="font-semibold">View Bookings</div>
                        <div className="text-xs opacity-90">{bookingStats.pending} pending</div>
                      </div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-orange-600" />
                    <span>Recent Bookings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {bookingsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : recentBookings?.length > 0 ? (
                    <div className="space-y-4" data-testid="recent-bookings-list">
                      {recentBookings.slice(0, 5).map((booking: any) => (
                        <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium text-gray-900">{booking.shipName}</div>
                            <div className="text-sm text-gray-600">{booking.port}</div>
                          </div>
                          <div className="text-right">
                            <Badge 
                              className={`text-xs ${
                                booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                booking.status === 'in_progress' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {booking.status}
                            </Badge>
                            <div className="text-xs text-gray-500 mt-1">
                              ${booking.quotedAmount || 0}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-600">No recent bookings</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                    <span>Performance Metrics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Task Completion Rate</span>
                      <span className="text-sm text-gray-600">{taskStats.completionRate}%</span>
                    </div>
                    <Progress value={taskStats.completionRate} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Average Job Duration</span>
                      <span className="text-sm text-gray-600">{taskStats.averageHours}h</span>
                    </div>
                    <Progress value={Math.min((taskStats.averageHours / 16) * 100, 100)} className="h-2" />
                  </div>

                  <div className="pt-2 border-t">
                    <div className="text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Total Revenue:</span>
                        <span className="font-medium">${bookingStats.totalRevenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span>Completed Jobs:</span>
                        <span className="font-medium">{bookingStats.completed}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bookings">
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Booking Management
                  </h3>
                  <p className="text-gray-600 max-w-md mx-auto mb-6">
                    Detailed booking management interface coming soon. Use the overview tab for quick actions.
                  </p>
                  <Button
                    onClick={handleNavigateToBookings}
                    className="bg-orange-600 hover:bg-orange-700"
                    data-testid="button-detailed-bookings"
                  >
                    View Detailed Bookings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks">
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Task Management
                  </h3>
                  <p className="text-gray-600 max-w-md mx-auto mb-6">
                    Detailed task management interface coming soon. Create and manage your workshop service tasks organized by SEMM equipment codes.
                  </p>
                  <Button
                    onClick={handleNavigateToTasks}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="button-detailed-tasks"
                  >
                    Manage Tasks
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing">
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Pricing Management
                  </h3>
                  <p className="text-gray-600 max-w-md mx-auto mb-6">
                    Detailed pricing management interface coming soon. Set and update your 8-hour shift rates for different expertise categories.
                  </p>
                  <Button
                    onClick={handleNavigateToPricing}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="button-detailed-pricing"
                  >
                    Update Pricing
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}