import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { LatLngBounds, divIcon } from 'leaflet';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

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

export default function UsersMap({ showUsers = false, searchQuery = "" }: UsersMapProps) {
  const [bounds, setBounds] = useState<LatLngBounds | null>(null);

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

  useEffect(() => {
    if (showUsers && users.length > 0) {
      // Calculate bounds to fit all users
      const latitudes = users.map(u => u.latitude);
      const longitudes = users.map(u => u.longitude);
      
      const minLat = Math.min(...latitudes);
      const maxLat = Math.max(...latitudes);
      const minLng = Math.min(...longitudes);
      const maxLng = Math.max(...longitudes);
      
      // Add padding to bounds
      const latPadding = (maxLat - minLat) * 0.1;
      const lngPadding = (maxLng - minLng) * 0.1;
      
      setBounds(new LatLngBounds(
        [minLat - latPadding, minLng - lngPadding],
        [maxLat + latPadding, maxLng + lngPadding]
      ));
    } else {
      setBounds(null);
    }
  }, [users, showUsers]);

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

  // Default center (world view)
  const defaultCenter: [number, number] = [20, 0];
  const defaultZoom = 2;

  return (
    <div className="w-full h-full overflow-hidden bg-gray-100">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="w-full h-full"
        bounds={bounds || undefined}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
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
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}