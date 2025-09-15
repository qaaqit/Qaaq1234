import React, { useState, useEffect } from 'react';
import { Wrench, ChevronRight, ChevronLeft, ExternalLink, Star, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface FeaturedWorkshop {
  id: string;
  displayName: string;
  city: string;
  country: string;
  expertiseTags: string[];
  heroImageUrl?: string;
  websiteUrl?: string;
  websitePreviewImage?: string;
  verified: boolean;
  rating: number;
  servicesCount: number;
}

interface ImageCarouselProps {
  className?: string;
}

export default function ImageCarousel({ className = '' }: ImageCarouselProps) {
  const [workshops, setWorkshops] = useState<FeaturedWorkshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState<Set<string>>(new Set());
  const [currentStartIndex, setCurrentStartIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'carousel' | 'grid'>('carousel'); // Default to carousel for workshops

  // Fetch featured workshops
  useEffect(() => {
    const fetchWorkshops = async () => {
      try {
        const response = await fetch('/api/workshops/featured?limit=12', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setWorkshops(data.workshops || []);
        } else {
          console.warn('Failed to fetch workshops from API:', response.status);
          setWorkshops([]);
        }
      } catch (error) {
        console.error('Error fetching workshops:', error);
        setWorkshops([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkshops();
  }, []);

  const handleImageError = (workshopId: string) => {
    setImageError(prev => new Set([...Array.from(prev), workshopId]));
  };

  const handleWorkshopClick = (workshop: FeaturedWorkshop) => {
    // Navigate to workshop tree page
    console.log('Workshop click: Navigating to workshops');
    window.location.href = '/workshop-tree';
  };

  const handleWebsiteClick = (e: React.MouseEvent, websiteUrl: string) => {
    e.stopPropagation();
    const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const workshopsPerView = viewMode === 'carousel' ? 3 : Math.min(6, workshops.length);

  const scrollNext = () => {
    if (currentStartIndex + workshopsPerView < workshops.length) {
      setCurrentStartIndex(prev => prev + 1);
    }
  };

  const scrollPrev = () => {
    if (currentStartIndex > 0) {
      setCurrentStartIndex(prev => prev - 1);
    }
  };

  const canScrollNext = currentStartIndex + workshopsPerView < workshops.length;
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

  if (!workshops.length) {
    return (
      <div className={`bg-gradient-to-r from-orange-50 to-yellow-50 border-t border-orange-200 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Wrench className="h-12 w-12 text-orange-400 mx-auto mb-2" />
            <p className="text-gray-600">No workshops available</p>
          </div>
        </div>
      </div>
    );
  }

  // Show workshops based on view mode
  const displayWorkshops = viewMode === 'grid' 
    ? workshops 
    : workshops.slice(currentStartIndex, currentStartIndex + workshopsPerView);

  return (
    <div className={`bg-gradient-to-r from-orange-50 to-yellow-50 border-t border-orange-200 relative ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-orange-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wrench className="h-5 w-5 text-orange-600" />
            <h3 className="font-semibold text-gray-800">Workshop Carousel</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'carousel' : 'grid')}
            className="bg-white/80 hover:bg-white text-orange-600 border border-orange-200 px-3 py-1 text-xs rounded-full"
          >
            {viewMode === 'grid' ? 'Carousel' : 'Show All'}
          </Button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        // Grid mode - show workshops in a scrollable grid
        <div className="px-4 py-3">
          <div className="grid grid-cols-3 gap-3 max-h-48 overflow-y-auto">
            {displayWorkshops.map((workshop) => (
              <div 
                key={workshop.id} 
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer group overflow-hidden"
                onClick={() => handleWorkshopClick(workshop)}
                title={`${workshop.displayName} - ${workshop.city}, ${workshop.country}`}
              >
                <div className="relative h-24">
                  {workshop.websitePreviewImage && !imageError.has(workshop.id) ? (
                    <img
                      src={workshop.websitePreviewImage}
                      alt={workshop.displayName}
                      className="w-full h-full object-cover"
                      onError={() => handleImageError(workshop.id)}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                      <Wrench className="h-8 w-8 text-orange-500" />
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <h4 className="font-medium text-sm text-gray-800 truncate">{workshop.displayName}</h4>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <MapPin className="h-3 w-3 mr-1" />
                    <span className="truncate">{workshop.city}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Carousel mode - show workshop cards with navigation
        <div className="flex items-stretch justify-center space-x-4 px-4 py-3">
          {displayWorkshops.map((workshop) => (
            <div 
              key={workshop.id} 
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer group flex-1 max-w-[280px] overflow-hidden"
              onClick={() => handleWorkshopClick(workshop)}
            >
              <div className="relative h-32">
                {workshop.websitePreviewImage && !imageError.has(workshop.id) ? (
                  <img
                    src={workshop.websitePreviewImage}
                    alt={workshop.displayName}
                    className="w-full h-full object-cover"
                    onError={() => handleImageError(workshop.id)}
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                    <Wrench className="h-12 w-12 text-orange-500" />
                  </div>
                )}
                {workshop.websiteUrl && (
                  <button
                    onClick={(e) => handleWebsiteClick(e, workshop.websiteUrl!)}
                    className="absolute top-2 right-2 p-1 bg-black/20 hover:bg-black/40 text-white rounded transition-colors"
                    title="Visit website"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="p-3">
                <h4 className="font-semibold text-gray-800 mb-1 line-clamp-1">{workshop.displayName}</h4>
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <MapPin className="h-3 w-3 mr-1" />
                  <span className="truncate">{workshop.city}, {workshop.country}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                    <span className="text-xs font-medium ml-1">{workshop.rating.toFixed(1)}</span>
                  </div>
                  {workshop.verified && (
                    <Badge variant="secondary" className="text-xs bg-green-50 text-green-700">
                      Verified
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Navigation arrows - only show in carousel mode */}
      {viewMode === 'carousel' && (
        <>
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
        </>
      )}
    </div>
  );
}