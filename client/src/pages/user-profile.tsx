import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Ship, Building, Phone, Calendar, CheckCircle, Clock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Question {
  id: string;
  question: string;
  category: string;
  askedDate: string;
  answerCount: number;
  isResolved: boolean;
}

interface UserProfile {
  user: {
    id: string;
    fullName: string;
    rank: string;
    shipName: string;
    company: string;
    port: string;
    city: string;
    country: string;
    questionCount: number;
    answerCount: number;
    whatsappNumber: string;
  };
  questions: Question[];
  dataSource?: string;
}

export default function UserProfile() {
  const { userId } = useParams();
  const [, navigate] = useLocation();

  const { data: profile, isLoading, error } = useQuery<UserProfile>({
    queryKey: ['/api/users', userId, 'profile'],
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="bg-white rounded-lg p-6 mb-6">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dm')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to DM
          </Button>
          <div className="bg-white rounded-lg p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">User Not Found</h2>
            <p className="text-gray-600">The requested user profile could not be loaded.</p>
          </div>
        </div>
      </div>
    );
  }

  const { user, questions, dataSource } = profile;
  const isUsingRealQAAQData = dataSource === 'notion';

  const getCategoryColor = (category: string) => {
    const colors = {
      'Navigation': 'bg-blue-100 text-blue-800',
      'Engine': 'bg-orange-100 text-orange-800',
      'Safety': 'bg-red-100 text-red-800',
      'Cargo': 'bg-green-100 text-green-800',
      'Port Operations': 'bg-purple-100 text-purple-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto p-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dm')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to DM
          </Button>
          
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-navy-600 text-white text-lg">
                {user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{user.fullName}</h1>
                <Badge variant="outline" className="bg-navy-50 text-navy-700 border-navy-200">
                  {user.rank}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                {user.shipName && (
                  <div className="flex items-center gap-2">
                    <Ship className="w-4 h-4" />
                    <span>{user.shipName}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  <span>{user.company}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{user.city}, {user.country}</span>
                </div>
                
                {user.whatsappNumber && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{user.whatsappNumber}</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-6 mt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-navy-600">{user.questionCount}</div>
                  <div className="text-xs text-gray-500">Questions Asked</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-teal-600">{user.answerCount}</div>
                  <div className="text-xs text-gray-500">Answers Given</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Questions Section */}
      <div className="max-w-4xl mx-auto p-4">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold">Questions Asked ({questions.length})</h2>
            {isUsingRealQAAQData && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                ✓ Real QAAQ Data
              </Badge>
            )}
          </div>
          <p className="text-gray-600">Maritime expertise questions from this professional</p>
        </div>

        {user.questionCount === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Questions Yet</h3>
              <p className="text-gray-600">This professional hasn't asked any questions yet.</p>
            </CardContent>
          </Card>
        ) : questions.length === 0 && user.questionCount > 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageCircle className="w-12 h-12 mx-auto text-navy-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {user.questionCount} Questions Asked
              </h3>
              <p className="text-gray-600 mb-4">
                This maritime professional has asked {user.questionCount} questions in the QAAQ system.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                <p className="text-blue-800">
                  <strong>Note:</strong> Question content is stored in the main QAAQ system and not currently accessible through this interface. 
                  We can only display the verified question count from QAAQ metrics.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {questions.map((question) => (
              <Card key={question.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg leading-tight mb-2">
                        {question.question}
                      </CardTitle>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <Badge className={getCategoryColor(question.category)}>
                          {question.category}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(question.askedDate)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {question.isResolved ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-yellow-500" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        <span>{question.answerCount} answers</span>
                      </div>
                      <span>•</span>
                      <span className={question.isResolved ? 'text-green-600' : 'text-yellow-600'}>
                        {question.isResolved ? 'Resolved' : 'Open'}
                      </span>
                    </div>
                    
                    <Button variant="outline" size="sm">
                      View Discussion
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}