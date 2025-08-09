import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface QuestionAttachment {
  id: string;
  questionId: number;
  attachmentType: string;
  attachmentUrl: string;
  fileName: string;
  question?: {
    id: number;
    content: string;
    authorId: string;
  };
}

interface ImageCarouselProps {
  className?: string;
}

export default function ImageCarousel({ className = '' }: ImageCarouselProps) {
  const [attachments, setAttachments] = useState<QuestionAttachment[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Fetch question attachments
  useEffect(() => {
    const fetchAttachments = async () => {
      try {
        const response = await fetch('/api/questions/attachments', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          // Filter for image attachments only and limit to 5 most recent
          const imageAttachments = data
            .filter((att: QuestionAttachment) => att.attachmentType === 'image')
            .slice(0, 5);
          setAttachments(imageAttachments);
        } else {
          // Fallback to mock data for demonstration
          const mockAttachments: QuestionAttachment[] = [
            {
              id: '1',
              questionId: 1051,
              attachmentType: 'image',
              attachmentUrl: '/uploads/images-1754477072590-596461721.png',
              fileName: 'trophy.png',
              question: {
                id: 1051,
                content: 'Are you able to see trophy?',
                authorId: '+7203077919'
              }
            },
            {
              id: '2', 
              questionId: 621,
              attachmentType: 'image',
              attachmentUrl: '/uploads/images-1754044161777-506706060.jpg',
              fileName: 'compressor-valves.jpg',
              question: {
                id: 621,
                content: 'What is the material of Main Air Compressor valves?',
                authorId: '+9029010070'
              }
            },
            {
              id: '3',
              questionId: 532,
              attachmentType: 'image', 
              attachmentUrl: '/uploads/images-1753910779704-86035902.jpg',
              fileName: 'feeler-gauge.jpg',
              question: {
                id: 532,
                content: 'What is Feeler Gauge?',
                authorId: '+9810020033'
              }
            },
            {
              id: '4',
              questionId: 531,
              attachmentType: 'image',
              attachmentUrl: '/uploads/images-1753909330525-472961591.jpg', 
              fileName: 'sulzer-valve.jpg',
              question: {
                id: 531,
                content: 'Propulsion // Can you explain how Sulzer Suction and Spill valve work for Fuel Pump?',
                authorId: '+9810020033'
              }
            },
            {
              id: '5',
              questionId: 530,
              attachmentType: 'image',
              attachmentUrl: '/uploads/images-1753909073197-384920075.jpg',
              fileName: 'axial-ring.jpg', 
              question: {
                id: 530,
                content: 'What is importance of AXIAL RING groove clearance?',
                authorId: '+9810020033'
              }
            }
          ];
          setAttachments(mockAttachments);
        }
      } catch (error) {
        console.error('Error fetching attachments:', error);
        toast({
          title: "Connection Error",
          description: "Unable to load question images",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAttachments();
  }, [toast]);

  const nextImage = () => {
    if (attachments.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % attachments.length);
    }
  };

  const prevImage = () => {
    if (attachments.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + attachments.length) % attachments.length);
    }
  };

  const handleImageError = (attachmentId: string) => {
    setImageError(prev => new Set([...Array.from(prev), attachmentId]));
  };

  const handleViewQuestion = (questionId: number) => {
    window.open(`/question/${questionId}`, '_blank');
  };

  if (loading) {
    return (
      <div className={`bg-white border-t border-orange-200 ${className}`}>
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  if (!attachments.length) {
    return null;
  }

  return (
    <div className={`bg-white border-t border-orange-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-orange-50 to-yellow-50">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-semibold text-gray-700">Maritime Q&A Images</span>
        </div>
        <span className="text-xs text-gray-500">
          {currentIndex + 1} of {attachments.length}
        </span>
      </div>

      {/* Carousel */}
      <div className="relative px-4 py-3">
        <div className="flex items-center space-x-3 overflow-hidden">
          {/* Navigation Button - Left */}
          <Button
            variant="outline"
            size="sm"
            onClick={prevImage}
            disabled={attachments.length <= 1}
            className="flex-shrink-0 w-8 h-8 p-0 border-orange-300 hover:bg-orange-50"
          >
            <ChevronLeft size={16} />
          </Button>

          {/* Image Display Area */}
          <div className="flex-1 overflow-hidden">
            <div 
              className="flex transition-transform duration-300 ease-in-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {attachments.map((attachment, index) => (
                <div key={attachment.id} className="w-full flex-shrink-0 px-1">
                  <Card className="border border-orange-200 hover:border-orange-400 transition-colors">
                    <div className="relative">
                      {!imageError.has(attachment.id) ? (
                        <img
                          src={attachment.attachmentUrl}
                          alt={attachment.question?.content.substring(0, 50) + '...' || 'Maritime Question Image'}
                          className="w-full h-24 object-cover rounded-t-lg"
                          onError={() => handleImageError(attachment.id)}
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-24 bg-gray-100 flex items-center justify-center rounded-t-lg">
                          <div className="text-center text-gray-400">
                            <Eye size={20} className="mx-auto mb-1" />
                            <span className="text-xs">Image unavailable</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Overlay with question preview */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 transition-opacity rounded-t-lg flex items-center justify-center">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleViewQuestion(attachment.questionId)}
                          className="opacity-0 hover:opacity-100 transition-opacity bg-white/90 hover:bg-white text-xs px-2 py-1"
                        >
                          <Eye size={12} className="mr-1" />
                          View Q&A
                        </Button>
                      </div>
                    </div>
                    
                    {/* Question preview text */}
                    <div className="p-2">
                      <p className="text-xs text-gray-600 line-clamp-2 leading-tight">
                        {attachment.question?.content || 'Maritime technical question'}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-orange-600 font-medium">
                          Q#{attachment.questionId}
                        </span>
                        <div className="flex items-center space-x-1">
                          {attachment.attachmentType === 'image' && (
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          )}
                          <span className="text-xs text-gray-400">Image</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Button - Right */}
          <Button
            variant="outline"
            size="sm"
            onClick={nextImage}
            disabled={attachments.length <= 1}
            className="flex-shrink-0 w-8 h-8 p-0 border-orange-300 hover:bg-orange-50"
          >
            <ChevronRight size={16} />
          </Button>
        </div>

        {/* Dots indicator */}
        {attachments.length > 1 && (
          <div className="flex items-center justify-center space-x-1 mt-2">
            {attachments.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  index === currentIndex 
                    ? 'bg-orange-500' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}