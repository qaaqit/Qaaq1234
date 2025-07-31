import { useEffect, useRef, useState } from 'react';

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
  locationUpdatedAt?: Date | string | null;
  questionCount?: number;
  answerCount?: number;
}

interface GoogleMapProps {
  users: MapUser[];
  userLocation: { lat: number; lng: number } | null;
  onUserHover: (user: MapUser | null, position?: { x: number; y: number }) => void;
  onUserClick: (userId: string) => void;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

const GoogleMap: React.FC<GoogleMapProps> = ({ users, userLocation, onUserHover, onUserClick }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Load Google Maps API
  useEffect(() => {
    if (window.google) {
      setIsMapLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&callback=initMap`;
    script.async = true;
    script.defer = true;

    window.initMap = () => {
      setIsMapLoaded(true);
    };

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;

    const defaultCenter = userLocation || { lat: 19.076, lng: 72.8777 }; // Mumbai fallback

    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      zoom: 9,
      center: defaultCenter,
      mapTypeId: 'roadmap',
      styles: [
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#1e3a8a' }, { lightness: 17 }],
        },
      ],
    });

    console.log('✅ Google Maps initialized for admin user');
  }, [isMapLoaded, userLocation]);

  // Add user markers
  useEffect(() => {
    if (!isMapLoaded || !mapInstanceRef.current || !users.length) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add new markers
    users.forEach((user) => {
      if (!user.latitude || !user.longitude) return;

      // Check if user is online with recent location update
      const isRecentLocation = user.locationUpdatedAt && 
        new Date(user.locationUpdatedAt).getTime() > Date.now() - 10 * 60 * 1000;
      const isOnlineWithLocation = !!(user.deviceLatitude && user.deviceLongitude && isRecentLocation);

      let plotLat: number, plotLng: number;
      if (isOnlineWithLocation && user.deviceLatitude && user.deviceLongitude) {
        plotLat = user.deviceLatitude;
        plotLng = user.deviceLongitude;
      } else {
        // Scatter within ±50km of city location
        const scatterRadius = 0.45; // degrees (roughly 50km)
        plotLat = user.latitude + (Math.random() - 0.5) * scatterRadius;
        plotLng = user.longitude + (Math.random() - 0.5) * scatterRadius;
      }

      const color = isOnlineWithLocation ? '#10B981' : // green for GPS users
                   user.userType === 'sailor' ? '#1E40AF' : // navy blue for sailors
                   '#0D9488'; // teal for locals

      const marker = new window.google.maps.Marker({
        position: { lat: plotLat, lng: plotLng },
        map: mapInstanceRef.current,
        title: user.fullName,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 15,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      // Add hover listeners
      marker.addListener('mouseover', (e: any) => {
        console.log('🟢 GOOGLE MAPS HOVER: mouseover fired for', user.fullName);
        onUserHover(user, { x: e.domEvent.clientX, y: e.domEvent.clientY });
      });

      marker.addListener('mouseout', () => {
        console.log('🔴 GOOGLE MAPS HOVER: mouseout fired for', user.fullName);
        onUserHover(null);
      });

      // Add click listener
      marker.addListener('click', () => {
        console.log('🔵 GOOGLE MAPS CLICK: click fired for', user.fullName);
        onUserClick(user.id);
      });

      markersRef.current.push(marker);
      console.log(`📍 Google Maps marker added for ${user.fullName} at [${plotLat}, ${plotLng}]`);
    });

  }, [isMapLoaded, users, onUserHover, onUserClick]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Google Maps Controls */}
      <div className="absolute bottom-4 left-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={() => mapInstanceRef.current?.setMapTypeId('roadmap')}
          className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg text-sm font-medium hover:bg-white transition-colors"
        >
          Road
        </button>
        <button
          onClick={() => mapInstanceRef.current?.setMapTypeId('satellite')}
          className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg text-sm font-medium hover:bg-white transition-colors"
        >
          Satellite
        </button>
        <button
          onClick={() => mapInstanceRef.current?.setMapTypeId('hybrid')}
          className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg text-sm font-medium hover:bg-white transition-colors"
        >
          Hybrid
        </button>
      </div>

      {/* Admin indicator */}
      <div className="absolute top-4 right-4 z-[1000] bg-green-600/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg text-white text-sm font-medium">
        🗺️ Google Maps (Admin)
      </div>
    </div>
  );
};

export default GoogleMap;