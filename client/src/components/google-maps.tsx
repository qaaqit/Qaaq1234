import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Satellite, Map } from 'lucide-react';

interface GoogleMapsUser {
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

interface GoogleMapsProps {
  showUsers?: boolean;
  searchQuery?: string;
  center?: { lat: number; lng: number };
  onUserClick?: (user: GoogleMapsUser) => void;
}

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
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

export default function GoogleMaps({ showUsers = false, searchQuery = '', center, onUserClick }: GoogleMapsProps) {
  const { user } = useAuth();
  const [map, setMap] = useState<any>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');
  const [isLoaded, setIsLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapRadius, setMapRadius] = useState<number>(50); // Initial 50km radius
  const mapRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);

  // Check if user is premium (admin users for now)
  const isPremiumUser = user?.email === 'mushy.piyush@gmail.com' || user?.id === '+919029010070' || (user as any)?.whatsappNumber === '+919029010070';

  // Fetch nearby users when showUsers is true
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users/nearby', searchQuery],
    queryFn: async () => {
      if (!showUsers) return [];
      
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      
      const response = await fetch(`/api/users/nearby?${params}`);
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required');
        }
        throw new Error('Failed to fetch nearby users');
      }
      return response.json();
    },
    enabled: showUsers && isPremiumUser
  });

  useEffect(() => {
    if (!isPremiumUser) return;

    // Load Google Maps API
    const loadGoogleMaps = () => {
      if (window.google) {
        initializeMap();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&callback=initMap&libraries=geometry`;
      script.async = true;
      script.defer = true;
      
      window.initMap = initializeMap;
      document.head.appendChild(script);
    };

    const initializeMap = () => {
      if (!mapRef.current || !window.google) return;

      const defaultCenter = center || { lat: 19.076, lng: 72.8777 }; // Mumbai default
      
      const mapInstance = new window.google.maps.Map(mapRef.current, {
        zoom: showUsers ? 9 : 3, // Use zoom level 9 for 50km radius view like regular map
        center: defaultCenter,
        mapTypeId: mapType,
        styles: [
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#1e3a8a' }] // Navy blue water
          },
          {
            featureType: 'landscape',
            elementType: 'geometry',
            stylers: [{ color: '#f8fafc' }] // Light background
          },
          {
            featureType: 'poi.business',
            elementType: 'labels',
            stylers: [{ visibility: 'on' }] // Show ports and maritime businesses
          }
        ],
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        gestureHandling: 'greedy'
      });

      setMap(mapInstance);
      setIsLoaded(true);
      
      // Add user location if available
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userPos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setUserLocation(userPos);
            
            // Add user location marker
            new window.google.maps.Marker({
              position: userPos,
              map: mapInstance,
              title: 'Your Location',
              icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="8" fill="#3b82f6" stroke="#ffffff" stroke-width="2"/>
                    <circle cx="12" cy="12" r="3" fill="#ffffff"/>
                  </svg>
                `),
                scaledSize: new window.google.maps.Size(24, 24)
              }
            });
          },
          (error) => console.log('Geolocation error:', error)
        );
      }
    };

    loadGoogleMaps();
  }, [isPremiumUser, center, mapType, showUsers]);

  useEffect(() => {
    if (!map || !isLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add user markers
    users.forEach((user: any) => {
      const marker = new window.google.maps.Marker({
        position: { lat: user.latitude, lng: user.longitude },
        map: map,
        title: `${user.fullName}${user.rank ? ` (${getRankAbbreviation(user.rank)})` : ''}`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="12" fill="${user.userType === 'sailor' ? '#1e3a8a' : '#0d9488'}" stroke="#ffffff" stroke-width="2"/>
              <text x="16" y="20" text-anchor="middle" fill="white" font-size="10" font-weight="bold">
                ${user.userType === 'sailor' ? '⚓' : '🏠'}
              </text>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 32)
        }
      });

      // Create info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #1f2937;">
              ${user.fullName} ${user.rank ? `(${getRankAbbreviation(user.rank)})` : ''}
            </h3>
            ${user.company ? `<p style="margin: 4px 0; color: #374151;"><strong>Company:</strong> ${user.company}</p>` : ''}
            ${user.shipName ? `<p style="margin: 4px 0; color: #374151;"><strong>Ship:</strong> ${user.shipName}</p>` : ''}
            <div style="margin-top: 8px;">
              <span style="background: ${user.userType === 'sailor' ? '#1e3a8a' : '#0d9488'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">
                ${user.userType === 'sailor' ? '⚓ Sailor' : '🏠 Local'}
              </span>
            </div>
            ${user.whatsappNumber ? `
              <button 
                onclick="window.open('https://wa.me/${user.whatsappNumber.replace(/[^0-9]/g, '')}?text=Hello! I found you through QaaqConnect.', '_blank')"
                style="margin-top: 8px; background: #25d366; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;"
              >
                💬 Connect on WhatsApp
              </button>
            ` : ''}
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
        if (onUserClick) onUserClick(user);
      });

      markersRef.current.push(marker);
    });

    // Smart zoom logic: center on user with expanding radius to show at least 9 pins
    if (showUsers && users.length > 0 && userLocation) {
      let currentRadius = 50; // Start with 50km
      let nearbyUsers = [];
      
      // Keep expanding radius until we have at least 9 users or reach 500km max
      while (nearbyUsers.length < 9 && currentRadius <= 500) {
        nearbyUsers = users.filter((u: any) => {
          const distance = calculateDistance(
            userLocation.lat, userLocation.lng,
            u.latitude, u.longitude
          );
          return distance <= currentRadius;
        });
        
        if (nearbyUsers.length < 9) {
          currentRadius += 25; // Expand by 25km increments
        }
      }
      
      setMapRadius(currentRadius);
      
      // Set bounds to show the radius circle
      const latDelta = currentRadius / 111; // Rough km to degrees conversion
      const lngDelta = currentRadius / (111 * Math.cos(userLocation.lat * Math.PI / 180));
      
      const bounds = new window.google.maps.LatLngBounds(
        new window.google.maps.LatLng(userLocation.lat - latDelta, userLocation.lng - lngDelta),
        new window.google.maps.LatLng(userLocation.lat + latDelta, userLocation.lng + lngDelta)
      );
      
      map.fitBounds(bounds);
    } else if (showUsers && users.length > 0 && !userLocation) {
      // Fallback: show all users if no user location available
      const bounds = new window.google.maps.LatLngBounds();
      users.forEach((user: any) => {
        bounds.extend(new window.google.maps.LatLng(user.latitude, user.longitude));
      });
      
      // Add padding around the bounds
      const center = bounds.getCenter();
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      
      const latPadding = (ne.lat() - sw.lat()) * 0.1;
      const lngPadding = (ne.lng() - sw.lng()) * 0.1;
      
      const paddedBounds = new window.google.maps.LatLngBounds(
        new window.google.maps.LatLng(sw.lat() - latPadding, sw.lng() - lngPadding),
        new window.google.maps.LatLng(ne.lat() + latPadding, ne.lng() + lngPadding)
      );
      
      map.fitBounds(paddedBounds);
    }
  }, [map, users, isLoaded, onUserClick, userLocation, showUsers]);

  const changeMapType = (type: 'roadmap' | 'satellite' | 'hybrid') => {
    setMapType(type);
    if (map) {
      map.setMapTypeId(type);
    }
  };

  const centerOnUser = () => {
    if (userLocation && map) {
      map.setCenter(userLocation);
      map.setZoom(12);
    }
  };

  if (!isPremiumUser) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center p-6">
          <Satellite className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Premium Feature</h3>
          <p className="text-gray-500 mb-4">Google Maps with satellite view and enhanced features is available for premium QAAQ users.</p>
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            🌟 Upgrade to Premium
          </Badge>
        </div>
      </div>
    );
  }

  if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-red-50 rounded-lg border border-red-200">
        <div className="text-center p-6">
          <MapPin className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-700 mb-2">Google Maps API Key Required</h3>
          <p className="text-red-600">Please add VITE_GOOGLE_MAPS_API_KEY to environment variables.</p>
        </div>
      </div>
    );
  }

  if (usersLoading && showUsers) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-blue-50 rounded-lg">
        <div className="text-center p-6">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-blue-700 mb-2">Loading Premium Map</h3>
          <p className="text-blue-600">Fetching maritime users and enhanced map features...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Map Controls - Bottom Left with Transparent Icons */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-col space-y-2">
        <div className="flex space-x-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => changeMapType('roadmap')}
            className={`w-10 h-10 p-0 rounded-lg backdrop-blur-sm border transition-all ${
              mapType === 'roadmap' 
                ? 'bg-white/90 border-blue-500 shadow-lg' 
                : 'bg-white/60 border-white/40 hover:bg-white/80'
            }`}
            title="Road Map"
          >
            <Map className="w-4 h-4 text-gray-700" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => changeMapType('satellite')}
            className={`w-10 h-10 p-0 rounded-lg backdrop-blur-sm border transition-all ${
              mapType === 'satellite' 
                ? 'bg-white/90 border-blue-500 shadow-lg' 
                : 'bg-white/60 border-white/40 hover:bg-white/80'
            }`}
            title="Satellite View"
          >
            <Satellite className="w-4 h-4 text-gray-700" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => changeMapType('hybrid')}
            className={`w-10 h-10 p-0 rounded-lg backdrop-blur-sm border transition-all ${
              mapType === 'hybrid' 
                ? 'bg-white/90 border-blue-500 shadow-lg' 
                : 'bg-white/60 border-white/40 hover:bg-white/80'
            }`}
            title="Hybrid View"
          >
            <MapPin className="w-4 h-4 text-gray-700" />
          </Button>
        </div>
        
        {userLocation && (
          <Button
            size="sm"
            variant="ghost"
            onClick={centerOnUser}
            className="w-10 h-10 p-0 rounded-lg bg-white/60 backdrop-blur-sm border border-white/40 hover:bg-white/80 transition-all"
            title="Center on My Location"
          >
            <Navigation className="w-4 h-4 text-blue-600" />
          </Button>
        )}
      </div>

      {/* Map Container */}
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-lg"
        style={{ minHeight: '400px' }}
      />

      {/* Premium Badge */}
      <div className="absolute bottom-4 left-4 z-10">
        <Badge className="bg-yellow-500 text-white shadow-lg">
          🌟 Premium Google Maps
        </Badge>
      </div>
    </div>
  );
}