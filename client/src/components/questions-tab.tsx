import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle, Search, Calendar, Eye, CheckCircle, Clock, Hash } from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';

interface Question {
  id: number;
  content: string;
  author_id: string;
  author_name: string;
  author_rank?: string;
  tags: string[];
  views: number;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
  image_urls: string[];
  is_from_whatsapp: boolean;
  engagement_score: number;
  flag_count: number;
  category_name?: string;
  answer_count: number;
  author_whatsapp_profile_picture_url?: string | null;
  author_whatsapp_display_name?: string | null;
  author_profile_picture_url?: string | null;
}

interface QuestionsResponse {
  questions: Question[];
  total: number;
  hasMore: boolean;
}

export function QuestionsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const observer = useRef<IntersectionObserver | null>(null);
  const lastQuestionRef = useRef<HTMLDivElement | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch questions with infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    error
  } = useInfiniteQuery({
    queryKey: ['/api/questions', debouncedSearch],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        limit: '20',
        ...(debouncedSearch && { search: debouncedSearch })
      });
      const response = await apiRequest(`/api/questions?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }
      return response.json() as Promise<QuestionsResponse>;
    },
    getNextPageParam: (lastPage, pages) => {
      return lastPage.hasMore ? pages.length + 1 : undefined;
    },
    initialPageParam: 1
  });

  // Set up intersection observer for infinite scroll
  const lastQuestionCallback = useCallback((node: HTMLDivElement | null) => {
    if (isFetchingNextPage) return;
    
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage) {
        fetchNextPage();
      }
    });
    
    if (node) observer.current.observe(node);
  }, [isFetchingNextPage, fetchNextPage, hasNextPage]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatRank = (rank?: string) => {
    if (!rank) return null;
    return rank.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const allQuestions = data?.pages.flatMap(page => page.questions) || [];
  const totalQuestions = data?.pages[0]?.total || 0;

  return (
    <div className="space-y-4">
      {/* Search and Header */}
      <Card className="border-2 border-ocean-teal/20">
        <CardHeader>
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2 text-navy">
                <MessageCircle size={20} />
                <span>Maritime Q&A</span>
                <Badge variant="secondary" className="ml-2">
                  {totalQuestions} Questions
                </Badge>
              </CardTitle>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Questions List */}
      <div className="space-y-4">
        {status === 'pending' ? (
          // Loading skeletons
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-2 border-gray-200">
              <CardContent className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2 mb-4" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))
        ) : status === 'error' ? (
          <Card className="border-2 border-red-200">
            <CardContent className="p-8 text-center">
              <p className="text-red-600">Failed to load questions. Please try again.</p>
            </CardContent>
          </Card>
        ) : allQuestions.length === 0 ? (
          <Card className="border-2 border-gray-200">
            <CardContent className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <MessageCircle size={32} className="text-gray-400" />
              </div>
              <p className="text-gray-600">
                {debouncedSearch ? 'No questions found matching your search.' : 'No questions available yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          allQuestions.map((question, index) => (
            <div
              key={question.id}
              ref={index === allQuestions.length - 1 ? lastQuestionCallback : null}
            >
              <Card 
                className="border-2 border-gray-200 hover:border-ocean-teal/40 transition-colors cursor-pointer"
                onClick={() => window.location.href = `/share/question/${question.id}`}
              >
                <CardContent className="p-4">
                  {/* Author and Metadata */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10 border-2 border-ocean-teal">
                        {(question.author_whatsapp_profile_picture_url || question.author_profile_picture_url) && (
                          <img 
                            src={(question.author_whatsapp_profile_picture_url || question.author_profile_picture_url) as string} 
                            alt={`${question.author_whatsapp_display_name || question.author_name}'s profile`}
                            className="w-full h-full rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        )}
                        <AvatarFallback className="bg-gradient-to-r from-ocean-teal to-cyan-600 text-white font-bold text-sm">
                          {getInitials(question.author_whatsapp_display_name || question.author_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/user/${question.author_id}`;
                      }} className="cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <h4 className="font-medium text-gray-900">
                          <span className="text-gray-500 mr-2">#{question.id}</span>
                          {question.author_name}
                        </h4>
                        {question.author_rank && (
                          <p className="text-sm text-gray-600">{formatRank(question.author_rank)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {question.is_resolved && (
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          <CheckCircle size={14} className="mr-1" />
                          Resolved
                        </Badge>
                      )}
                      {question.is_from_whatsapp && (
                        <Badge variant="secondary" className="bg-green-50 text-green-700">
                          WhatsApp
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Question Content */}
                  <p className="text-gray-900 mb-3 line-clamp-3">
                    {question.content || 'Question content not available'}
                  </p>

                  {/* Tags */}
                  {question.tags && question.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {question.tags.slice(0, 5).map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          <Hash size={12} className="mr-1" />
                          {tag}
                        </Badge>
                      ))}
                      {question.tags.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{question.tags.length - 5} more
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Footer Stats */}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center space-x-1">
                        <Eye size={16} />
                        <span>{question.views || 0} views</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <MessageCircle size={16} />
                        <span>{question.answer_count || 0} answers</span>
                      </span>
                      {question.category_name && (
                        <Badge variant="secondary" className="text-xs">
                          {question.category_name}
                        </Badge>
                      )}
                    </div>
                    <span className="flex items-center space-x-1">
                      <Calendar size={16} />
                      <span>{format(new Date(question.created_at), 'MMM d, yyyy')}</span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))
        )}

        {/* Loading more indicator */}
        {isFetchingNextPage && (
          <div className="flex justify-center p-4">
            <div className="flex items-center space-x-2">
              <Clock className="animate-spin" size={20} />
              <span>Loading more questions...</span>
            </div>
          </div>
        )}

        {/* End of list */}
        {!hasNextPage && allQuestions.length > 0 && (
          <div className="text-center p-4 text-gray-600">
            <p>You've reached the end of {totalQuestions} questions</p>
          </div>
        )}
      </div>
    </div>
  );
}