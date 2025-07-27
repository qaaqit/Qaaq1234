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
  city: string | null;
  country: string | null;
  latitude: string;
  longitude: string;
}

export default function UsersMap() {
  const [bounds, setBounds] = useState<LatLngBounds | null>(null);

  const { data: users = [], isLoading } = useQuery<MapUser[]>({
    queryKey: ['/api/users/map'],
    staleTime: 60000, // 1 minute
  });

  useEffect(() => {
    if (users.length > 0) {
      // Calculate bounds to fit all users
      const latitudes = users.map(u => parseFloat(u.latitude));
      const longitudes = users.map(u => parseFloat(u.longitude));
      
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
    }
  }, [users]);

  const createCustomIcon = (user: MapUser) => {
    const rankEmoji = user.rank?.toLowerCase().includes('captain') ? '👨‍✈️' : 
                      user.rank?.toLowerCase().includes('chief') ? '👷' :
                      user.rank?.toLowerCase().includes('officer') ? '👮' : '⚓';
    
    const bgColor = user.userType === 'sailor' ? '#1e3a8a' : '#0891b2';
    
    return divIcon({
      html: `
        <div style="
          background: ${bgColor};
          color: white;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          ${rankEmoji}
        </div>
      `,
      className: 'custom-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  };

  if (isLoading) {
    return (
      <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">Loading map...</div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">No users with location data available</div>
      </div>
    );
  }

  // Default center (world view)
  const defaultCenter: [number, number] = [20, 0];
  const defaultZoom = 2;

  return (
    <div className="w-full h-96 rounded-lg overflow-hidden maritime-shadow">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="w-full h-full"
        bounds={bounds || undefined}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {users.map((user) => (
          <Marker
            key={user.id}
            position={[parseFloat(user.latitude), parseFloat(user.longitude)]}
            icon={createCustomIcon(user)}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-gray-900">{user.fullName}</h3>
                {user.rank && (
                  <p className="text-sm text-gray-600">Rank: {user.rank}</p>
                )}
                <p className="text-sm text-gray-600">
                  Type: {user.userType === 'sailor' ? '🚢 Sailor' : '🏠 Local'}
                </p>
                {user.city && user.country && (
                  <p className="text-sm text-gray-600">
                    📍 {user.city}, {user.country}
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