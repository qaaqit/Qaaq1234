import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import GoogleMap from '../components/google-map';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Crown, Search, Filter, Map, Radio, Home } from 'lucide-react';

interface MapUser {
  id: string;
  fullName: string;
  userType: string;
  rank: string | null;
  shipName: string | null;
  company?: string | null;
  imoNumber: string | null;
  port: string | null;
  visitWindow: string | null;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  deviceLatitude?: number | null;
  deviceLongitude?: number | null;
  distance?: number;
  questionCount?: number;
  profilePictureUrl?: string;
  whatsAppProfilePictureUrl?: string;
  whatsAppDisplayName?: string;
  locationSource?: string;
  locationUpdatedAt?: string;
  isRecentLocation?: boolean;
}

interface GeospatialResponse {
  users: MapUser[];
  searchCenter: { latitude: number; longitude: number };
  searchRadius: number;
  totalResults: number;
}

export default function Discover() {
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  const [selectedUser, setSelectedUser] = useState<MapUser | null>(null);
  const [radiusKm, setRadiusKm] = useState(50);
  const [showScanElements, setShowScanElements] = useState(false);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');
  const mapRef = useRef<any>(null);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(coords);
          console.log('📍 User location obtained:', coords);
        },
        (error) => {
          console.error('Location permission denied:', error);
          // Default to Mumbai coordinates if location denied
          setUserLocation({ lat: 19.0760, lng: 72.8777 });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // Cache for 5 minutes
        }
      );
    } else {
      console.warn('Geolocation not supported, using default location');
      setUserLocation({ lat: 19.0760, lng: 72.8777 });
    }
  }, []);

  // Optimized geospatial user search
  const { data: searchData, isLoading, refetch } = useQuery<GeospatialResponse>({
    queryKey: ['/api/discover/nearby', userLocation?.lat, userLocation?.lng, radiusKm],
    queryFn: async () => {
      if (!userLocation) throw new Error('User location not available');
      
      console.log(`🔍 Fetching sailors within ${radiusKm}km of (${userLocation.lat}, ${userLocation.lng})`);
      
      const response = await fetch(
        `/api/discover/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=${radiusKm}&limit=100`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch nearby sailors');
      }
      
      const data = await response.json();
      console.log(`✅ Found ${data.totalResults} sailors nearby`);
      return data;
    },
    enabled: !!userLocation,
    refetchInterval: false,
  });

  const users = searchData?.users || [];

  // Handle "Koi Hai?" button press
  const handleKoiHaiSearch = () => {
    setSearchQuery('');
    setShowScanElements(true);
    refetch();
    
    // Hide scan animation after 6 seconds
    setTimeout(() => {
      setShowScanElements(false);
    }, 6000);
  };

  // Reset to user's location
  const handleHomeReset = () => {
    setSearchQuery('');
    setSelectedUser(null);
    if (mapRef.current && userLocation) {
      mapRef.current.panTo(userLocation);
      mapRef.current.setZoom(10);
    }
  };

  // Handle user selection from map
  const handleUserSelect = (user: MapUser) => {
    setSelectedUser(user);
    console.log('👤 User selected:', user.fullName, `(${user.distance}km away)`);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src="/qaaq-logo.png" alt="QAAQ" className="h-8 w-auto" />
            <span className="font-bold text-lg text-gray-800">QaaqConnect</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-orange-600 border-orange-200">
              <Radio className="w-4 h-4 mr-1" />
              QBOT
            </Button>
          </div>
        </div>
      </div>

      {/* Search Controls */}
      <div className="absolute top-20 left-4 right-4 z-20">
        <div className="bg-white rounded-lg shadow-lg p-4 space-y-3">
          {/* Search Bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Sailors/ Ships/ Company"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-12"
              />
              <Crown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-yellow-500 w-4 h-4" />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Map className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Radio className="w-4 h-4" />
            </Button>
          </div>

          {/* Koi Hai Button */}
          <Button 
            onClick={handleKoiHaiSearch}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium"
            disabled={isLoading}
          >
            {isLoading ? 'Searching...' : 'Koi Hai?'}
          </Button>

          {/* Results Summary */}
          {searchData && (
            <div className="text-sm text-gray-600 text-center">
              Found {searchData.totalResults} sailors within {radiusKm}km
            </div>
          )}
        </div>
      </div>

      {/* Home Reset Button */}
      <Button
        onClick={handleHomeReset}
        className="absolute top-20 right-4 z-20 bg-red-600 hover:bg-red-700 text-white"
        size="sm"
      >
        <Home className="w-4 h-4" />
      </Button>

      {/* Map Type Controls */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-1">
        {['roadmap', 'satellite', 'hybrid'].map((type) => (
          <Button
            key={type}
            onClick={() => setMapType(type as any)}
            variant={mapType === type ? 'default' : 'outline'}
            size="sm"
            className="capitalize bg-white/90 backdrop-blur-sm"
          >
            {type === 'roadmap' ? <Map className="w-4 h-4" /> : 
             type === 'satellite' ? '🛰️' : '🗺️'}
          </Button>
        ))}
      </div>

      {/* User Info Panel */}
      {selectedUser && (
        <div className="absolute bottom-4 right-4 z-20 bg-white rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{selectedUser.fullName}</h3>
              <p className="text-sm text-gray-600">{selectedUser.maritimeRank || selectedUser.rank}</p>
              <p className="text-sm text-gray-500">{selectedUser.shipName}</p>
              <p className="text-sm text-gray-500">{selectedUser.city}, {selectedUser.country}</p>
              {selectedUser.distance && (
                <p className="text-sm font-medium text-orange-600">
                  📏 {selectedUser.distance}km away
                </p>
              )}
            </div>
            <Button
              onClick={() => setSelectedUser(null)}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </Button>
          </div>
        </div>
      )}

      {/* Main Map */}
      <GoogleMap
        ref={mapRef}
        users={users}
        userLocation={userLocation}
        selectedUser={selectedUser}
        onUserSelect={handleUserSelect}
        showScanElements={showScanElements}
        mapType={mapType}
        className="w-full h-full"
      />
    </div>
  );
}