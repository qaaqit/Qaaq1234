import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Minus } from 'lucide-react';

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
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  showScanElements?: boolean;
  scanAngle?: number;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

const GoogleMap: React.FC<GoogleMapProps> = ({ users, userLocation, selectedUser, mapType = 'roadmap', onUserHover, onUserClick, onZoomChange, onBoundsChange, showScanElements = false, scanAngle = 0 }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userLocationMarkerRef = useRef<any>(null);
  const scanCircleRef = useRef<any>(null);
  const scanLineRef = useRef<any>(null);
  const [boundsUpdateTrigger, setBoundsUpdateTrigger] = useState(0);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState(9);

  // Zoom control functions
  const zoomIn = useCallback(() => {
    if (mapInstanceRef.current) {
      const currentZoom = mapInstanceRef.current.getZoom();
      mapInstanceRef.current.setZoom(currentZoom + 1);
    }
  }, []);

  const zoomOut = useCallback(() => {
    if (mapInstanceRef.current) {
      const currentZoom = mapInstanceRef.current.getZoom();
      mapInstanceRef.current.setZoom(currentZoom - 1);
    }
  }, []);

  // Pan control functions with 3x faster movement
  const panLeft = useCallback(() => {
    if (mapInstanceRef.current) {
      const center = mapInstanceRef.current.getCenter();
      const newLng = center.lng() - 0.03; // 3x faster: 0.01 -> 0.03
      mapInstanceRef.current.panTo({ lat: center.lat(), lng: newLng });
    }
  }, []);

  const panRight = useCallback(() => {
    if (mapInstanceRef.current) {
      const center = mapInstanceRef.current.getCenter();
      const newLng = center.lng() + 0.03; // 3x faster: 0.01 -> 0.03
      mapInstanceRef.current.panTo({ lat: center.lat(), lng: newLng });
    }
  }, []);

  const panUp = useCallback(() => {
    if (mapInstanceRef.current) {
      const center = mapInstanceRef.current.getCenter();
      const newLat = center.lat() + 0.03; // 3x faster: 0.01 -> 0.03
      mapInstanceRef.current.panTo({ lat: newLat, lng: center.lng() });
    }
  }, []);

  const panDown = useCallback(() => {
    if (mapInstanceRef.current) {
      const center = mapInstanceRef.current.getCenter();
      const newLat = center.lat() - 0.03; // 3x faster: 0.01 -> 0.03
      mapInstanceRef.current.panTo({ lat: newLat, lng: center.lng() });
    }
  }, []);

  // Load Google Maps API
  useEffect(() => {
    if (window.google) {
      setIsMapLoaded(true);
      return;
    }

    // Check if script is already loading
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Wait for existing script to load
      const checkLoaded = () => {
        if (window.google) {
          setIsMapLoaded(true);
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Google Maps API key not found. Please set VITE_GOOGLE_MAPS_API_KEY environment variable.');
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places`;
    script.async = true;
    script.defer = true;
    
    // Add error handling
    script.onerror = () => {
      console.error('Failed to load Google Maps API. Please check your API key and network connection.');
      setMapError('Failed to load Google Maps. Please check your internet connection.');
    };

    // Add onload handler
    script.onload = () => {
      if (window.google) {
        console.log('✅ Google Maps API loaded successfully');
        setIsMapLoaded(true);
      }
    };

    document.head.appendChild(script);

    return () => {
      // Don't remove script as it might be used by other components
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || !window.google?.maps) return;

    const defaultCenter = userLocation || { lat: 19.076, lng: 72.8777 }; // Mumbai fallback

    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      zoom: 9,
      center: defaultCenter,
      mapTypeId: mapType,
      mapTypeControl: false, // Hide default map type control
      streetViewControl: false, // Hide street view control
      zoomControl: false, // Hide default zoom control - we'll add custom ones
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

  // Separate effect for zoom and bounds listeners to avoid re-initialization
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    
    const listeners: any[] = [];

    // Zoom change listener
    if (onZoomChange) {
      const zoomListener = mapInstanceRef.current.addListener('zoom_changed', () => {
        const zoom = mapInstanceRef.current.getZoom();
        setCurrentZoom(zoom);
        onZoomChange(zoom);
      });
      listeners.push(zoomListener);
    }

    // Bounds change listener
    const boundsListener = mapInstanceRef.current.addListener('bounds_changed', () => {
      // Trigger scan update when bounds change
      if (showScanElements) {
        setBoundsUpdateTrigger(prev => prev + 1);
      }

      // Update bounds for filtering if callback provided
      if (onBoundsChange) {
        const bounds = mapInstanceRef.current.getBounds();
        if (bounds) {
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          onBoundsChange({
            north: ne.lat(),
            south: sw.lat(),
            east: ne.lng(),
            west: sw.lng()
          });
        }
      }
    });
    listeners.push(boundsListener);

    // Cleanup listeners on unmount or when dependencies change
    return () => {
      listeners.forEach(listener => {
        if (listener && listener.remove) {
          listener.remove();
        }
      });
    };
  }, [isMapLoaded, onZoomChange, onBoundsChange, showScanElements]);

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

  // Add user markers (optimized to prevent flickering)
  useEffect(() => {
    if (!isMapLoaded || !mapInstanceRef.current || !window.google?.maps) return;

    // Only clear and recreate if users array actually changed
    const currentUserIds = markersRef.current.map(m => m.userId).sort().join(',');
    const newUserIds = users.map(u => u.id).sort().join(',');
    
    if (currentUserIds === newUserIds && markersRef.current.length > 0) {
      return; // No change in users, don't recreate markers
    }

    // Clear existing markers only when necessary
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
          scale: 6, // Doubled from 3 to 6 for larger visibility
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 1, // Increased stroke weight proportionally
        },
        optimized: true, // Enable marker optimization to reduce flickering
        clickable: true,
        zIndex: 1,
      });

      // Store user ID with marker for comparison
      (marker as any).userId = user.id;

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
        if (onUserClick) {
          onUserClick(user.id);
        }
      });

      markersRef.current.push(marker);
      // Reduced logging to improve performance
    });

  }, [isMapLoaded, users, onUserHover, onUserClick]);

  // Add user location marker (current user's position)
  useEffect(() => {
    if (!isMapLoaded || !mapInstanceRef.current || !userLocation || !window.google?.maps) return;

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
        scale: 1, // Reduced from 4 to 1 (1/4th size)
        fillColor: '#FF4444', // Red for user location
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 0.3, // Reduced stroke weight
      },
      zIndex: 1000, // High z-index to appear above other markers
    });

    // Add static ring around user location (removed pulsing for stability)
    const pulseRing = new window.google.maps.Marker({
      position: userLocation,
      map: mapInstanceRef.current,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 2, // Reduced from 7 to 2 (smaller static ring)
        fillColor: '#FF4444',
        fillOpacity: 0.1, // Reduced opacity for subtlety
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
    if (!isMapLoaded || !mapInstanceRef.current || !userLocation || !showScanElements || !window.google?.maps) {
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

  // Keyboard navigation event handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard events if map is focused or if there are no other focused elements
      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === 'INPUT' || 
                            activeElement?.tagName === 'TEXTAREA' || 
                            activeElement?.getAttribute('contenteditable') === 'true';

      if (isInputFocused) return;

      switch (event.key) {
        case '+':
        case '=':
          event.preventDefault();
          zoomIn();
          break;
        case '-':
        case '_':
          event.preventDefault();
          zoomOut();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          panLeft();
          break;
        case 'ArrowRight':
          event.preventDefault();
          panRight();
          break;
        case 'ArrowUp':
          event.preventDefault();
          panUp();
          break;
        case 'ArrowDown':
          event.preventDefault();
          panDown();
          break;
      }
    };

    // Add event listener to document for keyboard navigation
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [zoomIn, zoomOut, panLeft, panRight, panUp, panDown]);

  // Show error message if map failed to load
  if (mapError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center p-8 max-w-md">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Google Maps Error</h3>
          <p className="text-gray-600 mb-4">{mapError}</p>
          <p className="text-sm text-gray-500">Please check your internet connection and try refreshing the page.</p>
        </div>
      </div>
    );
  }

  // Show loading state while map is loading
  if (!isMapLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-4"></div>
          <p className="text-gray-600">Loading Google Maps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Zoom Controls */}
      <div className="absolute bottom-4 left-4 flex flex-col space-y-2 z-[1000]">
        <Button
          onClick={zoomIn}
          className="w-10 h-10 p-0 bg-white hover:bg-gray-50 border border-gray-300 shadow-lg rounded-lg"
          data-testid="button-zoom-in"
          title="Zoom in (+ key)"
        >
          <Plus className="w-5 h-5 text-gray-700" />
        </Button>
        <Button
          onClick={zoomOut}
          className="w-10 h-10 p-0 bg-white hover:bg-gray-50 border border-gray-300 shadow-lg rounded-lg"
          data-testid="button-zoom-out"
          title="Zoom out (- key)"
        >
          <Minus className="w-5 h-5 text-gray-700" />
        </Button>
      </div>

      {/* Keyboard Navigation Helper (only show for admin users initially) */}
      <div className="absolute top-4 right-4 z-[999] bg-black/75 text-white text-xs px-3 py-2 rounded-lg backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity duration-300">
        <div className="text-center">
          <div className="font-semibold mb-1">Keyboard Controls</div>
          <div className="space-y-1">
            <div>+/- : Zoom in/out</div>
            <div>← → ↑ ↓ : Pan map</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleMap;