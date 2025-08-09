import React, { useState, useEffect } from 'react';
import { Eye, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState<Set<string>>(new Set());
  const [currentStartIndex, setCurrentStartIndex] = useState(0);
  const { toast } = useToast();

  // Fetch question attachments
  useEffect(() => {
    const fetchAttachments = async () => {
      try {
        const response = await fetch('/api/questions/attachments?limit=18', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          // Filter for image attachments only (all available)
          const imageAttachments = data
            .filter((att: QuestionAttachment) => att.attachmentType === 'image');
          setAttachments(imageAttachments);
        } else {
          console.warn('Failed to fetch attachments from API, no fallback data available');
          setAttachments([]);
        }
      } catch (error) {
        console.error('Error fetching attachments:', error);
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
          }
        ];
        setAttachments(mockAttachments);
      } finally {
        setLoading(false);
      }
    };

    fetchAttachments();
  }, [toast]);

  const handleImageError = (attachmentId: string) => {
    setImageError(prev => new Set([...Array.from(prev), attachmentId]));
  };

  const handleViewQuestion = (questionId: number) => {
    window.open(`/question/${questionId}`, '_blank');
  };

  const scrollNext = () => {
    if (currentStartIndex + 3 < attachments.length) {
      setCurrentStartIndex(prev => prev + 1);
    }
  };

  const scrollPrev = () => {
    if (currentStartIndex > 0) {
      setCurrentStartIndex(prev => prev - 1);
    }
  };

  const canScrollNext = currentStartIndex + 3 < attachments.length;
  const canScrollPrev = currentStartIndex > 0;

  if (loading) {
    return (
      <div className={`bg-gradient-to-r from-orange-50 to-yellow-50 ${className}`}>
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  if (!attachments.length) {
    return null;
  }

  // Show 3 images starting from currentStartIndex
  const displayImages = attachments.slice(currentStartIndex, currentStartIndex + 3);

  return (
    <div className={`bg-gradient-to-r from-orange-50 to-yellow-50 border-t border-orange-200 relative ${className}`}>
      <div className="flex items-stretch justify-center space-x-3 px-4 h-full">
        {displayImages.map((attachment, index) => (
          <div 
            key={attachment.id} 
            className="relative cursor-pointer group flex-1 max-w-[120px]"
            onClick={() => handleViewQuestion(attachment.questionId)}
          >
            {!imageError.has(attachment.id) ? (
              <img
                src={attachment.attachmentUrl}
                alt="Maritime Question"
                className="w-full h-full object-cover rounded-lg border-2 border-white shadow-md group-hover:shadow-lg transition-shadow duration-200"
                onError={() => handleImageError(attachment.id)}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gray-100 border-2 border-white rounded-lg flex items-center justify-center shadow-md">
                <Eye size={20} className="text-gray-400" />
              </div>
            )}
            
            {/* Subtle hover overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity duration-200 rounded-lg"></div>
          </div>
        ))}
      </div>
      
      {/* Left Chevron - Only show if we can scroll back */}
      {canScrollPrev && (
        <Button
          variant="ghost"
          size="sm"
          onClick={scrollPrev}
          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white border-none p-2 h-10 w-10 rounded-full transition-all duration-200"
        >
          <ChevronLeft size={18} />
        </Button>
      )}

      {/* Right Chevron - Only show if there are more images */}
      {canScrollNext && (
        <Button
          variant="ghost"
          size="sm"
          onClick={scrollNext}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white border-none p-2 h-10 w-10 rounded-full transition-all duration-200"
        >
          <ChevronRight size={18} />
        </Button>
      )}
    </div>
  );
}