import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { 
  Search, 
  MessageCircle, 
  Eye, 
  CheckCircle, 
  ArrowUp,
  ImageIcon,
  User,
  Clock,
  Tag,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import UserDropdown from '@/components/user-dropdown';

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
  is_hidden?: boolean;
}

interface Answer {
  id: number;
  content: string;
  author_id: string;
  author_name: string;
  author_rank?: string;
  created_at: string;
  is_best_answer: boolean;
  is_from_whatsapp: boolean;
  image_urls: string[];
  author_whatsapp_display_name?: string | null;
  author_whatsapp_profile_picture_url?: string | null;
}

interface QuestionsResponse {
  questions: Question[];
  total: number;
  hasMore: boolean;
}

export default function QuestionBank() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const { user } = useAuth();
  const observer = useRef<IntersectionObserver | null>(null);

  // Check if user is admin
  const isAdmin = user?.isAdmin || 
                  user?.fullName === '+919029010070' || 
                  user?.id === '44885683' ||
                  user?.id === '+919029010070' ||
                  user?.id === '5791e66f-9cc1-4be4-bd4b-7fc1bd2e258e';

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle scroll for "scroll to top" button
  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          setShowScrollToTop(scrollTop > 300);
          setScrollPosition(scrollTop);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
        limit: '20'
      });
      
      if (debouncedSearch.trim()) {
        params.append('search', debouncedSearch.trim());
      }

      const response = await apiRequest(`/api/questions?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }
      return response.json() as Promise<QuestionsResponse>;
    },
    getNextPageParam: (lastPage, pages) => {
      return lastPage.hasMore ? pages.length + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false
  });

  // Set up intersection observer for infinite scroll
  const lastQuestionCallback = useCallback((node: HTMLDivElement | null) => {
    if (isFetchingNextPage) return;
    
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }, {
      threshold: 0.1,
    });
    
    if (node) observer.current.observe(node);
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  // Clean question content by removing QBOT breadcrumbs
  const cleanQuestionContent = (content: string): string => {
    if (!content) return 'Question content not available';
    
    const breadcrumbPattern = /^\[QBOT Q&A[^\]]*\]\s*/;
    let cleanContent = content.replace(breadcrumbPattern, '');
    
    const userPattern = /^User:\s*[^(]*\(via Q[^)]*\)\s*/;
    cleanContent = cleanContent.replace(userPattern, '');
    
    cleanContent = cleanContent.replace(/^\s+/, '');
    
    if (!cleanContent.trim()) {
      return content;
    }
    
    return cleanContent.trim();
  };

  // Toggle expanded state for question details
  const toggleExpanded = (questionId: number) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  // Fetch answers for a specific question
  const useQuestionAnswers = (questionId: number, enabled: boolean) => {
    return useQuery({
      queryKey: [`/api/questions/${questionId}/answers`],
      queryFn: async () => {
        const response = await apiRequest(`/api/questions/${questionId}/answers`);
        if (!response.ok) {
          throw new Error('Failed to fetch answers');
        }
        return response.json() as Promise<Answer[]>;
      },
      enabled,
      staleTime: 10 * 60 * 1000, // 10 minutes cache
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false
    });
  };

  // Helper functions
  const formatRank = (rank: string): string => {
    return rank.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getInitials = (name: string | null | undefined): string => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const allQuestions = useMemo(() => 
    data?.pages.flatMap(page => page.questions) || [], 
    [data]
  );
  const totalQuestions = data?.pages[0]?.total || 0;

  // Question card component
  const QuestionCard = ({ question, isLast }: { question: Question; isLast: boolean }) => {
    const isExpanded = expandedQuestions.has(question.id);
    const { data: answers, isLoading: answersLoading } = useQuestionAnswers(question.id, isExpanded);

    return (
      <Card 
        key={question.id}
        ref={isLast ? lastQuestionCallback : null}
        className="border-2 border-gray-200 hover:border-orange-300 transition-colors mb-4"
      >
        <CardContent className="p-4">
          {/* Question Header */}
          <div className="flex items-start space-x-3 mb-3">
            <Avatar className="w-10 h-10 flex-shrink-0">
              {question.author_whatsapp_profile_picture_url ? (
                <img
                  src={question.author_whatsapp_profile_picture_url}
                  alt={`${question.author_whatsapp_display_name || question.author_name}'s profile`}
                  className="w-full h-full rounded-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : question.author_profile_picture_url ? (
                <img
                  src={question.author_profile_picture_url}
                  alt={`${question.author_name}'s profile`}
                  className="w-full h-full rounded-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : null}
              <AvatarFallback className="bg-gradient-to-r from-orange-100 to-red-100 text-gray-700">
                {getInitials(question.author_whatsapp_display_name || question.author_name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-medium text-gray-900 truncate">
                  {question.author_whatsapp_display_name || question.author_name}
                </h4>
                {question.author_rank && (
                  <Badge variant="outline" className="text-xs bg-white">
                    {formatRank(question.author_rank)}
                  </Badge>
                )}
                {question.is_from_whatsapp && (
                  <Badge variant="secondary" className="bg-green-50 text-green-700 text-xs">
                    WhatsApp
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                <span className="flex items-center space-x-1">
                  <Clock size={12} />
                  <span>{formatTimeAgo(question.created_at)}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Eye size={12} />
                  <span>{question.views} views</span>
                </span>
                <span className="flex items-center space-x-1">
                  <MessageCircle size={12} />
                  <span>{question.answer_count} answers</span>
                </span>
              </div>
            </div>
            
            {question.is_resolved && (
              <Badge className="bg-green-100 text-green-800 border-green-300 flex-shrink-0">
                <CheckCircle size={12} className="mr-1" />
                Resolved
              </Badge>
            )}
          </div>

          {/* Question Content */}
          <div className="mb-3">
            <p className="text-gray-800 text-sm leading-relaxed">
              {cleanQuestionContent(question.content)}
            </p>
          </div>

          {/* Question Images */}
          {question.image_urls && question.image_urls.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {question.image_urls.slice(0, 4).map((imageUrl, index) => (
                <div key={index} className="relative group">
                  <img 
                    src={imageUrl}
                    alt={`Question image ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(imageUrl, '_blank')}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity rounded-lg flex items-center justify-center">
                    <ImageIcon className="text-white opacity-0 group-hover:opacity-70 transition-opacity" size={20} />
                  </div>
                </div>
              ))}
              {question.image_urls.length > 4 && (
                <div className="flex items-center justify-center bg-gray-200 rounded-lg h-24 text-gray-600 text-sm">
                  +{question.image_urls.length - 4} more
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {question.tags && question.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {question.tags.slice(0, 5).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                  <Tag size={10} className="mr-1" />
                  {tag}
                </Badge>
              ))}
              {question.tags.length > 5 && (
                <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600">
                  +{question.tags.length - 5} more
                </Badge>
              )}
            </div>
          )}

          {/* Expand/Collapse Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleExpanded(question.id)}
            className="w-full justify-center"
          >
            {isExpanded ? (
              <>
                <ChevronUp size={16} className="mr-2" />
                Hide Details
              </>
            ) : (
              <>
                <ChevronDown size={16} className="mr-2" />
                View Details & Answers
              </>
            )}
          </Button>

          {/* Expanded Answers Section */}
          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              {answersLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="flex space-x-3">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-1/4 mb-2" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : answers && answers.length > 0 ? (
                <div className="space-y-4">
                  <h5 className="font-medium text-gray-900 mb-3">
                    Answers ({answers.length})
                  </h5>
                  {answers.map((answer) => (
                    <div key={answer.id} className="flex space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        {answer.author_whatsapp_profile_picture_url && (
                          <img
                            src={answer.author_whatsapp_profile_picture_url}
                            alt={`${answer.author_whatsapp_display_name || answer.author_name}'s profile`}
                            className="w-full h-full rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        )}
                        <AvatarFallback className="bg-gradient-to-r from-ocean-teal/20 to-cyan-200 text-gray-700 text-xs">
                          {getInitials(answer.author_whatsapp_display_name || answer.author_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h6 className="font-medium text-gray-900 text-sm">
                            {answer.author_whatsapp_display_name || answer.author_name}
                          </h6>
                          {answer.author_rank && (
                            <Badge variant="outline" className="text-xs bg-white">
                              {formatRank(answer.author_rank)}
                            </Badge>
                          )}
                          {answer.is_best_answer && (
                            <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">
                              <CheckCircle size={12} className="mr-1" />
                              Best Answer
                            </Badge>
                          )}
                          {answer.is_from_whatsapp && (
                            <Badge variant="secondary" className="bg-green-50 text-green-700 text-xs">
                              WhatsApp
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-800 text-sm mb-2">
                          {answer.content}
                        </p>
                        
                        {/* Answer Images */}
                        {answer.image_urls && answer.image_urls.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            {answer.image_urls.slice(0, 4).map((imageUrl, imgIndex) => (
                              <div key={imgIndex} className="relative group">
                                <img 
                                  src={imageUrl}
                                  alt={`Answer image ${imgIndex + 1}`}
                                  className="w-full h-20 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => window.open(imageUrl, '_blank')}
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity rounded-lg flex items-center justify-center">
                                  <ImageIcon className="text-white opacity-0 group-hover:opacity-70 transition-opacity" size={16} />
                                </div>
                              </div>
                            ))}
                            {answer.image_urls.length > 4 && (
                              <div className="flex items-center justify-center bg-gray-200 rounded-lg h-20 text-gray-600 text-xs">
                                +{answer.image_urls.length - 4} more
                              </div>
                            )}
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-500">
                          {formatTimeAgo(answer.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">
                  No answers yet for this question.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b-2 border-orange-400 sticky top-0 z-50">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Title */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                  QuestionBank
                </h1>
                <p className="text-sm text-gray-600">Maritime Q&A Database</p>
              </div>
            </div>

            {/* User Menu */}
            {user && <UserDropdown user={user} />}
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              placeholder="Search maritime questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              data-testid="input-search-questions"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Search Results Info */}
        {debouncedSearch && (
          <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-orange-800">
                <strong>Search results for:</strong> "{debouncedSearch}"
                {status !== 'pending' && (
                  <span className="ml-2 text-orange-600">
                    ({totalQuestions} {totalQuestions === 1 ? 'question' : 'questions'} found)
                  </span>
                )}
              </span>
              {status === 'pending' && (
                <span className="text-sm text-orange-600">Searching...</span>
              )}
            </div>
          </div>
        )}

        {/* Stats Card */}
        <Card className="border-2 border-orange-200 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-gray-800">
              <MessageCircle size={20} />
              <span>Maritime Q&A Database</span>
              <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-800">
                {totalQuestions} Questions
              </Badge>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Questions List */}
        <div>
          {status === 'pending' ? (
            // Loading skeletons
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="border-2 border-gray-200 mb-4">
                <CardContent className="p-4">
                  <div className="flex space-x-3 mb-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-1/3 mb-2" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-16 w-full mb-3" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))
          ) : error ? (
            <Card className="border-2 border-red-200">
              <CardContent className="p-8 text-center">
                <div className="text-red-600 mb-2">
                  <MessageCircle size={48} className="mx-auto" />
                </div>
                <h3 className="font-semibold text-red-800 mb-2">Error loading questions</h3>
                <p className="text-red-600 text-sm">{error.message}</p>
              </CardContent>
            </Card>
          ) : allQuestions.length === 0 ? (
            <Card className="border-2 border-gray-200">
              <CardContent className="p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <MessageCircle size={48} className="mx-auto" />
                </div>
                <h3 className="font-semibold text-gray-600 mb-2">
                  {debouncedSearch ? 'No questions found' : 'No questions available'}
                </h3>
                <p className="text-gray-500 text-sm">
                  {debouncedSearch 
                    ? `Try adjusting your search terms for "${debouncedSearch}"` 
                    : 'Questions will appear here once they are added to the database.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {allQuestions.map((question, index) => (
                <QuestionCard 
                  key={question.id} 
                  question={question} 
                  isLast={index === allQuestions.length - 1}
                />
              ))}
              
              {/* Loading more indicator */}
              {isFetchingNextPage && (
                <div className="text-center py-8">
                  <div className="inline-flex items-center space-x-2 text-orange-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                    <span className="text-sm">Loading more questions...</span>
                  </div>
                </div>
              )}
              
              {!hasNextPage && allQuestions.length > 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">
                    You've reached the end of the questions list.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Scroll to Top Button */}
      {showScrollToTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 rounded-full w-12 h-12 p-0 bg-orange-500 hover:bg-orange-600 shadow-lg z-50"
          data-testid="button-scroll-to-top"
        >
          <ArrowUp size={20} />
        </Button>
      )}
    </div>
  );
}