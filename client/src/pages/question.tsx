import { useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle, MessageCircle, Eye, Clock, Hash, User, Share2, TrendingUp } from 'lucide-react';

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

export default function QuestionPage() {
  const params = useParams();
  const questionId = params.id;
  const { toast } = useToast();

  const { data: question, status } = useQuery<Question>({
    queryKey: [`/api/questions/${questionId}`],
    enabled: !!questionId,
  });

  const { data: answers = [] } = useQuery<Answer[]>({
    queryKey: [`/api/questions/${questionId}/answers`],
    enabled: !!questionId,
  });

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

      {/* Answers Section */}
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle size={20} />
            <span>Answers ({answers.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {answers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No answers yet. Be the first to answer!
            </p>
          ) : (
            <div className="space-y-4">
              {answers.map((answer: Answer) => (
                <div key={answer.id} className="border-b border-gray-200 pb-4 last:border-0">
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}