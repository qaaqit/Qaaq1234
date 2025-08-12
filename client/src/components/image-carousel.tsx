import React, { useState, useEffect } from 'react';
import { Eye, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';


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

  // Fetch question attachments
  useEffect(() => {
    const fetchAttachments = async () => {
      try {
        const response = await fetch('/api/questions/attachments?limit=18', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('qaaq_token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          // Filter for image attachments only (all available)
          const imageAttachments = data
            .filter((att: QuestionAttachment) => att.attachmentType === 'image');
          setAttachments(imageAttachments);
        } else if (response.status === 404) {
          console.warn('No attachments found, using empty state');
          setAttachments([]);
        } else {
          console.warn('Failed to fetch attachments from API:', response.status);
          setAttachments([]);
        }
      } catch (error) {
        console.error('Error fetching attachments:', error);
        setAttachments([]); // No fallback data - use authentic data only
      } finally {
        setLoading(false);
      }
    };

    fetchAttachments();
  }, []);

  const handleImageError = (attachmentId: string) => {
    setImageError(prev => new Set([...Array.from(prev), attachmentId]));
  };

  const handleViewQuestion = (questionId: number) => {
    // Navigate to the question page for this specific maritime image with proper routing
    console.log('Carousel click: Navigating to question ID:', questionId);
    
    if (questionId && questionId > 0) {
      // Navigate to question page
      window.location.href = `/questions/${questionId}`;
    } else {
      console.error('Invalid question ID for navigation:', questionId);
    }
  };

  const imagesPerView = 3; // Traditional carousel showing 3 images

  const scrollNext = () => {
    if (currentStartIndex + imagesPerView < attachments.length) {
      setCurrentStartIndex(prev => prev + 1);
    }
  };

  const scrollPrev = () => {
    if (currentStartIndex > 0) {
      setCurrentStartIndex(prev => prev - 1);
    }
  };

  const canScrollNext = currentStartIndex + imagesPerView < attachments.length;
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

  // Traditional carousel showing limited images
  const displayImages = attachments.slice(currentStartIndex, currentStartIndex + imagesPerView);

  return (
    <div className={`bg-gradient-to-r from-orange-50 to-yellow-50 border-t border-orange-200 relative ${className}`}>
      {/* Traditional carousel mode - show limited images with navigation */}
      <div className="flex items-stretch justify-center space-x-3 px-4 h-full">
        {displayImages.map((attachment, index) => (
          <div 
            key={attachment.id} 
            className="relative cursor-pointer group flex-1 max-w-[120px] hover:scale-105 transition-transform duration-200"
            onClick={() => handleViewQuestion(attachment.questionId)}
            title={`Click to view: ${attachment.question?.content?.substring(0, 50)}...`}
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
      
      {/* Navigation arrows */}
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