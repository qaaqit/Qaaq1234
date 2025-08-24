import { useParams, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle, MessageCircle, Eye, Clock, Hash, User, Share2, TrendingUp, Heart, Send } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface Question {
  id: number;
  content: string;
  author_id: string;
  author_name: string;
  author_rank?: string;
  created_at: string;
  updated_at: string;
  category?: string;
  tags?: string[];
  view_count: number;
  answer_count: number;
  is_resolved: boolean;
  is_anonymous: boolean;
  is_from_whatsapp: boolean;
  source?: string;
}

interface Answer {
  id: number;
  content: string;
  author_id: string;
  author_name: string;
  author_rank?: string;
  created_at: string;
  is_best_answer: boolean;
}

interface UserAnswer {
  id: string;
  questionId: number;
  userId: string;
  content: string;
  likesCount: number;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  authorRank?: string;
}

export default function QuestionPage() {
  const params = useParams();
  const questionId = params.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newAnswerContent, setNewAnswerContent] = useState('');

  const { data: question, status } = useQuery<Question>({
    queryKey: [`/api/questions/${questionId}`],
    enabled: !!questionId,
  });

  const { data: answers = [] } = useQuery<Answer[]>({
    queryKey: [`/api/questions/${questionId}/answers`],
    enabled: !!questionId,
  });

  const { data: userAnswers = [] } = useQuery<UserAnswer[]>({
    queryKey: [`/api/questions/${questionId}/user-answers`],
    enabled: !!questionId,
  });

  // Mutation for submitting new answer
  const submitAnswerMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest(`/api/questions/${questionId}/user-answers`, 'POST', { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/questions/${questionId}/user-answers`] });
      setNewAnswerContent('');
      toast({ title: "Success", description: "Your answer has been submitted!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to submit answer",
        variant: "destructive"
      });
    },
  });

  // Mutation for liking answers
  const toggleLikeMutation = useMutation({
    mutationFn: async (answerId: string) => {
      return apiRequest(`/api/user-answers/${answerId}/like`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/questions/${questionId}/user-answers`] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update like",
        variant: "destructive"
      });
    },
  });

  // Debug logging for API responses  
  useEffect(() => {
    if (question) {
      console.log('🔍 Question API Response:', {
        id: question.id,
        author_id: question.author_id,
        author_name: question.author_name,
        content: question.content?.slice(0, 100)
      });
    }
  }, [question]);

  useEffect(() => {
    if (answers.length > 0) {
      console.log('🔍 Answers API Response:', answers.map(answer => ({
        id: answer.id,
        author_id: answer.author_id,
        author_name: answer.author_name,
        content: answer.content?.slice(0, 50)
      })));
    }
  }, [answers]);

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnswerContent.trim()) {
      toast({ 
        title: "Error", 
        description: "Please enter an answer",
        variant: "destructive"
      });
      return;
    }
    submitAnswerMutation.mutate(newAnswerContent);
  };

  const handleLikeAnswer = (answerId: string) => {
    toggleLikeMutation.mutate(answerId);
  };

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

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString();
  };

  const handleShare = async () => {
    if (!question) return;
    
    const shareData = {
      title: `Question #${question.id} - QaaqConnect`,
      text: question.content.slice(0, 100) + (question.content.length > 100 ? '...' : ''),
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing:', err);
        fallbackShare();
      }
    } else {
      fallbackShare();
    }
  };

  const fallbackShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast({
        title: "Link Copied!",
        description: "Question link has been copied to clipboard.",
      });
    }).catch(() => {
      toast({
        title: "Share Failed",
        description: "Unable to copy link. Please copy manually from address bar.",
        variant: "destructive",
      });
    });
  };

  const formatViewCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  if (status === 'pending') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="mb-6">
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error' || !question) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="border-2 border-red-200">
          <CardContent className="p-8 text-center">
            <p className="text-red-600">Question not found</p>
            <Link href="/dm" className="text-blue-600 hover:underline mt-2 inline-block">
              Back to Questions
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Navigation */}
      <Link href="/dm" className="inline-flex items-center text-blue-600 hover:underline mb-6">
        <ArrowLeft size={20} className="mr-2" />
        Back to Questions
      </Link>

      {/* Question Card */}
      <Card className="mb-6 border-2 border-ocean-teal/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <Avatar className="w-12 h-12 border-2 border-ocean-teal">
                <AvatarFallback className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-r from-ocean-teal to-cyan-600 font-bold text-[#3179f2]">
                  {getInitials(question.author_name || 'Anonymous')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold text-navy">
                    Question #{question.id}
                  </h2>
                  {question.is_resolved && (
                    <Badge className="bg-green-100 text-green-800 border-green-300">
                      <CheckCircle size={14} className="mr-1" />
                      Resolved
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                  <Link 
                    href={`/user/${question.author_id}`} 
                    className="flex items-center hover:text-blue-600 hover:underline cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <User size={14} className="mr-1" />
                    {question.author_name}
                  </Link>
                  {question.author_rank && (
                    <span>{formatRank(question.author_rank)}</span>
                  )}
                  <span className="flex items-center">
                    <Clock size={14} className="mr-1" />
                    {formatDate(question.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-900 text-lg mb-4 whitespace-pre-wrap">{question.content}</p>
          
          {/* Tags */}
          {question.tags && question.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {question.tags.map((tag, i) => (
                <Badge key={i} variant="outline" className="text-sm">
                  <Hash size={14} className="mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Stats and Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <span className="flex items-center">
                <Eye size={16} className="mr-1" />
                {formatViewCount(question.view_count)} views
              </span>
              <span className="flex items-center">
                <MessageCircle size={16} className="mr-1" />
                {question.answer_count} answers
              </span>
              {question.view_count > 100 && (
                <span className="flex items-center text-orange-600">
                  <TrendingUp size={16} className="mr-1" />
                  Trending
                </span>
              )}
              {question.is_from_whatsapp && (
                <Badge variant="secondary" className="bg-green-50 text-green-700">
                  WhatsApp
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="flex items-center space-x-2 text-gray-600 hover:text-blue-600"
            >
              <Share2 size={16} />
              <span>Share</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bot Answers Section */}
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle size={20} />
            <span>AI Bot Answers ({answers.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {answers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No bot answers available.
            </p>
          ) : (
            <div className="space-y-4">
              {answers.map((answer: Answer) => (
                <div key={answer.id} className="border-b border-gray-200 pb-4 last:border-0">
                  {(answer.author_name === 'QG' || answer.author_name === 'QAAQ GPT' || answer.author_name === 'QBOT' || answer.author_id === 'bot_qaaq_001') ? (
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-gray-700 whitespace-pre-wrap">
                          <span className="font-medium text-gray-900">QBOT: </span>{answer.content}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          AI Bot Response • {formatDate(answer.created_at)}
                        </p>
                      </div>
                      {answer.is_best_answer && (
                        <Badge className="bg-green-100 text-green-800 ml-2">
                          Best Answer
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-start space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-gray-200 text-gray-700">
                          {getInitials(answer.author_name || 'Anonymous')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-gray-900">{answer.author_name}</h4>
                            <p className="text-sm text-gray-600">
                              {formatRank(answer.author_rank)} • {formatDate(answer.created_at)}
                            </p>
                          </div>
                          {answer.is_best_answer && (
                            <Badge className="bg-green-100 text-green-800">
                              Best Answer
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{answer.content}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Community Answers Section */}
      <Card className="border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User size={20} />
            <span>Community Answers ({userAnswers.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userAnswers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No community answers yet. Be the first to help improve the bot's answer!
            </p>
          ) : (
            <div className="space-y-4">
              {userAnswers.map((answer: UserAnswer) => (
                <div key={answer.id} className="border-b border-gray-200 pb-4 last:border-0">
                  <div className="flex items-start space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {getInitials(answer.authorName || 'Anonymous')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">{answer.authorName}</h4>
                          <p className="text-sm text-gray-600">
                            {formatRank(answer.authorRank)} • {formatDate(answer.createdAt)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLikeAnswer(answer.id)}
                          disabled={toggleLikeMutation.isPending}
                          className="flex items-center space-x-1 text-red-500 hover:text-red-600"
                          data-testid={`button-like-answer-${answer.id}`}
                        >
                          <Heart size={16} className={answer.likesCount > 0 ? "fill-current" : ""} />
                          <span data-testid={`text-likes-count-${answer.id}`}>{answer.likesCount}</span>
                        </Button>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap" data-testid={`text-answer-content-${answer.id}`}>{answer.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Answer Form */}
      <Card className="border-2 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Send size={20} />
            <span>Share Your Knowledge</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitAnswer} className="space-y-4">
            <Textarea
              placeholder="Help improve the bot's answer by sharing your expertise..."
              value={newAnswerContent}
              onChange={(e) => setNewAnswerContent(e.target.value)}
              rows={4}
              className="resize-none"
              data-testid="textarea-new-answer"
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={submitAnswerMutation.isPending || !newAnswerContent.trim()}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-submit-answer"
              >
                {submitAnswerMutation.isPending ? 'Submitting...' : 'Submit Answer'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}