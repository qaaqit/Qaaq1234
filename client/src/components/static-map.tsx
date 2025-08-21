import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { MapPin, Satellite, Map, RefreshCw, Users } from 'lucide-react';

interface StaticMapUser {
  id: string;
  fullName: string;
  userType: string;
  rank: string | null;
  shipName: string | null;
  company?: string | null;
  latitude: number;
  longitude: number;
  whatsappNumber?: string;
}

interface StaticMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  width?: number;
  height?: number;
  mapType?: 'roadmap' | 'satellite' | 'hybrid';
  showUsersList?: boolean;
  onUserSelect?: (user: StaticMapUser) => void;
}

const getRankAbbreviation = (rank: string): string => {
  const abbreviations: { [key: string]: string } = {
    'chief_engineer': 'CE',
    'second_engineer': '2E',
    'third_engineer': '3E',
    'fourth_engineer': '4E',
    'junior_engineer': 'JE',
    'engine_cadet': 'E/C',
    'deck_cadet': 'D/C',
    'electrical_engineer': 'ETO',
    'master': 'CAPT',
    'chief_officer': 'C/O',
    'second_officer': '2/O',
    'third_officer': '3/O',
    'trainee': 'TRN',
    'other': 'OTHER'
  };
  return abbreviations[rank?.toLowerCase()] || 'OTHER';
};

export default function StaticMap({ 
  center = { lat: 19.076, lng: 72.8777 }, // Mumbai default
  zoom = 10,
  width = 800,
  height = 600,
  mapType = 'roadmap',
  showUsersList = true,
  onUserSelect
}: StaticMapProps) {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState<StaticMapUser | null>(null);
  const [mapImageUrl, setMapImageUrl] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch users data once - stable, no polling
  const { data: users = [], isLoading, refetch } = useQuery<StaticMapUser[]>({
    queryKey: ['/api/users/nearby'],
    queryFn: async () => {
      const response = await fetch('/api/users/nearby');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchInterval: false, // No automatic refresh
    refetchOnWindowFocus: false, // No refresh on window focus
  });

  // Filter users with valid coordinates
  const validUsers = useMemo(() => {
    return users.filter(u => 
      u.latitude && u.longitude && 
      Math.abs(u.latitude) > 0.1 && Math.abs(u.longitude) > 0.1
    );
  }, [users]);

  // Generate static map URL with user markers
  const generateStaticMapUrl = useMemo(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('VITE_GOOGLE_MAPS_API_KEY not found in environment');
      return '';
    }

    const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
    const params = new URLSearchParams({
      center: `${center.lat},${center.lng}`,
      zoom: zoom.toString(),
      size: `${width}x${height}`,
      maptype: mapType,
      key: apiKey,
      scale: '2' // High DPI for better quality
    });

    // Add center marker for current location first
    params.append('markers', `color:red|label:You|${center.lat},${center.lng}`);

    // Add markers for users (limit to prevent URL length issues)
    if (validUsers.length > 0) {
      const limitedUsers = validUsers.slice(0, 20); // Limit to 20 users to avoid URL length issues
      limitedUsers.forEach(user => {
        const color = user.userType === 'sailor' ? 'blue' : 'green';
        const label = user.userType === 'sailor' ? 'S' : 'L';
        params.append('markers', `color:${color}|label:${label}|${user.latitude},${user.longitude}`);
      });
    }

    const finalUrl = `${baseUrl}?${params.toString()}`;
    console.log('Generated static map URL:', finalUrl);
    return finalUrl;
  }, [center.lat, center.lng, zoom, width, height, mapType, validUsers]);

  // Update map image URL when generated URL changes
  useEffect(() => {
    if (generateStaticMapUrl) {
      setMapImageUrl(generateStaticMapUrl);
    }
  }, [generateStaticMapUrl]);

  // Manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleUserClick = (user: StaticMapUser) => {
    setSelectedUser(user);
    if (onUserSelect) {
      onUserSelect(user);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-4 mx-auto"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-gray-50">
      {/* Map Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-orange-600" />
          <h3 className="font-semibold text-gray-800">Maritime Discovery Map</h3>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-orange-50 text-orange-700">
            <Users className="w-3 h-3 mr-1" />
            {validUsers.length} users
          </Badge>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
            className="h-8"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Static Map Display */}
        <div className="flex-1 relative">
          {mapImageUrl ? (
            <img
              src={mapImageUrl}
              alt="Maritime users map"
              className="w-full h-full object-cover"
              style={{ maxHeight: '100%' }}
              onError={() => {
                console.error('Failed to load static map image');
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <div className="text-center">
                <Map className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Map unavailable</p>
              </div>
            </div>
          )}

          {/* Map Type Indicator */}
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200">
            <div className="flex items-center space-x-2 text-sm">
              {mapType === 'satellite' ? (
                <Satellite className="w-4 h-4 text-blue-600" />
              ) : (
                <Map className="w-4 h-4 text-green-600" />
              )}
              <span className="font-medium capitalize">{mapType}</span>
            </div>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 border border-gray-200">
            <div className="text-xs font-medium text-gray-700 mb-2">Legend</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Sailors (S)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Locals (L)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Your Location</span>
              </div>
            </div>
          </div>
        </div>

        {/* Users List */}
        {showUsersList && (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h4 className="font-semibold text-gray-800">Maritime Professionals</h4>
              <p className="text-sm text-gray-600">{validUsers.length} users in this area</p>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {validUsers.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No users found in this area</p>
                </div>
              ) : (
                <div className="space-y-2 p-4">
                  {validUsers.map((user) => (
                    <Card
                      key={user.id}
                      className={`p-3 cursor-pointer transition-colors hover:bg-orange-50 ${
                        selectedUser?.id === user.id ? 'bg-orange-50 border-orange-200' : ''
                      }`}
                      onClick={() => handleUserClick(user)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-800">{user.fullName}</h5>
                          {user.rank && (
                            <p className="text-sm text-gray-600">{getRankAbbreviation(user.rank)}</p>
                          )}
                          {user.shipName && (
                            <p className="text-sm text-blue-600">{user.shipName}</p>
                          )}
                          {user.company && (
                            <p className="text-xs text-gray-500">{user.company}</p>
                          )}
                        </div>
                        <div className="ml-2">
                          <Badge 
                            variant={user.userType === 'sailor' ? 'default' : 'secondary'}
                            className={user.userType === 'sailor' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}
                          >
                            {user.userType === 'sailor' ? '⚓ Sailor' : '🏠 Local'}
                          </Badge>
                        </div>
                      </div>
                      
                      {user.whatsappNumber && (
                        <div className="mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs bg-green-50 border-green-200 hover:bg-green-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(
                                `https://wa.me/${user.whatsappNumber?.replace(/[^0-9]/g, '') || ''}?text=Hello! I found you through QaaqConnect.`,
                                '_blank'
                              );
                            }}
                          >
                            💬 Connect on WhatsApp
                          </Button>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}