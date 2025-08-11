import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageCircle, Search, Calendar, CheckCircle, Clock, Hash, ChevronDown, ChevronUp, Image as ImageIcon, Share2, ArrowUp, Trash2, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { isTokenValid, forceTokenRefresh } from '@/utils/auth';
import { AuthFix } from './auth-fix';
import { useAuth } from '@/hooks/useAuth';

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
  image_urls?: string[];
  is_from_whatsapp?: boolean;
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
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const { user } = useAuth();
  
  // Check if user is admin - based on specific user ID and phone number
  const isAdmin = user?.isAdmin || 
                  user?.fullName === '+919029010070' || 
                  user?.id === '44885683' ||
                  user?.id === '+919029010070' ||
                  user?.id === '5791e66f-9cc1-4be4-bd4b-7fc1bd2e258e';

  const observer = useRef<IntersectionObserver | null>(null);
  const lastQuestionRef = useRef<HTMLDivElement | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle scroll to show/hide scroll-to-top button and preserve position
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

  // This will be moved after allQuestions is defined

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // No authentication required for questions tab

  // Fetch questions with infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    error
  } = useInfiniteQuery({
    queryKey: ['/api/questions', debouncedSearch || ''],
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
      rootMargin: '100px'
    });
    
    if (node) observer.current.observe(node);
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

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

  // Clean question content by removing QBOT breadcrumbs and extracting actual question
  const cleanQuestionContent = (content: string): string => {
    if (!content) return 'Question content not available';
    
    // Remove QBOT breadcrumbs pattern: [QBOT Q&A - System > Equipment > Make > Model]
    const breadcrumbPattern = /^\[QBOT Q&A[^\]]*\]\s*/;
    let cleanContent = content.replace(breadcrumbPattern, '');
    
    // Remove "User: Name (via Q..." pattern at the beginning
    const userPattern = /^User:\s*[^(]*\(via Q[^)]*\)\s*/;
    cleanContent = cleanContent.replace(userPattern, '');
    
    // Remove any extra whitespace and newlines at the beginning
    cleanContent = cleanContent.replace(/^\s+/, '');
    
    // If content is empty after cleaning, return the original
    if (!cleanContent.trim()) {
      return content;
    }
    
    return cleanContent.trim();
  };

  const toggleExpanded = (questionId: number) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  // Fetch answers for a specific question - optimized with caching
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

  const allQuestions = useMemo(() => 
    data?.pages.flatMap(page => page.questions) || [], 
    [data]
  );
  const totalQuestions = data?.pages[0]?.total || 0;
  
  // Since filtering is now done server-side, we don't need client-side filtering
  const filteredQuestions = allQuestions;

  // Preserve scroll position during re-renders - optimized to prevent excessive scrolling
  useEffect(() => {
    if (scrollPosition > 0 && !isFetchingNextPage && allQuestions.length > 0) {
      const timer = setTimeout(() => {
        if (Math.abs(window.pageYOffset - scrollPosition) > 50) {
          window.scrollTo(0, scrollPosition);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [allQuestions.length]);
  
  // Check if auth tokens are working
  const [needsAuthFix, setNeedsAuthFix] = useState(false);
  
  useEffect(() => {
    if (error && error.message.includes('403')) {
      console.log('🚨 403 Authentication error detected, showing auth fix');
      setNeedsAuthFix(true);
    }
  }, [error]);
  


  // Answer Card Component
  const AnswerCard = ({ answer }: { answer: Answer }) => (
    <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-ocean-teal/30">
      <div className="flex items-start space-x-3 mb-3">
        <Avatar className="w-8 h-8 border border-ocean-teal/30">
          {(answer.author_whatsapp_profile_picture_url || answer.author_profile_picture_url) && (
            <img 
              src={(answer.author_whatsapp_profile_picture_url || answer.author_profile_picture_url) as string} 
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
            <h5 className="font-medium text-gray-900 text-sm">
              {answer.author_whatsapp_display_name || answer.author_name}
            </h5>
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
                    className="w-full h-24 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(imageUrl, '_blank')}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity rounded-lg flex items-center justify-center">
                    <ImageIcon className="text-white opacity-0 group-hover:opacity-70 transition-opacity" size={20} />
                  </div>
                </div>
              ))}
              {answer.image_urls.length > 4 && (
                <div className="flex items-center justify-center bg-gray-200 rounded-lg h-24 text-gray-600 text-sm">
                  +{answer.image_urls.length - 4} more
                </div>
              )}
            </div>
          )}
          
          <span className="text-xs text-gray-500">
            {format(new Date(answer.created_at), 'MMM d, yyyy • h:mm a')}
          </span>
        </div>
      </div>
    </div>
  );

  // Helper function to truncate text to word count
  const truncateToWords = (text: string, wordCount: number): string => {
    const words = text.split(' ');
    if (words.length <= wordCount) {
      return text;
    }
    return words.slice(0, wordCount).join(' ') + '...';
  };

  // Share function for questions
  const handleShare = async (question: Question) => {
    const shareUrl = `${window.location.origin}/questions/${question.id}`;
    const shareText = `Check out this maritime question: ${truncateToWords(question.content, 15)}\n\n`;
    
    const shareData = {
      title: `Question #${question.id} - QaaqConnect`,
      text: shareText,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing:', err);
        fallbackShare(shareUrl);
      }
    } else {
      fallbackShare(shareUrl);
    }
  };

  const fallbackShare = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      // Simple success indication without toast
      const button = document.activeElement as HTMLElement;
      if (button) {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      }
    }).catch(() => {
      // If clipboard fails, try to open WhatsApp
      const text = encodeURIComponent(`Check out this maritime question: ${url}`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    });
  };

  // Admin-only toggle question visibility function
  const handleToggleQuestion = async (questionId: number, currentlyHidden: boolean = false) => {
    if (!isAdmin) {
      console.warn('Unauthorized: Only admins can toggle questions');
      return;
    }

    const action = currentlyHidden ? 'restore' : 'hide';
    
    try {
      const response = await fetch(`/api/questions/${questionId}/hide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('qaaq_token')}`
        },
        body: JSON.stringify({ 
          hidden: !currentlyHidden, 
          hidden_reason: currentlyHidden ? 'Admin restore' : 'Admin removal from QuestionBank' 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${action} question`);
      }

      const result = await response.json();
      console.log(`Question ${action}d successfully:`, result);
      
      // Refresh questions list
      window.location.reload();
    } catch (error) {
      console.error(`Error ${action}ing question:`, error);
      alert(`Failed to ${action} question. Please try again.`);
    }
  };

  // Question with Answer Previews Component  
  const QuestionWithAnswers = ({ question, index }: { question: Question; index: number }) => {
    const { data: answers, isLoading: answersLoading } = useQuestionAnswers(question.id, true);

    // Get the first answer (bot/assistant answer)
    const firstAnswer = answers?.[0];

    return (
      <div
        key={question.id}
        ref={index === allQuestions.length - 1 ? lastQuestionCallback : null}
      >
        <Card className="border-0 border-b border-gray-200 hover:border-gray-300 transition-colors cursor-pointer bg-white rounded-none" onClick={() => navigate(`/questions/${question.id}`)}>
          <CardContent className="p-6">
            {/* Question Header with ID and Title */}
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex-1 pr-4">
                <span className="text-orange-600 font-bold">#{question.id}</span>{' '}
                {cleanQuestionContent(question.content)}
              </h3>
              <div className="flex flex-col gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare(question);
                  }}
                  className="text-gray-400 hover:text-orange-600 hover:bg-orange-50 p-2"
                  title="Share this question"
                >
                  <Share2 size={16} />
                </Button>
                {/* Admin Only Toggle Button */}
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleQuestion(question.id, question.is_hidden || false);
                    }}
                    className={`p-2 ${
                      question.is_hidden 
                        ? "text-gray-400 hover:text-green-600 hover:bg-green-50" 
                        : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                    }`}
                    title={question.is_hidden ? "Admin: Restore question to QuestionBank" : "Admin: Hide question from QuestionBank"}
                  >
                    {question.is_hidden ? <RotateCcw size={16} /> : <Trash2 size={16} />}
                  </Button>
                )}
              </div>
            </div>

            {/* Answer Section with Orange Background - Updated */}
            {firstAnswer && (
              <div className="border-l-4 border-orange-500 bg-orange-50 p-4 rounded-r-lg mb-3">
                <div className="text-gray-800 text-sm leading-relaxed">
                  <span className="font-bold text-orange-600 text-base">Ans: </span>
                  <span className="text-gray-700">
                    {firstAnswer.content.split(' ').length > 20 
                      ? `${firstAnswer.content.split(' ').slice(0, 20).join(' ')}...`
                      : firstAnswer.content
                    }
                  </span>
                </div>
              </div>
            )}

            {/* User Attribution at Bottom - Updated */}
            <div className="flex items-center justify-between text-xs text-gray-500 mt-3 pt-2 border-t border-gray-100">
              <div className="flex items-center">
                <span className="font-medium text-gray-600">
                  - {question.author_whatsapp_display_name || question.author_name}
                </span>
                <span className="mx-2 text-gray-400">•</span>
                <span className="text-gray-500">
                  {format(new Date(question.created_at), 'dd MMM yyyy')}
                </span>
              </div>
            </div>






          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div>
      {/* Enhanced Search Bar */}
      <div className="flex items-center space-x-2 px-4 py-4 bg-gray-50">
        <div className="flex-1 relative">
          <Input
            type="text"
            placeholder="Search Purifier or Anode or any keyword"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-12 border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {status === 'pending' && debouncedSearch ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
            ) : (
              <Search size={16} className="text-gray-400" />
            )}
          </div>
        </div>
        {searchQuery && (
          <Button 
            size="sm"
            variant="outline"
            className="px-3 border-orange-300 hover:bg-orange-500 hover:text-white text-orange-600"
            onClick={() => setSearchQuery('')}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Search Results Header */}
      {debouncedSearch && (
        <div className="mx-4 mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
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
          </div>
        </CardHeader>
      </Card>

      {/* Questions List */}
      <div>
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
        ) : filteredQuestions.length === 0 ? (
          <Card className="border-2 border-gray-200">
            <CardContent className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <MessageCircle size={32} className="text-gray-400" />
              </div>
              <p className="text-gray-600">
                {debouncedSearch 
                  ? 'No questions found matching your search.' 
                  : 'No questions available yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredQuestions.map((question, index) => (
            <QuestionWithAnswers key={question.id} question={question} index={index} />
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
        {!hasNextPage && filteredQuestions.length > 0 && (
          <div className="text-center p-4 text-gray-600">
            <p>You've reached the end of {totalQuestions} questions</p>
          </div>
        )}
      </div>

      {/* Scroll to Top Button */}
      {showScrollToTop && (
        <Button
          onClick={scrollToTop}
          className="fixed top-4 right-4 z-50 w-12 h-12 rounded-full bg-orange-600 hover:bg-orange-700 text-white shadow-lg transition-all duration-300 ease-in-out transform hover:scale-110"
          size="icon"
        >
          <ArrowUp size={20} />
        </Button>
      )}
    </div>
  );
}