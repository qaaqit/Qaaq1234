import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { LatLngBounds, divIcon } from 'leaflet';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import MarineChatButton from './marine-chat-button';

interface MapUser {
  id: string;
  fullName: string;
  userType: string;
  rank: string | null;
  shipName: string | null;
  company?: string | null;  // Add company field
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
    // Handle database enum values (with underscores)
    'chief_engineer': 'CE',
    'second_engineer': '2E',
    'third_engineer': '3E',
    'fourth_engineer': '4E',
    'junior_engineer': 'JE',
    'engine_cadet': 'E/C',
    'deck_cadet': 'D/C',
    'electrical_engineer': 'ETO',
    'master': 'CAPT',
    'chief_officer': 'C/O',
    'second_officer': '2/O',
    'third_officer': '3/O',
    'trainee': 'TRN',
    'other': 'OTHER',
    // Handle space-separated values
    'captain': 'CAPT',
    'chief engineer': 'CE',
    'chief officer': 'CO',
    'first engineer': '1E',
    'first officer': '1O',
    'second engineer': '2E',
    'second officer': '2O',
    'third engineer': '3E',
    'third officer': '3O',
    'fourth engineer': '4E',
    'fourth officer': '4O',
    'bosun': 'BSN',
    'able seaman': 'AB',
    'ordinary seaman': 'OS',
    'oiler': 'OLR',
    'wiper': 'WPR',
    'cook': 'CK',
    'steward': 'STW',
    'radio officer': 'RO',
    'electrician': 'ELE',
    'fitter': 'FIT',
    'officer': 'OFF',
    'engineer': 'ENG',
    'crew': 'CREW'
  };
  
  const lowerRank = rank.toLowerCase().trim();
  
  // Direct match first
  if (abbreviations[lowerRank]) {
    return abbreviations[lowerRank];
  }
  
  // Partial match fallback
  for (const [key, value] of Object.entries(abbreviations)) {
    if (lowerRank.includes(key)) {
      return value;
    }
  }
  
  // If no match, try to extract key parts and abbreviate
  if (lowerRank.includes('engineer')) {
    if (lowerRank.includes('chief')) return 'CE';
    if (lowerRank.includes('second') || lowerRank.includes('2nd')) return '2E';
    if (lowerRank.includes('third') || lowerRank.includes('3rd')) return '3E';
    if (lowerRank.includes('fourth') || lowerRank.includes('4th')) return '4E';
    return 'ENG';
  }
  
  if (lowerRank.includes('officer')) {
    if (lowerRank.includes('chief')) return 'CO';
    if (lowerRank.includes('first') || lowerRank.includes('1st')) return '1O';
    if (lowerRank.includes('second') || lowerRank.includes('2nd')) return '2O';
    if (lowerRank.includes('third') || lowerRank.includes('3rd')) return '3O';
    return 'OFF';
  }
  
  return rank.toUpperCase(); // Return original in uppercase if no match found
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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
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

  // Get user's current location
  useEffect(() => {
    if (user?.id && !userLocation) {
      // Try to get user's location from browser geolocation first
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => {
            console.log('Geolocation error, using fallback:', error);
            // Fallback: Use Mumbai coordinates for demo
            setUserLocation({ lat: 19.076, lng: 72.8777 });
          },
          { timeout: 5000, enableHighAccuracy: false }
        );
      } else {
        // No geolocation support, use Mumbai as fallback
        setUserLocation({ lat: 19.076, lng: 72.8777 });
      }
    }
  }, [user?.id, userLocation]);

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
    // Green for selected user, otherwise navy blue for sailors or ocean teal for locals
    const color = selectedUserId === user.id ? '#22c55e' : (user.userType === 'sailor' ? '#1e3a8a' : '#0891b2');
    
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

  // Use user location as default center, fallback to Mumbai
  const defaultCenter: [number, number] = userLocation ? [userLocation.lat, userLocation.lng] : [19.076, 72.8777];
  const defaultZoom = 9; // Always use zoom level 9 for 50km radius view

  // Get nearest 9 users for the cards list
  const getNearestUsers = (count: number = 9): (MapUser & { distance: number })[] => {
    if (!userLocation || !showUsers) return [];
    
    return users
      .map(user => ({
        ...user,
        distance: calculateDistance(
          userLocation.lat, userLocation.lng,
          user.latitude, user.longitude
        )
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, count);
  };

  const nearestUsers = getNearestUsers();

  return (
    <div className="w-full h-full overflow-hidden bg-gray-100 relative">
      {/* Location Coordinates Overlay */}
      {userLocation && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-black/40 backdrop-blur-sm px-3 py-2 rounded-lg">
          <div className="text-white font-mono text-sm">
            {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
          </div>
        </div>
      )}
      
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="w-full h-full"
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
        
        {/* Scanning radar animation overlaid on user's location */}
        {userLocation && !showUsers && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={divIcon({
              html: `
                <div style="
                  width: 0px;
                  height: 0px;
                  position: relative;
                  pointer-events: none;
                ">
                  <!-- Rotating scan line from user center -->
                  <div style="
                    position: absolute;
                    top: 0px;
                    left: 0px;
                    width: 2px;
                    height: 120px;
                    background: linear-gradient(to bottom, rgba(8,145,178,0.8), transparent);
                    transform-origin: 1px 0px;
                    transform: rotate(0deg);
                    animation: radarScan 4s linear infinite;
                  "></div>
                  

                  
                  <!-- Koi Hai text -->
                  <div style="
                    position: absolute;
                    top: 130px;
                    left: -25px;
                    color: rgba(128,128,128,0.7);
                    font-size: 10px;
                    font-weight: bold;
                    text-shadow: 0 1px 2px rgba(255,255,255,0.8);
                    animation: koihaiRadar 8s linear infinite;
                    animation-delay: 8s;
                  ">Koi Hai...</div>
                  
                  <style>
                    @keyframes radarScan {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                    
                    @keyframes koihaiRadar {
                      0%, 87% { opacity: 0; }
                      88%, 100% { opacity: 1; }
                    }
                  </style>
                </div>
              `,
              className: 'radar-animation',
              iconSize: [0, 0],
              iconAnchor: [0, 0],
            })}
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
                  cursor: pointer;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                  position: relative;
                " 
                title="Press to see Who's there?"
                onclick="
                  // Start 1234 animation and trigger search
                  this.classList.add('clicked');
                  
                  // Stop the scanner animation
                  const scanner = document.querySelector('.radar-animation');
                  if (scanner) {
                    scanner.style.display = 'none';
                  }
                  
                  // Start the sequence
                  const koihaiAnimation = this.querySelector('.koihai-sequence');
                  if (koihaiAnimation) {
                    koihaiAnimation.style.display = 'block';
                  }
                  
                  // Trigger the search functionality after a brief delay
                  setTimeout(() => {
                    window.location.href = window.location.href.includes('#') ? window.location.href : window.location.href + '#koi-hai';
                  }, 6000);
                ">
                  📍
                  
                  <!-- 1234 Animation and Koi Hai Sequence -->
                  <div class="koihai-sequence" style="
                    display: none;
                    position: absolute;
                    top: -20px;
                    left: -20px;
                    width: 80px;
                    height: 80px;
                    pointer-events: none;
                  ">
                    <!-- 1234 Counter Animation -->
                    <div class="counter-1234" style="
                      position: absolute;
                      top: 50%;
                      left: 50%;
                      transform: translate(-50%, -50%);
                      color: #ef4444;
                      font-size: 14px;
                      font-weight: bold;
                      font-family: monospace;
                      animation: counter1234 2s ease-in-out;
                      z-index: 10;
                    ">1</div>
                    
                    <!-- Koi Hai Circle Animation -->
                    <div class="koihai-circle" style="
                      position: absolute;
                      top: 50%;
                      left: 50%;
                      transform: translate(-50%, -50%);
                      color: rgba(239, 68, 68, 0.8);
                      font-size: 8px;
                      font-weight: bold;
                      text-align: center;
                      animation: koihaiGrow 4s ease-out 2s forwards;
                      animation-delay: 2s;
                      opacity: 0;
                    ">Koi Hai...</div>
                  </div>
                  
                  <style>
                    @keyframes counter1234 {
                      0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                      20% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); content: '1'; }
                      25% { content: '2'; }
                      50% { content: '2'; }
                      55% { content: '3'; }
                      75% { content: '3'; }
                      80% { content: '4'; }
                      95% { content: '4'; }
                      100% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                    }
                    
                    @keyframes koihaiGrow {
                      0% { 
                        opacity: 0; 
                        transform: translate(-50%, -50%) scale(0.5);
                        font-size: 8px;
                      }
                      20% { 
                        opacity: 1; 
                        transform: translate(-50%, -50%) scale(1);
                        font-size: 10px;
                      }
                      60% { 
                        opacity: 0.8; 
                        transform: translate(-50%, -50%) scale(2);
                        font-size: 16px;
                      }
                      80% { 
                        opacity: 0.4; 
                        transform: translate(-50%, -50%) scale(3);
                        font-size: 20px;
                      }
                      100% { 
                        opacity: 0; 
                        transform: translate(-50%, -50%) scale(4);
                        font-size: 24px;
                      }
                    }
                    
                    /* Counter text content animation using CSS counters */
                    .counter-1234::before {
                      content: counter(count-animation);
                      counter-reset: count-animation 1;
                      animation: count-sequence 2s steps(4) infinite;
                    }
                    
                    @keyframes count-sequence {
                      0% { counter-increment: count-animation 0; }
                      25% { counter-increment: count-animation 1; }
                      50% { counter-increment: count-animation 2; }
                      75% { counter-increment: count-animation 3; }
                      100% { counter-increment: count-animation 4; }
                    }
                  </style>
                </div>
                
                <script>
                  (function() {
                    const counter = document.querySelector('.counter-1234');
                    if (counter && !counter.dataset.initialized) {
                      counter.dataset.initialized = 'true';
                      let count = 1;
                      const interval = setInterval(() => {
                        counter.textContent = count;
                        count++;
                        if (count > 4) {
                          clearInterval(interval);
                          counter.style.opacity = '0';
                        }
                      }, 500);
                    }
                  })();
                </script>
              `,
              className: 'user-location-marker animated-pin',
              iconSize: [40, 40],
              iconAnchor: [20, 20],
            })}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-red-600">Your Location</h3>
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
              <div className="p-2 min-w-[200px]">
                <h3 className="font-bold text-gray-900 mb-2">
                  {user.fullName} {user.rank && user.rank !== '' && `(${getRankAbbreviation(user.rank)})`}
                </h3>
                {/* Last Company */}
                {user.company && user.company !== '' && (
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Last Company:</span> {user.company}
                  </p>
                )}
                {/* Last Ship */}
                {user.shipName && user.shipName !== '' && (
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Last Ship:</span> {user.shipName}
                  </p>
                )}
                {/* Show distance from user if user location available */}
                {userLocation && (
                  <p className="text-xs text-gray-500 mt-2 pt-2 border-t">
                    {calculateDistance(
                      userLocation.lat, userLocation.lng,
                      user.latitude, user.longitude
                    ).toFixed(1)}km away
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
        ))}
      </MapContainer>

      {/* Transparent User Cards List at Bottom */}
      {showUsers && nearestUsers.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 z-[1000]">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-3 max-h-32 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Nearby Maritime Professionals</h3>
            <div className="grid grid-cols-3 gap-2">
              {nearestUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUserId(selectedUserId === user.id ? null : user.id)}
                  className={`p-2 rounded-md cursor-pointer transition-all ${
                    selectedUserId === user.id 
                      ? 'bg-green-100 border-2 border-green-500' 
                      : 'bg-white/50 hover:bg-white/70 border border-gray-200'
                  }`}
                >
                  <div className="text-xs font-medium text-gray-900 truncate">
                    {user.fullName}
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    {user.rank ? getRankAbbreviation(user.rank) : 'Maritime Professional'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {user.distance?.toFixed(1)}km away
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}