import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { LatLngBounds, divIcon } from 'leaflet';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';

interface MapUser {
  id: string;
  fullName: string;
  userType: string;
  rank: string | null;
  shipName: string | null;
  imoNumber: string | null;
  port: string | null;
  visitWindow: string | null;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
}

const getRankAbbreviation = (rank: string): string => {
  const abbreviations: { [key: string]: string } = {
    'captain': 'CAPT',
    'chief engineer': 'CE',
    'chief officer': 'CO',
    'first officer': 'FO',
    'second engineer': '2E',
    'second officer': '2O',
    'third engineer': '3E',
    'third officer': '3O',
    'bosun': 'BSN',
    'officer': 'OFF',
    'engineer': 'ENG',
    'crew': 'CREW'
  };
  
  const lowerRank = rank.toLowerCase();
  for (const [key, value] of Object.entries(abbreviations)) {
    if (lowerRank.includes(key)) {
      return value;
    }
  }
  return rank; // Return original if no match found
};

interface UsersMapProps {
  showUsers?: boolean;
  searchQuery?: string;
}

// Haversine formula to calculate distance between two points
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

export default function UsersMap({ showUsers = false, searchQuery = "" }: UsersMapProps) {
  const [bounds, setBounds] = useState<LatLngBounds | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [mapRadius, setMapRadius] = useState<number>(50); // Initial 50km radius
  const { user } = useAuth();

  // Always show all users from QAAQ database when "Koi Hai?" is clicked
  const { data: users = [], isLoading } = useQuery<MapUser[]>({
    queryKey: ['/api/users/map'],
    staleTime: 60000, // 1 minute
    enabled: showUsers, // Only fetch when showUsers is true
    queryFn: async () => {
      const response = await fetch('/api/users/map');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    }
  });

  // Get user's current location (always, not just when showUsers is true)
  useEffect(() => {
    if (user?.id) {
      // Try to get user's location from browser geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userPos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setUserLocation(userPos);
          },
          (error) => {
            console.log('Geolocation error:', error);
            // Fallback: try to find user's location from the users list
            if (users.length > 0) {
              const currentUser = users.find(u => u.id === user.id);
              if (currentUser) {
                setUserLocation({ lat: currentUser.latitude, lng: currentUser.longitude });
              }
            }
          }
        );
      }
    }
  }, [user?.id, users]);

  // Smart zoom logic: center on user with expanding radius to show at least 9 pins
  useEffect(() => {
    if (showUsers && users.length > 0 && userLocation) {
      let currentRadius = 50; // Start with 50km
      let nearbyUsers = [];
      
      // Keep expanding radius until we have at least 9 users or reach 500km max
      while (nearbyUsers.length < 9 && currentRadius <= 500) {
        nearbyUsers = users.filter(u => {
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
      
      setBounds(new LatLngBounds(
        [userLocation.lat - latDelta, userLocation.lng - lngDelta],
        [userLocation.lat + latDelta, userLocation.lng + lngDelta]
      ));
    } else if (showUsers && users.length > 0 && !userLocation) {
      // Fallback: show all users if no user location available
      const latitudes = users.map(u => u.latitude);
      const longitudes = users.map(u => u.longitude);
      
      const minLat = Math.min(...latitudes);
      const maxLat = Math.max(...latitudes);
      const minLng = Math.min(...longitudes);
      const maxLng = Math.max(...longitudes);
      
      const latPadding = (maxLat - minLat) * 0.1;
      const lngPadding = (maxLng - minLng) * 0.1;
      
      setBounds(new LatLngBounds(
        [minLat - latPadding, minLng - lngPadding],
        [maxLat + latPadding, maxLng + lngPadding]
      ));
    } else {
      setBounds(null);
    }
  }, [users, showUsers, userLocation]);

  const createCustomIcon = (user: MapUser) => {
    const color = user.userType === 'sailor' ? '#1e3a8a' : '#0891b2'; // navy blue for sailors, ocean teal for locals
    
    return divIcon({
      html: `
        <div style="
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${color};
          font-size: 24px;
          text-shadow: 1px 1px 2px rgba(255,255,255,0.9), -1px -1px 2px rgba(255,255,255,0.9);
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
        ">
          ⚓
        </div>
      `,
      className: 'custom-anchor-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  // Use user location as default center, fallback to world view
  const defaultCenter: [number, number] = userLocation ? [userLocation.lat, userLocation.lng] : [20, 0];
  const defaultZoom = userLocation ? 9 : 2; // Zoom level 9 shows roughly 50km radius

  return (
    <div className="w-full h-full overflow-hidden bg-gray-100">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="w-full h-full"
        key={userLocation ? `${userLocation.lat}-${userLocation.lng}` : 'world'} // Force re-render when user location changes
        bounds={showUsers && bounds ? bounds : undefined}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        {/* Show radius circle around user's location (always visible when user location is available) */}
        {userLocation && (
          <Circle
            center={[userLocation.lat, userLocation.lng]}
            radius={mapRadius * 1000} // Convert km to meters
            color="#0891b2"
            fillColor="#0891b2"
            fillOpacity={0.1}
            weight={2}
            dashArray="5, 5"
          />
        )}
        
        {/* Show user's current location pin (always visible when user location is available) */}
        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={divIcon({
              html: `
                <div style="
                  width: 40px;
                  height: 40px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  background: #ef4444;
                  border: 3px solid white;
                  border-radius: 50%;
                  color: white;
                  font-size: 20px;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                ">
                  📍
                </div>
              `,
              className: 'user-location-marker',
              iconSize: [40, 40],
              iconAnchor: [20, 20],
            })}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-red-600">Your Location</h3>
                <p className="text-sm text-gray-600">Search Radius: {mapRadius}km</p>
              </div>
            </Popup>
          </Marker>
        )}
        
        {showUsers && !isLoading && users.map((user) => (
          <Marker
            key={user.id}
            position={[user.latitude, user.longitude]}
            icon={createCustomIcon(user)}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-gray-900">{user.fullName}</h3>
                {user.rank && (
                  <p className="text-sm text-gray-600">
                    {getRankAbbreviation(user.rank)}
                    {user.shipName && (
                      <span className="ml-2 text-blue-600 italic">
                        {user.shipName.replace(/^(MV|MT)\s+/, '')}
                      </span>
                    )}
                  </p>
                )}
                {user.port && (
                  <p className="text-sm text-gray-600">
                    📍 {user.port}
                    {user.visitWindow && (
                      <span className="ml-2 text-green-600">
                        ({user.visitWindow})
                      </span>
                    )}
                  </p>
                )}
                {/* Show distance from user if user location available */}
                {userLocation && (
                  <p className="text-xs text-gray-500 mt-1">
                    {calculateDistance(
                      userLocation.lat, userLocation.lng,
                      user.latitude, user.longitude
                    ).toFixed(1)}km away
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}