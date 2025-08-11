import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, MessageSquare, Award, MapPin, Ship } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface TopProfessional {
  id: string;
  userId: string;
  fullName: string;
  email?: string;
  maritimeRank: string;
  shipName?: string;
  port?: string;
  country?: string;
  questionCount: number;
  answerCount: number;
  userType: string;
  subscriptionStatus: string;
  profilePictureUrl?: string;
  isTopProfessional: boolean;
}

interface TopProfessionalsResponse {
  success: boolean;
  professionals: TopProfessional[];
  total: number;
  message: string;
}

const RANK_COLORS = {
  'chief_engineer': '#ea580c', // Orange
  'chief_officer': '#dc2626', // Red
  'captain': '#991b1b', // Dark red
  'second_engineer': '#f97316', // Light orange
  'third_engineer': '#fb923c', // Lighter orange
  'fourth_engineer': '#fed7aa', // Very light orange
  'junior_engineer': '#fef3c7', // Pale orange
  'other': '#6b7280', // Gray
  'default': '#9ca3af' // Light gray
};

const PIE_COLORS = ['#ea580c', '#dc2626', '#f97316', '#fb923c', '#fed7aa', '#fef3c7', '#6b7280', '#9ca3af', '#475569'];

export function TopQProfessionals() {
  const { data, isLoading, error } = useQuery<TopProfessionalsResponse>({
    queryKey: ['/api/users/top-professionals'],
    queryFn: async () => {
      const response = await fetch('/api/users/top-professionals');
      if (!response.ok) {
        throw new Error('Failed to fetch top professionals');
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <Crown className="h-6 w-6 text-orange-600" />
          <h2 className="text-2xl font-bold text-gray-800">Top Q Professionals</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6 text-center">
          <Award className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-700 mb-2">Unable to Load Top Professionals</h3>
          <p className="text-red-600">Please try again later</p>
        </CardContent>
      </Card>
    );
  }

  const professionals = data.professionals || [];
  
  // Prepare chart data
  const chartData = professionals.map((prof, index) => ({
    name: prof.fullName || prof.email || `Professional ${index + 1}`,
    questions: prof.questionCount,
    answers: prof.answerCount,
    rank: prof.maritimeRank || 'other'
  }));

  // Prepare pie chart data for rank distribution
  const rankDistribution = professionals.reduce((acc, prof) => {
    const rank = prof.maritimeRank || 'other';
    acc[rank] = (acc[rank] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(rankDistribution).map(([rank, count]) => ({
    name: rank.replace('_', ' ').toUpperCase(),
    value: count,
    color: RANK_COLORS[rank as keyof typeof RANK_COLORS] || RANK_COLORS.default
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Crown className="h-8 w-8 text-orange-600" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            Top Q Professionals
          </h1>
        </div>
        <p className="text-gray-600">Leading maritime experts ranked by their question contributions</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-700">{professionals.length}</div>
            <div className="text-sm text-orange-600">Top Professionals</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-700">
              {professionals.reduce((sum, p) => sum + p.questionCount, 0)}
            </div>
            <div className="text-sm text-red-600">Total Questions</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-700">
              {professionals.reduce((sum, p) => sum + p.answerCount, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Answers</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5 text-orange-600" />
              Question Count Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [value, name === 'questions' ? 'Questions' : 'Answers']}
                  labelFormatter={(label) => `Professional: ${label}`}
                />
                <Bar dataKey="questions" fill="#ea580c" name="questions" />
                <Bar dataKey="answers" fill="#dc2626" name="answers" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-orange-600" />
              Rank Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Professionals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {professionals.map((professional, index) => (
          <Card 
            key={professional.id} 
            className={`transform hover:scale-105 transition-all duration-200 ${
              index === 0 ? 'ring-2 ring-orange-400 bg-gradient-to-br from-orange-50 to-red-50' :
              index === 1 ? 'ring-2 ring-red-400 bg-gradient-to-br from-red-50 to-orange-50' :
              index === 2 ? 'ring-2 ring-gray-400 bg-gradient-to-br from-gray-50 to-gray-100' :
              'hover:shadow-lg'
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {index < 3 && (
                    <div className={`text-2xl ${
                      index === 0 ? 'text-orange-500' :
                      index === 1 ? 'text-red-500' :
                      'text-gray-500'
                    }`}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-lg">
                      {professional.fullName || professional.email || 'Maritime Professional'}
                    </CardTitle>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge 
                        variant="secondary" 
                        className="text-xs"
                        style={{ 
                          backgroundColor: RANK_COLORS[professional.maritimeRank as keyof typeof RANK_COLORS] || RANK_COLORS.default,
                          color: 'white'
                        }}
                      >
                        {professional.maritimeRank?.replace('_', ' ').toUpperCase() || 'PROFESSIONAL'}
                      </Badge>
                    </div>
                  </div>
                </div>
                {professional.userType === 'Premium' && (
                  <Crown className="h-5 w-5 text-yellow-500" />
                )}
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* Question & Answer Stats */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">Questions</span>
                  </div>
                  <Badge variant="outline" className="font-bold text-orange-700">
                    {professional.questionCount}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium">Answers</span>
                  </div>
                  <Badge variant="outline" className="font-bold text-red-700">
                    {professional.answerCount}
                  </Badge>
                </div>

                {/* Location & Ship Info */}
                {(professional.shipName || professional.port) && (
                  <div className="pt-2 border-t border-gray-200">
                    {professional.shipName && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Ship className="h-4 w-4" />
                        <span>{professional.shipName}</span>
                      </div>
                    )}
                    {professional.port && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span>{professional.port}{professional.country && `, ${professional.country}`}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Progress Bar */}
                <div className="pt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min((professional.questionCount / (professionals[0]?.questionCount || 1)) * 100, 100)}%` 
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1 text-center">
                    Rank #{index + 1} of {professionals.length}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer Note */}
      <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-gray-600">
            Rankings are based on authentic question contributions from maritime professionals. 
            Data updated from the comprehensive QAAQ maritime database.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}