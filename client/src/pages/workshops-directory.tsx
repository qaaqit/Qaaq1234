import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import qaaqLogo from '@assets/qaaq-logo.png';

interface Workshop {
  id: string;
  display_id: string;
  full_name: string;
  home_port: string;
  services: string;
  description?: string;
  official_website?: string;
  is_verified: boolean;
  is_active: boolean;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  totalPages: number;
}

export function WorkshopsDirectoryPage() {
  const [, setLocation] = useLocation();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 60,
    total: 0,
    hasMore: false,
    totalPages: 0
  });
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const observer = useRef<IntersectionObserver>();

  useEffect(() => {
    // Load initial workshops
    fetchWorkshops(1, true);
  }, []);

  const fetchWorkshops = async (page: number = 1, reset: boolean = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await fetch(`/api/workshops?page=${page}&limit=${page === 1 ? 60 : 30}&active=true`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('JSON parse error. Response text:', responseText.substring(0, 200));
        throw new Error('Server returned invalid response format. Please refresh the page.');
      }
      
      if (data.success) {
        // Sort by port name alphabetically
        const sortedWorkshops = data.workshops.sort((a: Workshop, b: Workshop) => {
          return a.home_port.localeCompare(b.home_port);
        });
        
        if (reset || page === 1) {
          setWorkshops(sortedWorkshops);
        } else {
          setWorkshops(prev => [...prev, ...sortedWorkshops]);
        }
        
        setPagination(data.pagination);
      } else {
        console.error('API returned error:', data.message, data.error);
        throw new Error(data.message || 'Failed to fetch workshops');
      }
    } catch (error) {
      console.error('Error fetching workshops:', error);
      toast({
        title: "Error",
        description: "Failed to load workshops. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Intersection Observer callback for infinite scroll
  const lastWorkshopElementRef = useCallback((node: HTMLElement | null) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && pagination.hasMore) {
        fetchWorkshops(pagination.page + 1, false);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, pagination.hasMore, pagination.page]);

  const truncateDescription = (text: string, wordLimit: number = 8): string => {
    const words = text.split(' ');
    if (words.length <= wordLimit) return text;
    return words.slice(0, wordLimit).join(' ') + '...';
  };

  const filteredWorkshops = workshops.filter(workshop => {
    const matchesSearch = !searchTerm || 
                         workshop.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workshop.home_port.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workshop.services.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workshop.display_id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Group workshops by port
  const groupedWorkshops = filteredWorkshops.reduce((acc, workshop) => {
    const port = workshop.home_port;
    if (!acc[port]) {
      acc[port] = [];
    }
    acc[port].push(workshop);
    return acc;
  }, {} as Record<string, Workshop[]>);

  const ports = Object.keys(groupedWorkshops).sort();

  // Function to scroll to a specific port section
  const scrollToPort = (port: string) => {
    const element = document.getElementById(`port-${port.replace(/[^a-zA-Z0-9]/g, '-')}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50">
      {/* Header */}
      <header className="bg-white text-black shadow-md relative overflow-hidden border-b-2 border-orange-400">
        <div className="absolute inset-0 bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 opacity-50"></div>
        
        <div className="relative z-10 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setLocation('/qbot')}
                className="hover:bg-white/10 rounded-lg p-2 transition-colors"
              >
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden">
                  <img src={qaaqLogo} alt="QAAQ Logo" className="w-full h-full object-cover" />
                </div>
              </button>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                  Workshops Directory
                </h1>
                <p className="text-sm text-gray-600">Maritime Repair Workshops</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setLocation('/discover')}
              className="border-orange-300 text-orange-600 hover:bg-orange-50"
              data-testid="button-back-discover"
            >
              ← Back to Discover
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Search Controls */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search workshops, ports, services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-orange-300 focus:border-orange-500"
              data-testid="input-workshop-search"
            />
          </div>
        </div>

        {/* Port Navigation */}
        <div className="mb-6">
          <div className="bg-white rounded-lg border border-orange-200 p-4 shadow-sm">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Jump to Port:</h3>
            <div className="flex flex-wrap gap-2">
              {ports.slice(0, 20).map(port => (
                <button
                  key={port}
                  onClick={() => scrollToPort(port)}
                  data-testid={`port-nav-${port.replace(/[^a-zA-Z0-9]/g, '-')}`}
                  className="px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-600 hover:to-orange-600 shadow-md transition-all duration-200"
                  title={`Jump to ${port}`}
                >
                  {port}
                </button>
              ))}
              {ports.length > 20 && (
                <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                  +{ports.length - 20} more ports
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="mb-6">
          <Badge variant="secondary" className="bg-orange-100 text-orange-800 px-3 py-1">
            🔧 {filteredWorkshops.length} Repair Workshops {pagination.hasMore ? `(of ${pagination.total})` : ''} across {ports.length} ports
          </Badge>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            ))}
          </div>
        )}

        {/* Workshop Listings by Port */}
        {!loading && (
          <div className="space-y-4">
            {ports.map(port => (
              <div key={port} id={`port-${port.replace(/[^a-zA-Z0-9]/g, '-')}`}>
                {/* Port Header */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="px-3 py-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-full">
                    <span className="text-sm font-bold text-white">📍 {port}</span>
                  </div>
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <Badge variant="outline" className="text-xs text-gray-500">
                    {groupedWorkshops[port].length} workshop{groupedWorkshops[port].length > 1 ? 's' : ''}
                  </Badge>
                </div>

                {/* Workshops List - Compact */}
                <div className="space-y-0 ml-8">
                  {groupedWorkshops[port].map((workshop, index) => {
                    const isLastWorkshop = port === ports[ports.length - 1] && 
                                         index === groupedWorkshops[port].length - 1;
                    
                    return (
                      <Dialog key={`dialog-${port}-${workshop.id}-${index}`}>
                        <DialogTrigger asChild>
                          <div 
                            ref={isLastWorkshop ? lastWorkshopElementRef : null}
                            className="py-2 border-b border-gray-50 hover:bg-orange-25 hover:border-orange-100 transition-colors cursor-pointer group relative"
                            data-testid={`workshop-item-${workshop.display_id}`}
                          >
                            <div className="text-sm flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded font-bold">
                                    {workshop.display_id}
                                  </span>
                                  {workshop.is_verified && (
                                    <span className="text-green-600 text-xs">✓ Verified</span>
                                  )}
                                </div>
                                <div className="mt-1">
                                  <span className="text-gray-800 group-hover:text-orange-700 transition-colors">
                                    {truncateDescription(workshop.services || workshop.description || 'Maritime workshop services')}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLocation(`/workshop/${workshop.id}`);
                                  }}
                                  className="p-1 rounded-full bg-orange-100 hover:bg-orange-200 transition-colors"
                                  title="View Workshop Page"
                                  data-testid={`button-workshop-page-${workshop.display_id}`}
                                >
                                  <ArrowRight className="w-3 h-3 text-orange-600" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </DialogTrigger>
                      
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                              <span className="font-mono text-sm bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                {workshop.display_id}
                              </span>
                              {workshop.is_verified && (
                                <span className="text-green-600 text-sm">✓ Verified</span>
                              )}
                            </DialogTitle>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div className="text-sm text-gray-600 bg-orange-50 p-3 rounded-lg">
                              <strong>Port:</strong> {workshop.home_port}
                            </div>
                            
                            <div className="prose prose-sm max-w-none text-gray-700">
                              <h4 className="font-semibold text-gray-900 mb-2">Services & Expertise:</h4>
                              <p>{workshop.services}</p>
                              
                              {workshop.description && workshop.description !== workshop.services && (
                                <>
                                  <h4 className="font-semibold text-gray-900 mb-2 mt-4">Description:</h4>
                                  <p>{workshop.description}</p>
                                </>
                              )}
                            </div>
                            
                            <div className="pt-3 border-t border-gray-200">
                              <button
                                onClick={() => setLocation(`/workshop/${workshop.id}`)}
                                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                                data-testid={`button-visit-workshop-${workshop.display_id}`}
                              >
                                <ArrowRight className="w-4 h-4" />
                                View Workshop Page
                              </button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More Indicator */}
        {loadingMore && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
          </div>
        )}

        {/* No Results */}
        {!loading && filteredWorkshops.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg">No workshops found matching your search.</p>
            <Button 
              variant="outline" 
              onClick={() => setSearchTerm('')}
              className="mt-2"
            >
              Clear Search
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkshopsDirectoryPage;