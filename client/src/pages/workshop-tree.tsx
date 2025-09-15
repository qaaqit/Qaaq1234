import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { ChevronRight, ChevronDown, Wrench, Home, Settings, Building, MapPin, Clock, Star, Shield, Image as ImageIcon, Globe, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Skeleton } from '@/components/ui/skeleton';

interface WorkshopSystem {
  code: string;
  title: string;
  taskCount: number;
  equipment?: WorkshopEquipment[];
}

interface WorkshopEquipment {
  code: string;
  title: string;
  taskCount: number;
}

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
  servicesCount?: number;
}

export default function WorkshopTreePage() {
  const [expandedSystems, setExpandedSystems] = useState<Set<string>>(new Set());
  const [, setLocation] = useLocation();
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Fetch featured workshops
  const { data: featuredWorkshops, isLoading: workshopsLoading, error: workshopsError } = useQuery({
    queryKey: ['/api/workshops/featured'],
    staleTime: 15 * 60 * 1000, // 15 minutes
    retry: 3,
  });

  // Fetch workshop tree systems
  const { data: systems, isLoading: systemsLoading, error: systemsError } = useQuery({
    queryKey: ['/api/workshop-tree'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  const toggleSystem = (systemCode: string) => {
    const newExpanded = new Set(expandedSystems);
    if (newExpanded.has(systemCode)) {
      newExpanded.delete(systemCode);
    } else {
      newExpanded.add(systemCode);
    }
    setExpandedSystems(newExpanded);
  };

  const navigateToSystem = (systemCode: string) => {
    setLocation(`/workshop-tree/system/${systemCode}`);
  };

  const navigateToWorkshop = (workshopId: string) => {
    setLocation(`/workshop/${workshopId}`);
  };

  const handleImageError = (workshopId: string) => {
    setImageErrors(prev => ({ ...prev, [workshopId]: true }));
  };

  const renderWorkshopCard = (workshop: FeaturedWorkshop) => {
    const imageError = imageErrors[workshop.id] || false;
    
    // Helper function to extract domain from URL
    const extractDomain = (url?: string) => {
      if (!url) return null;
      try {
        const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
        return domain.startsWith('www.') ? domain : `www.${domain}`;
      } catch {
        return url;
      }
    };

    // Use websitePreviewImage first, then fallback to heroImageUrl
    // Ensure we have a valid image URL (not null, undefined, or empty)
    let imageSource = (workshop.websitePreviewImage && workshop.websitePreviewImage.trim()) || 
                     (workshop.heroImageUrl && workshop.heroImageUrl.trim()) || null;
    
    // Fix protocol issue: if URL doesn't start with http/https, add https://
    if (imageSource && !imageSource.startsWith('http')) {
      imageSource = `https://${imageSource}`;
    }

    // Reset image error when workshop changes
    useEffect(() => {
      if (imageErrors[workshop.id]) {
        setImageErrors(prev => ({ ...prev, [workshop.id]: false }));
      }
    }, [workshop.id, imageErrors]);

    return (
      <div
        key={workshop.id}
        className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group min-w-[280px] max-w-[320px]"
        onClick={() => navigateToWorkshop(workshop.id)}
        data-testid={`card-workshop-${workshop.id}`}
      >
        <div className="relative h-48 bg-gradient-to-br from-orange-100 to-orange-200 rounded-t-xl overflow-hidden">
          {imageSource && !imageError ? (
            <img
              src={imageSource}
              alt={workshop.displayName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              data-testid={`img-workshop-preview-${workshop.id}`}
              onError={() => handleImageError(workshop.id)}
            />
          ) : null}
          <div className={`${imageSource && !imageError ? 'hidden' : 'flex'} absolute inset-0 items-center justify-center`}>
            <ImageIcon className="h-16 w-16 text-orange-400" />
          </div>
          {workshop.verified && (
            <div className="absolute top-3 right-3 bg-green-500 rounded-full p-1">
              <Shield className="h-4 w-4 text-white" />
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2" data-testid={`text-workshop-name-${workshop.id}`}>
            {workshop.displayName}
          </h3>
          
          {/* Website URL or Location Display */}
          <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
            {workshop.websiteUrl ? (
              <div className="flex items-center flex-1 min-w-0">
                <Globe className="h-4 w-4 mr-1 flex-shrink-0" />
                <span 
                  className="truncate" 
                  data-testid={`text-workshop-website-${workshop.id}`}
                  title={extractDomain(workshop.websiteUrl) || workshop.websiteUrl}
                >
                  {extractDomain(workshop.websiteUrl) || workshop.websiteUrl}
                </span>
              </div>
            ) : (
              <div className="flex items-center flex-1">
                <MapPin className="h-4 w-4 mr-1" />
                <span data-testid={`text-workshop-location-${workshop.id}`}>
                  {workshop.city}, {workshop.country}
                </span>
              </div>
            )}
            
            {/* External Link Button */}
            {workshop.websiteUrl && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const url = workshop.websiteUrl!.startsWith('http') ? workshop.websiteUrl : `https://${workshop.websiteUrl}`;
                  window.open(url, '_blank', 'noopener,noreferrer');
                }}
                className="ml-2 p-1 hover:bg-gray-100 rounded transition-colors"
                title="Visit website"
                data-testid={`button-external-website-${workshop.id}`}
              >
                <ExternalLink className="h-3 w-3 text-gray-500 hover:text-orange-600" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span className="text-sm font-medium ml-1" data-testid={`text-workshop-rating-${workshop.id}`}>
                {workshop.rating.toFixed(1)}
              </span>
              <span className="text-xs text-gray-500 ml-1">({workshop.servicesCount || 0} services)</span>
            </div>
            {workshop.verified && (
              <Badge variant="secondary" className="text-xs bg-green-50 text-green-700">
                Verified
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {(workshop.expertiseTags || []).slice(0, 3).map((exp, index) => (
              <Badge
                key={index}
                variant="outline"
                className="text-xs bg-orange-50 border-orange-200 text-orange-700"
                data-testid={`badge-expertise-${workshop.id}-${index}`}
              >
                {exp}
              </Badge>
            ))}
            {(workshop.expertiseTags || []).length > 3 && (
              <Badge variant="outline" className="text-xs bg-gray-50 border-gray-200 text-gray-600">
                +{(workshop.expertiseTags || []).length - 3} more
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderWorkshopSkeleton = () => (
    <div className="min-w-[280px] max-w-[320px]">
      <Card className="overflow-hidden">
        <Skeleton className="h-48 w-full" />
        <div className="p-4 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="flex gap-1">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-14" />
          </div>
        </div>
      </Card>
    </div>
  );

  // Loading state
  if (workshopsLoading && systemsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-xl text-orange-600 animate-pulse">Loading workshops and systems...</div>
      </div>
    );
  }

  // Error state for systems (critical)
  if (systemsError || !systems) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Failed to load workshop systems</div>
      </div>
    );
  }

  const workshopSystems = (systems as any)?.data || [];
  const workshops = (featuredWorkshops as any)?.workshops || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      {/* SEO Meta Tags */}
      <title>Workshops Worldwide | QaaqConnect</title>
      <meta name="description" content="Discover authentic marine workshops worldwide and browse by ship systems. Find verified repair services, compare ratings, and connect with maritime professionals globally." />
      
      {/* Header with breadcrumb */}
      <div className="bg-white shadow-md border-b border-orange-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLocation('/')}
                  data-testid="button-home"
                >
                  <Home className="h-5 w-5" />
                </Button>
                <div className="flex items-center space-x-2">
                  <Wrench className="h-6 w-6 text-orange-600" />
                  <h1 className="text-2xl font-bold text-gray-800">Workshops Worldwide</h1>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-sm ml-12">
                <span className="text-gray-800 font-medium">Featured Workshops</span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Browse by System</span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Find Services</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-green-50 border-green-300 text-green-700">
                {workshops.length} Featured
              </Badge>
              <Badge variant="outline" className="bg-orange-50 border-orange-300">
                {workshopSystems.length} Systems
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Featured Workshops Carousel Section */}
        <div className="mb-12">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Featured Workshops Worldwide</h2>
            <p className="text-gray-600">Discover authentic marine repair services from verified workshops around the globe</p>
          </div>
          
          {workshopsLoading ? (
            <div className="flex space-x-4 overflow-hidden">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index}>{renderWorkshopSkeleton()}</div>
              ))}
            </div>
          ) : workshopsError || workshops.length === 0 ? (
            <Card className="p-8 text-center bg-white border-orange-200">
              <Building className="h-16 w-16 text-orange-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Featured Workshops Available</h3>
              <p className="text-gray-500">Check back later for featured workshop listings</p>
            </Card>
          ) : (
            <div className="relative">
              <Carousel
                opts={{
                  align: "start",
                  loop: false,
                }}
                className="w-full"
                data-testid="carousel-featured-workshops"
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  {workshops.slice(0, 12).map((workshop: FeaturedWorkshop) => (
                    <CarouselItem key={workshop.id} className="pl-2 md:pl-4 basis-auto">
                      {renderWorkshopCard(workshop)}
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="-left-4" data-testid="button-carousel-previous" />
                <CarouselNext className="-right-4" data-testid="button-carousel-next" />
              </Carousel>
            </div>
          )}
        </div>

        {/* Browse by System Section */}
        <div>
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Browse by System</h2>
            <p className="text-gray-600">Explore ship systems and equipment to find specialized workshop services</p>
          </div>
          
          <div className="space-y-4">
          {workshopSystems.map((system: WorkshopSystem) => (
            <Card key={system.code} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div 
                    className="flex items-center space-x-4 cursor-pointer hover:bg-orange-50 transition-colors flex-1 p-2 rounded"
                    onClick={() => navigateToSystem(system.code)}
                    data-testid={`button-navigate-system-${system.code}`}
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-lg">{system.code.toUpperCase()}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{system.title}</h3>
                      <p className="text-sm text-gray-600">System Code: {system.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-orange-100 text-orange-800">
                      {system.taskCount} Tasks
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSystem(system.code);
                      }}
                      data-testid={`button-toggle-system-${system.code}`}
                    >
                      {expandedSystems.has(system.code) ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Expanded Equipment */}
              {expandedSystems.has(system.code) && system.equipment && (
                <div className="border-t border-gray-200 bg-gray-50">
                  <div className="p-4 space-y-2">
                    {system.equipment.map((equipment: WorkshopEquipment) => (
                      <div
                        key={equipment.code}
                        className="bg-white p-4 rounded-lg hover:shadow-md transition-all cursor-pointer"
                        onClick={() => setLocation(`/workshop-tree/equipment/${system.code}/${equipment.code}`)}
                        data-testid={`button-equipment-${equipment.code}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Settings className="h-5 w-5 text-orange-500" />
                            <div>
                              <p className="font-medium text-gray-800">{equipment.title}</p>
                              <p className="text-xs text-gray-500">Code: {equipment.code}</p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {equipment.taskCount} Tasks
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 pb-4">
                    <Button
                      className="w-full bg-orange-600 hover:bg-orange-700"
                      onClick={() => navigateToSystem(system.code)}
                      data-testid={`button-view-system-${system.code}`}
                    >
                      View All Equipment →
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

          {/* Info Card */}
          <Card className="mt-8 p-6 bg-gradient-to-r from-orange-100 to-orange-50 border-orange-200">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Workshop Service Network</h3>
                <p className="text-sm text-gray-600">
                  Browse through ship systems and equipment to find specialized workshop services available in ports worldwide. 
                  Each task shows required expertise and estimated hours for proper maintenance and repairs.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}