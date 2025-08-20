import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ZoomIn, ZoomOut, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Home } from 'lucide-react';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapUser {
  id: string;
  fullName: string;
  userType: string;
  rank: string | null;
  maritimeRank?: string | null;
  shipName: string | null;
  lastShip?: string | null;
  lastCompany?: string | null;
  currentShipName?: string | null;
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
  onboardStatus?: string | null;
  profilePictureUrl?: string | null;
  whatsAppProfilePictureUrl?: string | null;
  whatsAppDisplayName?: string | null;
  isOnline?: boolean;
}

interface LeafletMapProps {
  users: MapUser[];
  userLocation?: { lat: number; lng: number } | null;
  selectedUser?: MapUser | null;
  mapType?: 'roadmap' | 'satellite' | 'hybrid';
  onUserHover?: (user: MapUser | null, position?: { x: number; y: number } | null) => void;
  onUserClick?: (userId: string) => void;
  onZoomChange?: (zoom: number) => void;
  showScanElements?: boolean;
  scanAngle?: number;
  radiusKm?: number;
}

// Custom map component to handle events and control
function MapController({ 
  userLocation, 
  users, 
  onZoomChange, 
  mapType = 'roadmap',
  onUserClick,
  onUserHover 
}: {
  userLocation?: { lat: number; lng: number } | null;
  users: MapUser[];
  onZoomChange?: (zoom: number) => void;
  mapType?: string;
  onUserClick?: (userId: string) => void;
  onUserHover?: (user: MapUser | null, position?: { x: number; y: number } | null) => void;
}) {
  const map = useMap();
  const [currentZoom, setCurrentZoom] = useState(map.getZoom());

  // Handle map events
  useMapEvents({
    zoomend: () => {
      const zoom = map.getZoom();
      setCurrentZoom(zoom);
      onZoomChange?.(zoom);
    },
    moveend: () => {
      // Clear hover when map moves
      onUserHover?.(null);
    }
  });

  // Center map on user location - with proper validation
  useEffect(() => {
    if (userLocation && 
        typeof userLocation.lat === 'number' && 
        typeof userLocation.lng === 'number' && 
        !isNaN(userLocation.lat) && 
        !isNaN(userLocation.lng)) {
      map.setView([userLocation.lat, userLocation.lng], Math.max(currentZoom, 10));
    }
  }, [userLocation?.lat, userLocation?.lng]);

  return null;
}

// Custom user marker with profile image
function UserMarker({ 
  user, 
  onUserClick, 
  onUserHover 
}: { 
  user: MapUser; 
  onUserClick?: (userId: string) => void;
  onUserHover?: (user: MapUser | null, position?: { x: number; y: number } | null) => void;
}) {
  const markerRef = useRef<any>(null);

  // Create custom marker icon based on user type
  const createCustomIcon = (user: MapUser) => {
    const color = user.userType === 'sailor' ? '#2563eb' : '#dc2626'; // Blue for sailors, red for locals
    const isOnline = user.isOnline !== false; // Default to online if not specified
    
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          width: 32px; 
          height: 32px; 
          background-color: ${color}; 
          border: 3px solid white; 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          position: relative;
        ">
          ${user.whatsAppProfilePictureUrl 
            ? `<img src="${user.whatsAppProfilePictureUrl}" style="
                width: 100%; 
                height: 100%; 
                border-radius: 50%; 
                object-fit: cover;
              " alt="${user.fullName}" />`
            : `<span style="color: white; font-size: 12px; font-weight: bold;">
                ${user.fullName.charAt(0).toUpperCase()}
              </span>`
          }
          ${isOnline ? `<div style="
            position: absolute;
            bottom: -2px;
            right: -2px;
            width: 12px;
            height: 12px;
            background-color: #10b981;
            border: 2px solid white;
            border-radius: 50%;
          "></div>` : ''}
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });
  };

  const handleMarkerClick = () => {
    onUserClick?.(user.id);
  };

  const handleMarkerMouseOver = () => {
    onUserHover?.(user, { x: 0, y: 0 });
  };

  const handleMarkerMouseOut = () => {
    onUserHover?.(null);
  };

  // Validate coordinates before rendering
  if (!user.latitude || !user.longitude || 
      isNaN(user.latitude) || isNaN(user.longitude) ||
      user.latitude === 0 && user.longitude === 0) {
    return null;
  }

  return (
    <Marker
      position={[user.latitude, user.longitude]}
      icon={createCustomIcon(user)}
      ref={markerRef}
      eventHandlers={{
        click: handleMarkerClick,
        mouseover: handleMarkerMouseOver,
        mouseout: handleMarkerMouseOut,
      }}
    >
      <Popup>
        <div className="p-2 min-w-[200px]">
          <div className="flex items-center space-x-3 mb-2">
            {user.whatsAppProfilePictureUrl ? (
              <img 
                src={user.whatsAppProfilePictureUrl} 
                alt={user.fullName}
                className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="font-semibold text-sm">{user.whatsAppDisplayName || user.fullName}</h3>
              <p className="text-xs text-gray-600 capitalize">{user.userType}</p>
            </div>
          </div>
          
          {user.rank && (
            <div className="mb-1">
              <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-1 rounded">
                {user.rank}
              </span>
            </div>
          )}
          
          {user.shipName && (
            <p className="text-xs text-gray-700 mb-1">
              <strong>Ship:</strong> {user.shipName}
            </p>
          )}
          
          {(user.city || user.port) && (
            <p className="text-xs text-gray-700 mb-2">
              📍 {user.city || user.port}
            </p>
          )}
          
          <button 
            onClick={handleMarkerClick}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs py-1 px-2 rounded transition-colors"
          >
            Start Chat
          </button>
        </div>
      </Popup>
    </Marker>
  );
}

export default function LeafletMap({
  users,
  userLocation,
  selectedUser,
  mapType = 'roadmap',
  onUserHover,
  onUserClick,
  onZoomChange,
  showScanElements,
  scanAngle
}: LeafletMapProps) {
  const mapRef = useRef<any>(null);
  const [center, setCenter] = useState<[number, number]>([19.0760, 72.8777]); // Default to Mumbai
  const [zoom, setZoom] = useState(9);

  // Update center when user location changes - with proper validation
  useEffect(() => {
    if (userLocation && 
        typeof userLocation.lat === 'number' && 
        typeof userLocation.lng === 'number' && 
        !isNaN(userLocation.lat) && 
        !isNaN(userLocation.lng)) {
      setCenter([userLocation.lat, userLocation.lng]);
      setZoom(Math.max(zoom, 12));
    }
  }, [userLocation]);

  // Get tile layer URL based on map type
  const getTileLayerUrl = () => {
    switch (mapType) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'hybrid':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  };

  const getTileLayerAttribution = () => {
    switch (mapType) {
      case 'satellite':
      case 'hybrid':
        return '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
      default:
        return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    }
  };

  // Map control functions
  const zoomIn = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.setZoom(mapRef.current.getZoom() + 1);
    }
  }, []);

  const zoomOut = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.setZoom(mapRef.current.getZoom() - 1);
    }
  }, []);

  const panLeft = useCallback(() => {
    if (mapRef.current) {
      const center = mapRef.current.getCenter();
      mapRef.current.panTo([center.lat, center.lng - 0.03]);
    }
  }, []);

  const panRight = useCallback(() => {
    if (mapRef.current) {
      const center = mapRef.current.getCenter();
      mapRef.current.panTo([center.lat, center.lng + 0.03]);
    }
  }, []);

  const panUp = useCallback(() => {
    if (mapRef.current) {
      const center = mapRef.current.getCenter();
      mapRef.current.panTo([center.lat + 0.03, center.lng]);
    }
  }, []);

  const panDown = useCallback(() => {
    if (mapRef.current) {
      const center = mapRef.current.getCenter();
      mapRef.current.panTo([center.lat - 0.03, center.lng]);
    }
  }, []);

  const resetToUserLocation = useCallback(() => {
    if (userLocation && 
        typeof userLocation.lat === 'number' && 
        typeof userLocation.lng === 'number' && 
        !isNaN(userLocation.lat) && 
        !isNaN(userLocation.lng) && 
        mapRef.current) {
      try {
        mapRef.current.setView([userLocation.lat, userLocation.lng], 12);
      } catch (error) {
        console.error('Error resetting map view:', error);
      }
    }
  }, [userLocation]);

  return (
    <div className="w-full h-full relative bg-gray-100">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url={getTileLayerUrl()}
          attribution={getTileLayerAttribution()}
        />
        
        {/* Add hybrid labels if needed */}
        {mapType === 'hybrid' && (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution=""
          />
        )}

        <MapController
          userLocation={userLocation}
          users={users}
          onZoomChange={onZoomChange}
          mapType={mapType}
          onUserClick={onUserClick}
          onUserHover={onUserHover}
        />

        {/* User Location Marker - with proper validation */}
        {userLocation && 
         typeof userLocation.lat === 'number' && 
         typeof userLocation.lng === 'number' && 
         !isNaN(userLocation.lat) && 
         !isNaN(userLocation.lng) && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={L.divIcon({
              className: 'user-location-marker',
              html: `
                <div style="
                  width: 20px; 
                  height: 20px; 
                  background-color: #3b82f6; 
                  border: 3px solid white; 
                  border-radius: 50%; 
                  box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
                  animation: pulse 2s infinite;
                "></div>
              `,
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })}
          >
            <Popup>
              <div className="text-center p-1">
                <p className="text-sm font-medium">Your Location</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* User Markers - with proper validation */}
        {users.filter(user => 
          user.latitude && 
          user.longitude && 
          !isNaN(user.latitude) && 
          !isNaN(user.longitude) &&
          !(user.latitude === 0 && user.longitude === 0)
        ).map(user => (
          <UserMarker
            key={user.id}
            user={user}
            onUserClick={onUserClick}
            onUserHover={onUserHover}
          />
        ))}
      </MapContainer>

      {/* Map Controls */}
      <div className="absolute bottom-4 left-4 z-[1000] flex flex-col space-y-2">
        {/* Zoom Controls */}
        <div className="flex flex-col bg-white rounded-lg shadow-lg overflow-hidden">
          <button
            onClick={zoomIn}
            className="p-2 hover:bg-gray-100 border-b border-gray-200 transition-colors"
            title="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={zoomOut}
            className="p-2 hover:bg-gray-100 transition-colors"
            title="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
        </div>

        {/* Pan Controls */}
        <div className="bg-white rounded-lg shadow-lg p-1">
          <div className="grid grid-cols-3 gap-1">
            <div></div>
            <button
              onClick={panUp}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Pan up"
            >
              <ArrowUp size={14} />
            </button>
            <div></div>
            <button
              onClick={panLeft}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Pan left"
            >
              <ArrowLeft size={14} />
            </button>
            <button
              onClick={resetToUserLocation}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Center on your location"
            >
              <Home size={14} />
            </button>
            <button
              onClick={panRight}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Pan right"
            >
              <ArrowRight size={14} />
            </button>
            <div></div>
            <button
              onClick={panDown}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Pan down"
            >
              <ArrowDown size={14} />
            </button>
            <div></div>
          </div>
        </div>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.8;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
        
        .user-location-marker {
          background: transparent !important;
          border: none !important;
        }
        
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .leaflet-popup-tip {
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}