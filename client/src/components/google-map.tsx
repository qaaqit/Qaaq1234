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
  selectedUser?: MapUser | null;
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

const GoogleMap: React.FC<GoogleMapProps> = ({ users, userLocation, selectedUser, mapType = 'roadmap', onUserHover, onUserClick, onZoomChange, showScanElements = false, scanAngle = 0, radiusKm = 50 }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userLocationMarkerRef = useRef<any>(null);
  const scanCircleRef = useRef<any>(null);
  const scanLineRef = useRef<any>(null);
  const [boundsUpdateTrigger, setBoundsUpdateTrigger] = useState(0);
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
    
    const zoomListener = mapInstanceRef.current.addListener('zoom_changed', () => {
      const zoom = mapInstanceRef.current.getZoom();
      onZoomChange(zoom);
    });

    // Also listen for bounds changes to update scan circle
    const boundsListener = mapInstanceRef.current.addListener('bounds_changed', () => {
      // Trigger scan update when bounds change
      if (showScanElements) {
        setBoundsUpdateTrigger(prev => prev + 1);
      }
    });

    // Cleanup listeners on unmount or when dependencies change
    return () => {
      if (zoomListener && zoomListener.remove) {
        zoomListener.remove();
      }
      if (boundsListener && boundsListener.remove) {
        boundsListener.remove();
      }
    };
  }, [isMapLoaded, onZoomChange, showScanElements]);

  // Update map type when mapType prop changes
  useEffect(() => {
    if (mapInstanceRef.current && mapType) {
      mapInstanceRef.current.setMapTypeId(mapType);
    }
  }, [mapType]);

  // Center map on selected user
  useEffect(() => {
    if (mapInstanceRef.current && selectedUser) {
      const center = new window.google.maps.LatLng(selectedUser.latitude, selectedUser.longitude);
      mapInstanceRef.current.panTo(center);
      mapInstanceRef.current.setZoom(14); // Zoom in to show the selected user clearly
    }
  }, [selectedUser]);

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

    // Calculate screen-edge radius based on zoom level and screen size
    let screenRadius;
    
    try {
      const bounds = mapInstanceRef.current.getBounds();
      if (bounds) {
        const center = mapInstanceRef.current.getCenter();
        
        // Get distance from center to edge of visible area
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        
        // Calculate distances to each edge (if geometry library is available)
        if (window.google.maps.geometry && window.google.maps.geometry.spherical) {
          const distanceToNorth = window.google.maps.geometry.spherical.computeDistanceBetween(
            center, new window.google.maps.LatLng(ne.lat(), center.lng())
          );
          const distanceToEast = window.google.maps.geometry.spherical.computeDistanceBetween(
            center, new window.google.maps.LatLng(center.lat(), ne.lng())
          );
          const distanceToSouth = window.google.maps.geometry.spherical.computeDistanceBetween(
            center, new window.google.maps.LatLng(sw.lat(), center.lng())
          );
          const distanceToWest = window.google.maps.geometry.spherical.computeDistanceBetween(
            center, new window.google.maps.LatLng(center.lat(), sw.lng())
          );
          
          // Use the minimum distance to ensure circle fits within screen
          screenRadius = Math.min(distanceToNorth, distanceToEast, distanceToSouth, distanceToWest) * 0.8; // 80% of edge distance
        } else {
          // Fallback calculation using lat/lng differences
          const latDiff = Math.abs(ne.lat() - sw.lat()) / 2;
          const lngDiff = Math.abs(ne.lng() - sw.lng()) / 2;
          const avgLat = (ne.lat() + sw.lat()) / 2;
          
          // Rough conversion to meters (simplified)
          const latToMeters = 111000; // roughly 111km per degree
          const lngToMeters = 111000 * Math.cos(avgLat * Math.PI / 180);
          
          const latDistance = latDiff * latToMeters;
          const lngDistance = lngDiff * lngToMeters;
          
          screenRadius = Math.min(latDistance, lngDistance) * 0.8;
        }
      } else {
        throw new Error('Bounds not available');
      }
    } catch (error) {
      // Fallback to zoom-based calculation
      const zoom = mapInstanceRef.current.getZoom() || 10;
      const baseRadius = 50000; // 50km at zoom 10
      const zoomFactor = Math.pow(2, 10 - zoom);
      screenRadius = baseRadius * zoomFactor;
    }

    // Determine sophisticated colors based on map type
    const isDarkMode = mapType === 'satellite' || mapType === 'hybrid';
    const circleColor = isDarkMode ? '#00d4ff' : '#0891b2'; // Cyan for dark, teal for light
    const circleOpacity = isDarkMode ? 0.7 : 0.5;

    // Create scan circle if not exists
    if (!scanCircleRef.current) {
      scanCircleRef.current = new window.google.maps.Circle({
        center: userLocation,
        radius: screenRadius,
        strokeColor: circleColor,
        strokeOpacity: circleOpacity,
        strokeWeight: 2,
        fillOpacity: 0,
        strokeDashArray: '8, 4', // Elegant dashed pattern
        map: mapInstanceRef.current,
      });
    } else {
      // Update existing circle with new colors and radius
      scanCircleRef.current.setCenter(userLocation);
      scanCircleRef.current.setRadius(screenRadius);
      scanCircleRef.current.setOptions({
        strokeColor: circleColor,
        strokeOpacity: circleOpacity,
      });
    }

    // Calculate end point of scan line based on angle and screen radius
    const bearing = (scanAngle * Math.PI) / 180; // Convert to radians
    
    const lat1 = (userLocation.lat * Math.PI) / 180;
    const lng1 = (userLocation.lng * Math.PI) / 180;
    
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(screenRadius / 6371000) +
      Math.cos(lat1) * Math.sin(screenRadius / 6371000) * Math.cos(bearing)
    );
    
    const lng2 = lng1 + Math.atan2(
      Math.sin(bearing) * Math.sin(screenRadius / 6371000) * Math.cos(lat1),
      Math.cos(screenRadius / 6371000) - Math.sin(lat1) * Math.sin(lat2)
    );

    const endPoint = {
      lat: (lat2 * 180) / Math.PI,
      lng: (lng2 * 180) / Math.PI,
    };

    // Sophisticated scan line colors
    const lineColor = isDarkMode ? '#00d4ff' : '#0891b2'; // Match circle color
    const lineOpacity = isDarkMode ? 0.9 : 0.7;
    const glowEffect = isDarkMode 
      ? `0 0 10px ${lineColor}, 0 0 20px ${lineColor}` 
      : `0 0 8px ${lineColor}`;

    // Create or update scan line
    if (!scanLineRef.current) {
      scanLineRef.current = new window.google.maps.Polyline({
        path: [userLocation, endPoint],
        geodesic: false,
        strokeColor: lineColor,
        strokeOpacity: lineOpacity,
        strokeWeight: isDarkMode ? 4 : 3, // Slightly thicker for dark mode
        map: mapInstanceRef.current,
      });
    } else {
      scanLineRef.current.setPath([userLocation, endPoint]);
      scanLineRef.current.setOptions({
        strokeColor: lineColor,
        strokeOpacity: lineOpacity,
        strokeWeight: isDarkMode ? 4 : 3,
      });
    }

  }, [isMapLoaded, userLocation, showScanElements, scanAngle, boundsUpdateTrigger]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};

export default GoogleMap;