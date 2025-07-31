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
  mapType?: string;
  onUserHover: (user: MapUser | null, position?: { x: number; y: number }) => void;
  onUserClick: (userId: string) => void;
  onZoomChange?: (zoom: number) => void;
  showScanElements?: boolean;
  scanAngle?: number;
  radiusKm?: number;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

const GoogleMap: React.FC<GoogleMapProps> = ({ users, userLocation, mapType = 'roadmap', onUserHover, onUserClick, onZoomChange, showScanElements = false, scanAngle = 0, radiusKm = 50 }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userLocationMarkerRef = useRef<any>(null);
  const scanCircleRef = useRef<any>(null);
  const scanLineRef = useRef<any>(null);
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
      mapTypeId: mapType,
      styles: [
        // Water bodies - light grey
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#c9d3e0' }],
        },
        {
          featureType: 'water',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#9ca0a6' }],
        },
        // Land areas - light neutral grey
        {
          featureType: 'landscape',
          elementType: 'geometry',
          stylers: [{ color: '#f5f5f5' }],
        },
        // Roads - darker grey
        {
          featureType: 'road',
          elementType: 'geometry',
          stylers: [{ color: '#e0e0e0' }],
        },
        {
          featureType: 'road.highway',
          elementType: 'geometry',
          stylers: [{ color: '#dadada' }],
        },
        // Administrative boundaries - subtle grey
        {
          featureType: 'administrative',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#c9c9c9' }],
        },
        // Country/state labels - medium grey
        {
          featureType: 'administrative',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#7c7c7c' }],
        },
        // Cities and places - dark grey
        {
          featureType: 'administrative.locality',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#5c5c5c' }],
        },
        // Points of interest - lighter grey
        {
          featureType: 'poi',
          elementType: 'geometry',
          stylers: [{ color: '#eeeeee' }],
        },
        {
          featureType: 'poi',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#9e9e9e' }],
        },
        // Transit - neutral grey
        {
          featureType: 'transit',
          elementType: 'geometry',
          stylers: [{ color: '#e8e8e8' }],
        },
        {
          featureType: 'transit',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#8a8a8a' }],
        }
      ],
    });

    console.log('✅ Google Maps initialized for admin user');
  }, [isMapLoaded, userLocation]);

  // Separate effect for zoom listener to avoid re-initialization
  useEffect(() => {
    if (!mapInstanceRef.current || !onZoomChange) return;
    
    const listener = mapInstanceRef.current.addListener('zoom_changed', () => {
      const zoom = mapInstanceRef.current.getZoom();
      onZoomChange(zoom);
    });

    // Cleanup listener on unmount or when onZoomChange changes
    return () => {
      if (listener && listener.remove) {
        listener.remove();
      }
    };
  }, [isMapLoaded, onZoomChange]);

  // Update map type when mapType prop changes
  useEffect(() => {
    if (mapInstanceRef.current && mapType) {
      mapInstanceRef.current.setMapTypeId(mapType);
    }
  }, [mapType]);

  // Add user markers
  useEffect(() => {
    if (!isMapLoaded || !mapInstanceRef.current || !users.length) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add new markers with stable positioning
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
        // Use stable seed for consistent positioning based on user ID
        const seed = user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const random1 = ((seed * 9301 + 49297) % 233280) / 233280;
        const random2 = (((seed + 1) * 9301 + 49297) % 233280) / 233280;
        
        const scatterRadius = 0.45; // degrees (roughly 50km)
        plotLat = user.latitude + (random1 - 0.5) * scatterRadius;
        plotLng = user.longitude + (random2 - 0.5) * scatterRadius;
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

  // Add user location marker (current user's position)
  useEffect(() => {
    if (!isMapLoaded || !mapInstanceRef.current || !userLocation) return;

    // Clear existing user location marker
    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.setMap(null);
    }

    // Create a prominent marker for user's current location
    userLocationMarkerRef.current = new window.google.maps.Marker({
      position: userLocation,
      map: mapInstanceRef.current,
      title: 'Your Location',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 4, // One third of 12
        fillColor: '#FF4444', // Red for user location
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 1,
      },
      zIndex: 1000, // High z-index to appear above other markers
    });

    // Add pulsing ring around user location
    const pulseRing = new window.google.maps.Marker({
      position: userLocation,
      map: mapInstanceRef.current,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 7, // One third of 20
        fillColor: '#FF4444',
        fillOpacity: 0.2,
        strokeColor: '#FF4444',
        strokeWeight: 1,
        strokeOpacity: 0.6,
      },
      zIndex: 999,
    });

    markersRef.current.push(pulseRing);

  }, [isMapLoaded, userLocation]);

  // Add scan overlay elements (circle and rotating line)
  useEffect(() => {
    if (!isMapLoaded || !mapInstanceRef.current || !userLocation || !showScanElements) {
      // Clear existing scan elements when not needed
      if (scanCircleRef.current) {
        scanCircleRef.current.setMap(null);
        scanCircleRef.current = null;
      }
      if (scanLineRef.current) {
        scanLineRef.current.setMap(null);
        scanLineRef.current = null;
      }
      return;
    }

    // Create scan circle if not exists
    if (!scanCircleRef.current) {
      scanCircleRef.current = new window.google.maps.Circle({
        center: userLocation,
        radius: radiusKm * 1000, // Convert km to meters
        strokeColor: '#4ade80',
        strokeOpacity: 0.6,
        strokeWeight: 2,
        fillOpacity: 0,
        map: mapInstanceRef.current,
      });
    } else {
      // Update existing circle
      scanCircleRef.current.setCenter(userLocation);
      scanCircleRef.current.setRadius(radiusKm * 1000);
    }

    // Calculate end point of scan line based on angle
    const earthRadius = 6371000; // Earth radius in meters
    const distance = Math.min(radiusKm * 1000, 100000); // Limit line length
    const bearing = (scanAngle * Math.PI) / 180; // Convert to radians
    
    const lat1 = (userLocation.lat * Math.PI) / 180;
    const lng1 = (userLocation.lng * Math.PI) / 180;
    
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(distance / earthRadius) +
      Math.cos(lat1) * Math.sin(distance / earthRadius) * Math.cos(bearing)
    );
    
    const lng2 = lng1 + Math.atan2(
      Math.sin(bearing) * Math.sin(distance / earthRadius) * Math.cos(lat1),
      Math.cos(distance / earthRadius) - Math.sin(lat1) * Math.sin(lat2)
    );

    const endPoint = {
      lat: (lat2 * 180) / Math.PI,
      lng: (lng2 * 180) / Math.PI,
    };

    // Create or update scan line
    if (!scanLineRef.current) {
      scanLineRef.current = new window.google.maps.Polyline({
        path: [userLocation, endPoint],
        geodesic: false,
        strokeColor: '#4B5563',
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map: mapInstanceRef.current,
      });
    } else {
      scanLineRef.current.setPath([userLocation, endPoint]);
    }

  }, [isMapLoaded, userLocation, showScanElements, scanAngle, radiusKm]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};

export default GoogleMap;