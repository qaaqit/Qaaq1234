import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageCircle, Search, Calendar, Eye, CheckCircle, Clock, Hash, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { isTokenValid, forceTokenRefresh } from '@/utils/auth';
import { AuthFix } from './auth-fix';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [showOnlyWithImages, setShowOnlyWithImages] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);
  const lastQuestionRef = useRef<HTMLDivElement | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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
    queryKey: ['/api/questions', debouncedSearch, showOnlyWithImages],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        limit: '20',
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(showOnlyWithImages && { withImages: 'true' })
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
      enabled
    });
  };

  const allQuestions = data?.pages.flatMap(page => page.questions) || [];
  const totalQuestions = data?.pages[0]?.total || 0;
  
  // Since filtering is now done server-side, we don't need client-side filtering
  const filteredQuestions = allQuestions;
  
  // Check if auth tokens are working
  const [needsAuthFix, setNeedsAuthFix] = useState(false);
  
  useEffect(() => {
    if (error && error.message.includes('403')) {
      console.log('🚨 403 Authentication error detected, showing auth fix');
      setNeedsAuthFix(true);
    }
  }, [error]);
  
  // Log questions with images for debugging
  useEffect(() => {
    if (allQuestions.length > 0) {
      const questionsWithImages = allQuestions.filter(q => q.image_urls && q.image_urls.length > 0);
      console.log(`Found ${questionsWithImages.length} questions with images out of ${allQuestions.length} total questions`);
      if (showOnlyWithImages) {
        console.log('Image filter is active - showing only questions with images');
      }
    }
  }, [allQuestions, showOnlyWithImages]);

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

  // Question with Answer Previews Component  
  const QuestionWithAnswers = ({ question, index }: { question: Question; index: number }) => {
    const { data: answers, isLoading: answersLoading } = useQuestionAnswers(question.id, true);

    // Get the best bot answer (from WhatsApp or first answer)
    const botAnswer = answers?.find(answer => answer.is_from_whatsapp) || answers?.[0];

    return (
      <div
        key={question.id}
        ref={index === allQuestions.length - 1 ? lastQuestionCallback : null}
      >
        <Card className="border-2 border-gray-200 hover:border-ocean-teal/40 transition-colors">
          <CardContent className="p-4">
            {/* Question Content */}
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
                  <h4 className="font-semibold text-gray-900 text-base">
                    <span className="text-orange-600 mr-2 font-bold">#{question.id}</span>
                    {question.author_name}
                  </h4>
                  {question.author_rank && (
                    <p className="text-sm text-gray-700 font-medium">{formatRank(question.author_rank)}</p>
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

            <p className="text-gray-800 mb-3 line-clamp-3 text-base font-medium leading-relaxed">
              {question.content || 'Question content not available'}
            </p>

            {/* Question Images */}
            {question.image_urls && question.image_urls.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                {question.image_urls.slice(0, 4).map((imageUrl, imgIndex) => (
                  <div key={imgIndex} className="relative group">
                    <img 
                      src={imageUrl}
                      alt={`Question image ${imgIndex + 1}`}
                      className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(imageUrl, '_blank')}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity rounded-lg flex items-center justify-center">
                      <ImageIcon className="text-white opacity-0 group-hover:opacity-70 transition-opacity" size={24} />
                    </div>
                  </div>
                ))}
                {question.image_urls.length > 4 && (
                  <div className="flex items-center justify-center bg-gray-200 rounded-lg h-32 text-gray-600">
                    +{question.image_urls.length - 4} more
                  </div>
                )}
              </div>
            )}

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

            {/* Bot Answer Preview */}
            {botAnswer && (
              <div className="bg-orange-50 border-l-4 border-orange-400 p-3 mb-3 rounded-r-lg">
                <div className="flex items-start space-x-2 mb-2">
                  <Avatar className="w-6 h-6">
                    {(botAnswer.author_whatsapp_profile_picture_url || botAnswer.author_profile_picture_url) && (
                      <img 
                        src={(botAnswer.author_whatsapp_profile_picture_url || botAnswer.author_profile_picture_url) as string} 
                        alt={`${botAnswer.author_whatsapp_display_name || botAnswer.author_name}'s profile`}
                        className="w-full h-full rounded-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    )}
                    <AvatarFallback className="bg-orange-500 text-white text-xs">
                      {getInitials(botAnswer.author_whatsapp_display_name || botAnswer.author_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h6 className="font-semibold text-orange-900 text-sm">
                        {botAnswer.author_whatsapp_display_name || botAnswer.author_name}
                      </h6>
                      {botAnswer.is_from_whatsapp && (
                        <Badge variant="secondary" className="bg-green-50 text-green-700 text-xs">
                          QBOT
                        </Badge>
                      )}
                    </div>
                    <p className="text-orange-800 text-sm mt-1 font-medium leading-relaxed">
                      {truncateToWords(botAnswer.content, 40)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Stats and Actions */}
            <div className="flex items-center justify-between text-sm text-gray-700 mb-3 font-medium">
              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-1">
                  <Eye size={16} className="text-orange-600" />
                  <span>{question.views || 0} views</span>
                </span>
                <span className="flex items-center space-x-1">
                  <MessageCircle size={16} className="text-orange-600" />
                  <span>{question.answer_count || 0} answers</span>
                </span>
                {question.category_name && (
                  <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 border-orange-300">
                    {question.category_name}
                  </Badge>
                )}
              </div>
              <span className="flex items-center space-x-1">
                <Calendar size={16} className="text-orange-600" />
                <span>{format(new Date(question.created_at), 'MMM d, yyyy')}</span>
              </span>
            </div>

            {/* View Full Question Link */}
            <div className="pt-3 border-t border-orange-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `/share/question/${question.id}`;
                }}
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 font-medium"
              >
                View Full Question & All Answers
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search and Header */}
      {/* Minimalistic Search Questions Bar */}
      <div className="flex items-center space-x-2 mb-6">
        <div className="flex-1 relative">
          <Input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-12 border-ocean-teal/30 focus:border-ocean-teal"
          />
        </div>
        <Button 
          size="sm"
          variant="outline"
          className="px-3 border-ocean-teal/30 hover:bg-ocean-teal hover:text-white"
          onClick={() => {
            // Search activation logic if needed
          }}
        >
          <Search size={16} />
        </Button>
      </div>

      <Card className="border-2 border-ocean-teal/20">
        <CardHeader>
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2 text-navy">
                <MessageCircle size={20} />
                <span>Maritime Q&A</span>
                <Badge variant="secondary" className="ml-2">
                  {showOnlyWithImages ? filteredQuestions.length : totalQuestions} Questions
                </Badge>
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="imageFilter"
                  checked={showOnlyWithImages}
                  onCheckedChange={(checked) => setShowOnlyWithImages(checked as boolean)}
                  className="border-ocean-teal/50 data-[state=checked]:bg-ocean-teal data-[state=checked]:border-ocean-teal"
                />
                <label 
                  htmlFor="imageFilter" 
                  className="text-sm font-medium text-gray-700 cursor-pointer flex items-center space-x-1"
                >
                  <ImageIcon size={16} className="text-ocean-teal" />
                  <span>Show only with pictures</span>
                </label>
              </div>
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
        ) : filteredQuestions.length === 0 ? (
          <Card className="border-2 border-gray-200">
            <CardContent className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <MessageCircle size={32} className="text-gray-400" />
              </div>
              <p className="text-gray-600">
                {showOnlyWithImages 
                  ? 'No questions with pictures found.' 
                  : debouncedSearch 
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
            <p>You've reached the end of {showOnlyWithImages ? `${filteredQuestions.length} questions with pictures` : `${totalQuestions} questions`}</p>
          </div>
        )}
      </div>
    </div>
  );
}