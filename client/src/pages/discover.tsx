import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, User, Ship, Navigation, ArrowLeft } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

// Top 10 Major Ports with their coordinates
const majorPorts = [
  { name: "Shanghai", country: "China", lat: 31.2304, lng: 121.4737, description: "World's busiest port and major global trade hub" },
  { name: "Singapore", country: "Singapore", lat: 1.2966, lng: 103.7764, description: "Leading port in Asia and the world for container traffic" },
  { name: "Rotterdam", country: "Netherlands", lat: 51.9244, lng: 4.4777, description: "Largest port in Europe and top-tier port globally" },
  { name: "Busan", country: "South Korea", lat: 35.1796, lng: 129.0756, description: "Significant container port and busiest in South Korea" },
  { name: "Hong Kong", country: "Hong Kong", lat: 22.3193, lng: 114.1694, description: "Major international shipping and trading center" },
  { name: "Hamburg", country: "Germany", lat: 53.5511, lng: 9.9937, description: "One of the largest ports in the European Union" },
  { name: "New York/New Jersey", country: "USA", lat: 40.6892, lng: -74.0445, description: "Crucial port complex for the United States' East Coast" },
  { name: "Antwerp", country: "Belgium", lat: 51.2194, lng: 4.4025, description: "Second-largest port in Europe, handling significant throughput" },
  { name: "Jebel Ali", country: "UAE", lat: 25.0118, lng: 55.1406, description: "Key transshipment hub for the Middle East and surrounding regions" },
  { name: "Los Angeles", country: "USA", lat: 33.7361, lng: -118.2644, description: "Largest port complex in the Americas" }
];

interface UserWithDistance {
  id: string;
  fullName: string;
  email?: string;
  maritimeRank?: string;
  company?: string;
  lastShip?: string;
  port?: string;
  country?: string;
  city?: string;
  profilePictureUrl?: string;
  whatsAppProfilePictureUrl?: string;
  whatsAppDisplayName?: string;
  questionCount?: number;
  answerCount?: number;
  userType?: string;
  matchType?: 'exact' | 'fuzzy';
}

export default function Discover() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  
  // Search functionality states
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch search results
  const { data: searchResults = [], isLoading: searchLoading } = useQuery<UserWithDistance[]>({
    queryKey: ['/api/users/search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}&limit=100`);
      if (!response.ok) throw new Error('Failed to search users');
      const data = await response.json();
      return data.sailors || data.users || data || [];
    },
    enabled: !!searchQuery.trim(),
    refetchInterval: false,
  });

  // Create chat connection mutation
  const createConnectionMutation = useMutation({
    mutationFn: async (receiverId: string) => {
      const response = await fetch('/api/chat/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ receiverId }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create connection: ${response.status} - ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/connections'] });
      if (data && data.success && data.connection && data.connection.id) {
        setLocation(`/chat/${data.connection.id}`);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to send connection request",
        variant: "destructive",
      });
    },
  });

  const getInitials = (name?: string) => {
    if (!name) return 'MP';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      // Initialize Leaflet map
      mapInstanceRef.current = L.map(mapRef.current).setView([20, 0], 2);

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);

      // Create custom port icon
      const portIcon = L.divIcon({
        className: 'port-marker',
        html: `
          <div style="
            background-color: #f97316;
            border: 3px solid white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            font-size: 12px;
            color: white;
            font-weight: bold;
          ">⚓</div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -10]
      });

      // Add port markers
      majorPorts.forEach((port, index) => {
        const marker = L.marker([port.lat, port.lng], { icon: portIcon })
          .addTo(mapInstanceRef.current!)
          .bindPopup(`
            <div style="font-family: system-ui, -apple-system, sans-serif;">
              <h3 style="margin: 0 0 8px 0; color: #f97316; font-size: 16px; font-weight: bold;">
                #${index + 1} ${port.name}
              </h3>
              <p style="margin: 0 0 4px 0; font-size: 14px; color: #666; font-weight: 500;">
                📍 ${port.country}
              </p>
              <p style="margin: 0; font-size: 12px; color: #444; line-height: 1.4;">
                ${port.description}
              </p>
            </div>
          `);
      });

      // Enable limited interactions for port viewing
      mapInstanceRef.current.dragging.enable();
      mapInstanceRef.current.scrollWheelZoom.enable();
      mapInstanceRef.current.doubleClickZoom.enable();
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Header with Sailor Search Bar */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center space-x-4">
            {/* Back button */}
            <button 
              onClick={() => setLocation('/')}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
              data-testid="back-to-home"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            
            {/* Sailor Search Bar */}
            <div className="flex-1 flex items-center space-x-2">
              <div className="flex-1 relative">
                <Input
                  type="text"
                  placeholder="Search sailors by name / rank / company / email / whatsapp..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pr-12 border-ocean-teal/30 focus:border-ocean-teal"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSearchQuery(searchInput.trim());
                    }
                  }}
                />
              </div>
              {searchQuery.trim() ? (
                <Button 
                  size="sm"
                  variant="outline"
                  className="px-3 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchInput("");
                  }}
                >
                  Clear
                </Button>
              ) : (
                <Button 
                  size="sm"
                  variant="outline"
                  className="px-3 border-ocean-teal/30 hover:bg-ocean-teal hover:text-white"
                  onClick={() => {
                    setSearchQuery(searchInput.trim());
                  }}
                >
                  <Search size={16} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Map container with top padding for header */}
      <div 
        ref={mapRef} 
        className="w-full h-screen pt-20"
        style={{ minHeight: '100vh' }}
      />
      
      {/* Search Results Overlay */}
      {searchQuery.trim() && (
        <div className="absolute top-20 left-0 right-0 bottom-0 z-40 bg-white/95 backdrop-blur-sm overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6">
            <Card className="border-2 border-ocean-teal/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-navy">
                  <Navigation size={20} />
                  <span>Search Results ({searchResults.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {searchLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-r from-navy to-blue-800 rounded-full flex items-center justify-center mb-4">
                      <User size={32} className="text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Sailors Found</h3>
                    <p className="text-gray-600">
                      Try adjusting your search terms or search by WhatsApp number, name, rank, or company
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-h-96 overflow-y-auto">
                    {searchResults.map((sailor, index) => (
                      <Card 
                        key={`search-${sailor.id}-${index}`} 
                        className="border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => {
                          console.log('🔍 Search card clicked for user:', sailor.id, sailor.fullName);
                          createConnectionMutation.mutate(sailor.id);
                        }}
                      >
                        <CardContent className="p-4 text-[#191919]" data-testid="sailor-search-card">
                          <div className="flex items-start space-x-3 mb-3">
                            <div className="relative">
                              <Avatar className="w-12 h-12 border-2 border-ocean-teal/30">
                                {(sailor.whatsAppProfilePictureUrl || sailor.profilePictureUrl) ? (
                                  <img 
                                    src={sailor.whatsAppProfilePictureUrl || sailor.profilePictureUrl} 
                                    alt={`${sailor.whatsAppDisplayName || sailor.fullName}'s profile`}
                                    className="w-full h-full rounded-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <AvatarFallback className="bg-gradient-to-r from-ocean-teal/20 to-cyan-200 text-gray-700 font-bold">
                                    {getInitials(sailor.whatsAppDisplayName || sailor.fullName)}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate">
                                {sailor.whatsAppDisplayName || sailor.fullName}
                              </h4>
                              <p className="text-sm text-gray-600 truncate">
                                {sailor.maritimeRank || 'Maritime Professional'}
                              </p>
                              {sailor.company && (
                                <p className="text-xs text-gray-500 truncate">
                                  {sailor.company}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* Last Location */}
                          {(sailor.port || sailor.city || sailor.country) && (
                            <div className="flex items-center space-x-2 mb-2">
                              <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                              <span className="text-xs text-gray-600 truncate">
                                {[sailor.port, sailor.city, sailor.country].filter(Boolean).join(', ')}
                              </span>
                            </div>
                          )}
                          
                          {/* Last Ship */}
                          {sailor.lastShip && (
                            <div className="flex items-center space-x-2 mb-2">
                              <Ship size={14} className="text-gray-400 flex-shrink-0" />
                              <span className="text-xs text-gray-600 truncate">
                                {sailor.lastShip}
                              </span>
                            </div>
                          )}
                          
                          {/* Match type indicator */}
                          <div className="flex items-center justify-between mt-3">
                            <Badge variant={sailor.matchType === 'exact' ? 'default' : 'secondary'} className="text-xs">
                              {sailor.matchType === 'exact' ? 'Exact Match' : 'Similar'}
                            </Badge>
                            <div className="text-xs text-gray-500">
                              Q:{sailor.questionCount || 0} A:{sailor.answerCount || 0}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      
      {/* Map message overlay - only show when not searching */}
      {!searchQuery.trim() && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingTop: '80px' }}>
          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6 border border-orange-200">
            <p className="text-xl font-semibold text-gray-800 text-center">
              Awesome features being loaded.<br />
              ETA very soon.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}