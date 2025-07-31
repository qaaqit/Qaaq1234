import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Circle, Polyline } from 'react-leaflet';
import { LatLngBounds, divIcon } from 'leaflet';

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

interface LeafletMapProps {
  users: MapUser[];
  userLocation: { lat: number; lng: number } | null;
  selectedUser?: MapUser | null;
  onUserHover: (user: MapUser | null, position?: { x: number; y: number }) => void;
  onUserClick: (userId: string) => void;
  onZoomChange?: (zoom: number) => void;
  showScanElements?: boolean;
  scanAngle?: number;
  radiusKm?: number;
}

const LeafletMap: React.FC<LeafletMapProps> = ({ users, userLocation, selectedUser, onUserHover, onUserClick, onZoomChange, showScanElements = false, scanAngle = 0, radiusKm = 50 }) => {
  const [bounds, setBounds] = useState<LatLngBounds | null>(null);
  const [currentZoom, setCurrentZoom] = useState(10);

  const createCustomIcon = (user: MapUser, isOnlineWithLocation = false) => {
    // Green for online users with location enabled, selected user gets bright green,
    // otherwise navy blue for sailors or ocean teal for locals
    let color;
    if (isOnlineWithLocation) {
      color = '#22c55e'; // Green for online with location
    } else {
      color = user.userType === 'sailor' ? '#1e3a8a' : '#0891b2';
    }
    
    return divIcon({
      html: `<div style="color: ${color}; font-size: 32px; cursor: pointer; pointer-events: auto;">⚓</div>`,
      className: 'custom-anchor-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  };

  // Calculate bounds to show all users
  useEffect(() => {
    if (users.length > 0) {
      const latitudes = users.map(u => u.latitude).filter(Boolean);
      const longitudes = users.map(u => u.longitude).filter(Boolean);
      
      if (latitudes.length === 0 || longitudes.length === 0) return;
      
      const minLat = Math.min(...latitudes);
      const maxLat = Math.max(...latitudes);
      const minLng = Math.min(...longitudes);
      const maxLng = Math.max(...longitudes);
      
      // Add padding to show all users comfortably
      const latPadding = (maxLat - minLat) * 0.1 || 1;
      const lngPadding = (maxLng - minLng) * 0.1 || 1;
      
      setBounds(new LatLngBounds(
        [minLat - latPadding, minLng - lngPadding],
        [maxLat + latPadding, maxLng + lngPadding]
      ));
    } else {
      setBounds(null);
    }
  }, [users]);

  // Component to handle map events
  const MapEventHandler = () => {
    useMapEvents({
      zoomend: (e) => {
        const zoom = e.target.getZoom();
        setCurrentZoom(zoom);
        if (onZoomChange) {
          onZoomChange(zoom);
        }
      },
    });
    return null;
  };

  // Calculate screen-edge radius based on current zoom level
  const getScreenRadius = () => {
    // Dynamic calculation based on zoom level
    // Higher zoom = smaller screen area = smaller radius
    // Lower zoom = larger screen area = larger radius
    
    const baseRadius = 50; // km at zoom 10
    const zoomFactor = Math.pow(2, 10 - currentZoom);
    const calculatedRadius = baseRadius * zoomFactor;
    
    // Constrain radius to reasonable limits
    return Math.min(Math.max(calculatedRadius, 0.1), 5000); // Between 0.1km and 5000km
  };

  const getScanLineEndPoint = () => {
    if (!userLocation || !showScanElements) return null;
    
    const distance = getScreenRadius(); // Use dynamic screen radius
    const bearing = scanAngle; // degrees
    
    const R = 6371; // Earth radius in km
    const lat1 = (userLocation.lat * Math.PI) / 180;
    const lng1 = (userLocation.lng * Math.PI) / 180;
    const brng = (bearing * Math.PI) / 180;
    
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(distance / R) +
      Math.cos(lat1) * Math.sin(distance / R) * Math.cos(brng)
    );
    
    const lng2 = lng1 + Math.atan2(
      Math.sin(brng) * Math.sin(distance / R) * Math.cos(lat1),
      Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2)
    );
    
    return {
      lat: (lat2 * 180) / Math.PI,
      lng: (lng2 * 180) / Math.PI,
    };
  };

  // Use selectedUser location if available, then user location, fallback to Mumbai
  const defaultCenter: [number, number] = selectedUser 
    ? [selectedUser.latitude, selectedUser.longitude]
    : userLocation 
    ? [userLocation.lat, userLocation.lng] 
    : [19.076, 72.8777];
  const scanEndPoint = getScanLineEndPoint();
  const screenRadius = getScreenRadius();

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={defaultCenter}
        zoom={9}
        bounds={bounds || undefined}
        className="w-full h-full z-0"
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        <MapEventHandler />

        {/* Sophisticated Scan Circle */}
        {showScanElements && userLocation && (
          <Circle
            center={[userLocation.lat, userLocation.lng]}
            radius={screenRadius * 1000} // Convert km to meters
            pathOptions={{
              color: '#0891b2', // Elegant teal color
              weight: 2,
              opacity: 0.5,
              fillOpacity: 0,
              dashArray: '8, 4', // More sophisticated dash pattern
              className: 'scan-circle-glow' // Custom CSS class for glow effect
            }}
          />
        )}

        {/* Sophisticated Scan Line */}
        {showScanElements && userLocation && scanEndPoint && (
          <Polyline
            positions={[
              [userLocation.lat, userLocation.lng],
              [scanEndPoint.lat, scanEndPoint.lng]
            ]}
            pathOptions={{
              color: '#0891b2', // Matching teal color
              weight: 3,
              opacity: 0.7,
              className: 'scan-line-glow' // Custom CSS class for glow effect
            }}
          />
        )}

        {/* User markers with anchor pins */}
        {users.map((user) => {
          // Check if user has valid coordinates
          if (!user.latitude || !user.longitude) return null;
          
          // Check if user is online with recent location update
          const isRecentLocation = user.locationUpdatedAt && 
            new Date(user.locationUpdatedAt).getTime() > Date.now() - 10 * 60 * 1000;
          const isOnlineWithLocation = !!(user.deviceLatitude && user.deviceLongitude && isRecentLocation);
          
          let plotLat: number, plotLng: number;
          if (isOnlineWithLocation && user.deviceLatitude && user.deviceLongitude) {
            // Use precise location for online users with location enabled
            plotLat = user.deviceLatitude;
            plotLng = user.deviceLongitude;
          } else {
            // Use stable seed for consistent positioning based on user ID
            const seed = user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const random1 = ((seed * 9301 + 49297) % 233280) / 233280;
            const random2 = (((seed + 1) * 9301 + 49297) % 233280) / 233280;
            
            const scatterRadius = 0.45; // 50km ≈ 0.45 degrees
            plotLat = user.latitude + (random1 - 0.5) * scatterRadius;
            plotLng = user.longitude + (random2 - 0.5) * scatterRadius;
          }
          
          console.log(`⚓ Leaflet marker added for ${user.fullName} at [${plotLat}, ${plotLng}]`);
          
          return (
            <Marker
              key={user.id}
              position={[plotLat, plotLng]}
              icon={createCustomIcon(user, isOnlineWithLocation)}
              eventHandlers={{
                mouseover: (e) => {
                  console.log('🟢 LEAFLET HOVER: mouseover fired for', user.fullName);
                  const mouseEvent = e.originalEvent as MouseEvent;
                  onUserHover(user, { x: mouseEvent.clientX, y: mouseEvent.clientY });
                },
                mouseout: () => {
                  console.log('🔴 LEAFLET HOVER: mouseout fired for', user.fullName);
                  onUserHover(null);
                },
                click: (e) => {
                  console.log('🔵 LEAFLET CLICK: click fired for', user.fullName);
                  onUserClick(user.id);
                  e.originalEvent?.stopPropagation();
                }
              }}
            />
          );
        })}

        {/* User's current location marker */}
        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={divIcon({
              html: `<div style="
                background: #FF4444; 
                border: 1px solid white; 
                border-radius: 50%; 
                width: 5px; 
                height: 5px;
                box-shadow: 0 0 0 2px rgba(255, 68, 68, 0.3);
                cursor: default;
              "></div>`,
              className: 'user-location-marker',
              iconSize: [5, 5],
              iconAnchor: [2.5, 2.5],
            })}
          />
        )}
      </MapContainer>

      {/* Regular user indicator */}
      <div className="absolute top-4 right-4 z-[1000] bg-blue-600/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg text-white text-sm font-medium">
        🗺️ Leaflet Maps (User)
      </div>
    </div>
  );
};

export default LeafletMap;