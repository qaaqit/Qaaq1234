import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { divIcon, type LatLngBounds } from "leaflet";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import MarineChatButton from "@/components/marine-chat-button";
import "leaflet/dist/leaflet.css";

interface MapUser {
  id: string;
  fullName: string;
  rank?: string;
  company?: string;
  shipName?: string;
  latitude: number;
  longitude: number;
  deviceLatitude?: number;
  deviceLongitude?: number;
  isOnline?: boolean;
}

interface UsersMapProps {
  showUsers?: boolean;
  searchQuery?: string;
  showNearbyCard?: boolean;
  onRedDotClick?: () => void;
}

// Get rank abbreviation for display
const getRankAbbreviation = (rank: string): string => {
  if (!rank || rank === '') return '';
  
  const lowerRank = rank.toLowerCase();
  
  // Maritime Officer Ranks
  if (lowerRank.includes('captain') || lowerRank.includes('master')) return 'CAPT';
  if (lowerRank.includes('chief officer') || lowerRank.includes('c/o') || lowerRank.includes('chief mate')) return 'CO';
  if (lowerRank.includes('second officer') || lowerRank.includes('2/o') || lowerRank.includes('second mate')) return '2O';
  if (lowerRank.includes('third officer') || lowerRank.includes('3/o') || lowerRank.includes('third mate')) return '3O';
  
  // Maritime Engineer Ranks
  if (lowerRank.includes('chief engineer') || lowerRank.includes('c/e')) return 'CE';
  if (lowerRank.includes('second engineer') || lowerRank.includes('2/e')) return '2E';
  if (lowerRank.includes('third engineer') || lowerRank.includes('3/e')) return '3E';
  if (lowerRank.includes('fourth engineer') || lowerRank.includes('4/e')) return '4E';
  
  // Maritime Cadets and Others
  if (lowerRank.includes('deck cadet') || lowerRank.includes('d/c')) return 'D/C';
  if (lowerRank.includes('engine cadet') || lowerRank.includes('e/c')) return 'E/C';
  if (lowerRank.includes('electrical officer') || lowerRank.includes('eto')) return 'ETO';
  if (lowerRank.includes('bosun') || lowerRank.includes('boatswain')) return 'BOSN';
  if (lowerRank.includes('able seaman') || lowerRank.includes('a.b')) return 'AB';
  if (lowerRank.includes('ordinary seaman') || lowerRank.includes('o.s')) return 'OS';
  if (lowerRank.includes('oiler')) return 'OILER';
  if (lowerRank.includes('wiper')) return 'WIPER';
  if (lowerRank.includes('fitter')) return 'FITR';
  if (lowerRank.includes('cook')) return 'COOK';
  if (lowerRank.includes('steward')) return 'STWD';
  
  // Generic fallbacks
  if (lowerRank.includes('officer')) {
    if (lowerRank.includes('chief')) return 'CO';
    if (lowerRank.includes('first') || lowerRank.includes('1st')) return '1O';
    if (lowerRank.includes('second') || lowerRank.includes('2nd')) return '2O';
    if (lowerRank.includes('third') || lowerRank.includes('3rd')) return '3O';
    return 'OFF';
  }
  
  return rank.toUpperCase(); // Return original in uppercase if no match found
};

export default function UsersMapSimple({ showUsers = false, searchQuery = "", showNearbyCard = false, onRedDotClick }: UsersMapProps) {
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [selectedUser, setSelectedUser] = useState<MapUser | null>(null);
  const { user } = useAuth();

  // Fetch all users for display on map
  const { data: users = [], isLoading } = useQuery<MapUser[]>({
    queryKey: ['/api/users/all'],
    staleTime: 60000, // 1 minute
    enabled: true,
    queryFn: async () => {
      const response = await fetch('/api/users/random?limit=100'); // Get more users
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    }
  });

  // Get user's current location
  useEffect(() => {
    if (user?.id && !userLocation) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          () => {
            // Fallback to Mumbai coordinates
            setUserLocation({
              lat: 19.1536,
              lng: 72.8327
            });
          }
        );
      } else {
        setUserLocation({
          lat: 19.1536,
          lng: 72.8327
        });
      }
    }
  }, [user?.id]);

  // Scatter overlapping pins by ±50km unless device location is available
  const scatterPin = (user: MapUser, baseLatitude: number, baseLongitude: number) => {
    // If user has device location or is online, don't scatter
    if (user.isOnline || user.deviceLatitude || user.deviceLongitude) {
      return {
        lat: user.deviceLatitude || user.latitude,
        lng: user.deviceLongitude || user.longitude
      };
    }
    
    // Check if multiple users at same location - scatter them
    const sameLocationUsers = users.filter(u => 
      Math.abs(u.latitude - baseLatitude) < 0.001 && 
      Math.abs(u.longitude - baseLongitude) < 0.001
    );
    
    if (sameLocationUsers.length > 1) {
      // Add random offset within 50km (approximately 0.45 degrees)
      const offsetLat = (Math.random() - 0.5) * 0.9; // ±0.45 degrees ≈ ±50km
      const offsetLng = (Math.random() - 0.5) * 0.9;
      
      return {
        lat: baseLatitude + offsetLat,
        lng: baseLongitude + offsetLng
      };
    }
    
    return { lat: baseLatitude, lng: baseLongitude };
  };

  // Create custom icon for user markers
  const createCustomIcon = (user: MapUser, index: number) => {
    const position = scatterPin(user, user.latitude, user.longitude);
    const rankAbbr = getRankAbbreviation(user.rank || '');
    const isOnline = user.isOnline || user.deviceLatitude || user.deviceLongitude;
    
    return divIcon({
      html: `
        <div style="
          width: 30px;
          height: 30px;
          background: ${isOnline ? '#10b981' : '#3b82f6'}; 
          border: 2px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          color: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          cursor: pointer;
        ">
          ⚓
        </div>
      `,
      className: 'custom-anchor-marker',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-lg">Loading maritime professionals...</div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[20, 0]} // World center view
        zoom={2}
        className="w-full h-full"
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        {/* Show user's current location pin */}
        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={divIcon({
              html: `
                <div style="
                  width: 24px;
                  height: 24px;
                  background: #ef4444;
                  border: 3px solid white;
                  border-radius: 50%;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                  cursor: pointer;
                " 
                title="Your location">
                  📍
                </div>
              `,
              className: 'user-location-marker',
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            })}
          />
        )}

        {/* Show all users as anchor markers */}
        {!isLoading && users.map((user, index) => {
          const position = scatterPin(user, user.latitude, user.longitude);
          return (
            <Marker
              key={user.id}
              position={[position.lat, position.lng]}
              icon={createCustomIcon(user, index)}
              eventHandlers={{
                click: () => {
                  setSelectedUser(user);
                }
              }}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-bold text-gray-900 mb-2">
                    {user.fullName} {user.rank && user.rank !== '' && `(${getRankAbbreviation(user.rank)})`}
                  </h3>
                  {user.company && user.company !== '' && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Company:</span> {user.company}
                    </p>
                  )}
                  {user.shipName && user.shipName !== '' && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Ship:</span> {user.shipName}
                    </p>
                  )}
                  
                  {/* Marine Chat Button */}
                  <div className="mt-3 pt-2 border-t">
                    <MarineChatButton
                      receiverId={user.id}
                      receiverName={user.fullName}
                      receiverRank={user.rank || undefined}
                      size="sm"
                      variant="marine"
                    />
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}