import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, TrendingUp, Users, Clock } from 'lucide-react';

interface TopKeyword {
  keyword: string;
  searchCount: number;
  lastSearchedAt: string;
}

interface SearchHistory {
  keyword: string;
  searchContext: string;
  resultsFound: number;
  searchedAt: string;
}

interface SearchAnalyticsSummary {
  totalUniqueKeywords: number;
  totalSearches: number;
  totalUserSearches: number;
  topKeywords: TopKeyword[];
}

export default function SearchAnalyticsPanel() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['/api/admin/search-analytics/summary'],
    staleTime: 30000, // 30 seconds
  });

  const { data: topKeywords = [], isLoading: keywordsLoading } = useQuery({
    queryKey: ['/api/admin/search-analytics/keywords'],
    staleTime: 30000,
  });

  if (summaryLoading || keywordsLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const summaryData = summary as SearchAnalyticsSummary;

  return (
    <div className="space-y-6">
      {/* Search Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Keywords</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData?.totalUniqueKeywords || 0}</div>
            <p className="text-xs text-muted-foreground">
              Different search terms used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData?.totalSearches || 0}</div>
            <p className="text-xs text-muted-foreground">
              All search operations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Searches</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData?.totalUserSearches || 0}</div>
            <p className="text-xs text-muted-foreground">
              Authenticated user searches
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Keywords */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Top Search Keywords
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Array.isArray(topKeywords) && topKeywords.length > 0 ? (
            <div className="space-y-3">
              {topKeywords.slice(0, 20).map((keyword: TopKeyword, index: number) => (
                <div key={keyword.keyword} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <span className="font-medium">{keyword.keyword}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {keyword.searchCount} searches
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(keyword.lastSearchedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-orange-600">
                      {keyword.searchCount}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No search data available yet</p>
              <p className="text-sm">Search analytics will appear once users start searching</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function UserSearchHistoryPanel({ userId }: { userId?: string }) {
  const { data: searchHistory = [], isLoading } = useQuery({
    queryKey: ['/api/search-analytics/history'],
    enabled: !!userId,
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Search History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="animate-pulse flex justify-between p-2">
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-4 bg-muted rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Your Recent Searches
        </CardTitle>
      </CardHeader>
      <CardContent>
        {Array.isArray(searchHistory) && searchHistory.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {searchHistory.map((item: SearchHistory, index: number) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="font-medium">{item.keyword}</span>
                    <div className="text-xs text-muted-foreground">
                      {item.resultsFound} results in {item.searchContext}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(item.searchedAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No search history yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}