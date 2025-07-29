import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
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
  users: GoogleMapsUser[];
  center?: { lat: number; lng: number };
  onUserClick?: (user: GoogleMapsUser) => void;
}

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

export default function GoogleMaps({ users, center, onUserClick }: GoogleMapsProps) {
  const { user } = useAuth();
  const [map, setMap] = useState<any>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');
  const [isLoaded, setIsLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);

  // Check if user is premium (admin users for now)
  const isPremiumUser = user?.email === 'mushy.piyush@gmail.com' || user?.id === '+919029010070' || user?.whatsappNumber === '+919029010070';

  useEffect(() => {
    if (!isPremiumUser) return;

    // Load Google Maps API
    const loadGoogleMaps = () => {
      if (window.google) {
        initializeMap();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'demo_key'}&callback=initMap`;
      script.async = true;
      script.defer = true;
      
      window.initMap = initializeMap;
      document.head.appendChild(script);
    };

    const initializeMap = () => {
      if (!mapRef.current || !window.google) return;

      const defaultCenter = center || { lat: 19.076, lng: 72.8777 }; // Mumbai default
      
      const mapInstance = new window.google.maps.Map(mapRef.current, {
        zoom: 8,
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
          }
        ],
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true
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
  }, [isPremiumUser, center, mapType]);

  useEffect(() => {
    if (!map || !isLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add user markers
    users.forEach(user => {
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
  }, [map, users, isLoaded, onUserClick]);

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

  return (
    <div className="relative w-full h-full">
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg p-2 space-y-2">
        <div className="flex flex-col space-y-1">
          <Button
            size="sm"
            variant={mapType === 'roadmap' ? 'default' : 'outline'}
            onClick={() => changeMapType('roadmap')}
            className="w-full justify-start text-xs"
          >
            <Map className="w-3 h-3 mr-1" />
            Road
          </Button>
          <Button
            size="sm"
            variant={mapType === 'satellite' ? 'default' : 'outline'}
            onClick={() => changeMapType('satellite')}
            className="w-full justify-start text-xs"
          >
            <Satellite className="w-3 h-3 mr-1" />
            Satellite
          </Button>
          <Button
            size="sm"
            variant={mapType === 'hybrid' ? 'default' : 'outline'}
            onClick={() => changeMapType('hybrid')}
            className="w-full justify-start text-xs"
          >
            <MapPin className="w-3 h-3 mr-1" />
            Hybrid
          </Button>
        </div>
        
        {userLocation && (
          <>
            <hr className="border-gray-200" />
            <Button
              size="sm"
              variant="outline"
              onClick={centerOnUser}
              className="w-full justify-start text-xs"
            >
              <Navigation className="w-3 h-3 mr-1" />
              My Location
            </Button>
          </>
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