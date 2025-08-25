import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, MessageCircle, Anchor } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface RankGroup {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  groupType?: string;
  isActive: boolean;
  createdAt: string;
}

export function RankGroupsPanel() {
  const { user } = useAuth();
  
  // Fetch all rank groups with member counts
  const { data: rankGroups = [], isLoading } = useQuery<RankGroup[]>({
    queryKey: ['/api/rank-groups'],
    queryFn: async () => {
      const response = await fetch('/api/rank-groups');
      if (!response.ok) throw new Error('Failed to fetch rank groups');
      const data = await response.json();
      console.log('🔍 Frontend: Rank groups data received:', data.length, 'groups');
      return data;
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes to avoid excessive polling
  });

  // Filter out "Other Marine Professionals" as requested
  const filteredRankGroups = rankGroups.filter(group => 
    group.name !== 'Other Marine Professionals' && group.memberCount > 0
  );

  // Calculate total users (excluding "Other Marine Professionals")
  const totalUsers = filteredRankGroups.reduce((sum, group) => sum + group.memberCount, 0);

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500 py-12">
          <Anchor className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Please log in to view maritime rank groups.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Anchor className="h-6 w-6 text-orange-600" />
          <h2 className="text-2xl font-bold">Loading Maritime Rank Groups...</h2>
        </div>
        <div className="flex justify-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Anchor className="h-8 w-8 text-orange-600" />
            <h1 className="text-3xl font-bold text-gray-900">Maritime Rank Groups</h1>
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Total Users: <span className="font-semibold text-orange-600">{totalUsers}</span></span>
            </div>
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4" />
              <span>Active Groups: <span className="font-semibold text-orange-600">{filteredRankGroups.length}</span></span>
            </div>
          </div>
        </div>

        {/* Rank Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRankGroups.map((group) => (
            <Card 
              key={group.id} 
              className="bg-white hover:shadow-lg transition-all duration-200 border-l-4 border-l-orange-500"
              data-testid={`card-rank-group-${group.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold text-gray-900" data-testid={`text-group-name-${group.id}`}>
                    {group.name}
                  </CardTitle>
                  <Badge 
                    className="bg-orange-100 text-orange-800 font-semibold px-3 py-1"
                    data-testid={`badge-member-count-${group.id}`}
                  >
                    <Users className="h-3 w-3 mr-1" />
                    {group.memberCount}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription 
                  className="text-gray-600 text-sm leading-relaxed"
                  data-testid={`text-group-description-${group.id}`}
                >
                  {group.description}
                </CardDescription>
                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                  <span data-testid={`text-member-label-${group.id}`}>
                    {group.memberCount === 1 ? '1 Member' : `${group.memberCount} Members`}
                  </span>
                  <span className="text-green-600 font-medium">Active</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredRankGroups.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            <Anchor className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No active maritime rank groups found</p>
            <p className="text-sm">Maritime rank groups will appear here as users join the platform.</p>
          </div>
        )}
      </div>
    </div>
  );
}