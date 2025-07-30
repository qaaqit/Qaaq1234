import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, MessageCircle, Calendar, CheckCircle, Clock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";

interface Question {
  id: string;
  questionId: string;
  userId: string;
  userName: string;
  questionText: string;
  questionCategory?: string;
  askedDate: string;
  source: 'whatsapp' | 'web' | 'api';
  answerCount: number;
  isResolved: boolean;
  urgency: 'low' | 'normal' | 'high';
  tags: string[];
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export default function MyQuestions() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const { data: questionsData, isLoading, error } = useQuery({
    queryKey: ['/api/users', user?.id, 'profile'],
    enabled: !!user?.id
  });

  const userQuestions = questionsData?.questions || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryColor = (category?: string) => {
    if (!category) return 'bg-gray-100 text-gray-800';
    
    const colors = {
      'Navigation': 'bg-blue-100 text-blue-800',
      'Engine': 'bg-red-100 text-red-800',
      'Safety': 'bg-yellow-100 text-yellow-800',
      'Cargo': 'bg-green-100 text-green-800',
      'Port': 'bg-purple-100 text-purple-800',
      'Documentation': 'bg-indigo-100 text-indigo-800'
    };

    for (const [key, color] of Object.entries(colors)) {
      if (category.toLowerCase().includes(key.toLowerCase())) {
        return color;
      }
    }
    return 'bg-gray-100 text-gray-800';
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'whatsapp':
        return '💬';
      case 'web':
        return '🌐';
      case 'api':
        return '⚡';
      default:
        return '❓';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'normal':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Filter questions by status
  const allQuestions = userQuestions;
  const resolvedQuestions = userQuestions.filter((q: Question) => q.isResolved);
  const unresolvedQuestions = userQuestions.filter((q: Question) => !q.isResolved);
  const recentQuestions = userQuestions.filter((q: Question) => {
    const daysDiff = (Date.now() - new Date(q.askedDate).getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
  });

  function QuestionsList({ questions, title }: { questions: Question[], title: string }) {
    if (questions.length === 0) {
      return (
        <div className="text-center py-12">
          <MessageCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Questions Found</h3>
          <p className="text-gray-600 mb-4">You haven't asked any questions in this category yet.</p>
          <Button onClick={() => navigate('/ask-question')}>
            Ask Your First Question
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>
        
        {questions.map((question) => (
          <Card key={question.questionId} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-lg leading-tight mb-3">
                    {question.questionText}
                  </CardTitle>
                  
                  <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(question.askedDate)} at {formatTime(question.askedDate)}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <span>{getSourceIcon(question.source)}</span>
                      <span className="capitalize">{question.source}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {question.questionCategory && (
                      <Badge className={getCategoryColor(question.questionCategory)}>
                        {question.questionCategory}
                      </Badge>
                    )}
                    
                    <Badge variant="outline" className={getUrgencyColor(question.urgency)}>
                      {question.urgency.charAt(0).toUpperCase() + question.urgency.slice(1)} Priority
                    </Badge>

                    {question.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    {question.isResolved ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    <span>{question.answerCount} {question.answerCount === 1 ? 'Answer' : 'Answers'}</span>
                  </div>
                  
                  {question.location && (
                    <div className="flex items-center gap-1">
                      <span>📍 {question.location}</span>
                    </div>
                  )}
                </div>

                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-1" />
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-lg p-6">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dm')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="bg-white rounded-lg p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Error Loading Questions</h2>
            <p className="text-gray-600">Unable to load your questions. Please try again.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/dm')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Questions</h1>
                <p className="text-gray-600">Maritime expertise questions you've asked</p>
              </div>
            </div>
            <Button onClick={() => navigate('/ask-question')} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Ask Question
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-4">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="all">All ({allQuestions.length})</TabsTrigger>
            <TabsTrigger value="recent">Recent ({recentQuestions.length})</TabsTrigger>
            <TabsTrigger value="unresolved">Unresolved ({unresolvedQuestions.length})</TabsTrigger>
            <TabsTrigger value="resolved">Resolved ({resolvedQuestions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <QuestionsList questions={allQuestions} title="All Questions" />
          </TabsContent>

          <TabsContent value="recent">
            <QuestionsList questions={recentQuestions} title="Recent Questions (Last 7 Days)" />
          </TabsContent>

          <TabsContent value="unresolved">
            <QuestionsList questions={unresolvedQuestions} title="Unresolved Questions" />
          </TabsContent>

          <TabsContent value="resolved">
            <QuestionsList questions={resolvedQuestions} title="Resolved Questions" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}