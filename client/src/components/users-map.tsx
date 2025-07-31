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
  questionCount?: number;
  answerCount?: number;
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
  showNearbyCard?: boolean;
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

export default function UsersMap({ showUsers = false, searchQuery = "", showNearbyCard = false }: UsersMapProps) {
  const [bounds, setBounds] = useState<LatLngBounds | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [nearbyUsers, setNearbyUsers] = useState<(MapUser & { distance: number })[]>([]);
  const [mapRadius, setMapRadius] = useState<number>(50); // Initial 50km radius
  const [isAnimating, setIsAnimating] = useState(false);
  const [showDropAnimation, setShowDropAnimation] = useState(false);
  const [selectedUser, setSelectedUser] = useState<MapUser | null>(null); // Track selected user for coordinate display
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch up to 50 random users for anchor pin display
  const { data: users = [], isLoading } = useQuery<MapUser[]>({
    queryKey: ['/api/users/random'],
    staleTime: 60000, // 1 minute
    enabled: true, // Always fetch users to show pins from start
    queryFn: async () => {
      const response = await fetch('/api/users/random?limit=50');
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

  // Fetch nearby users when red dot is clicked with animation
  useEffect(() => {
    if (showNearbyCard && userLocation) {
      const fetchNearbyUsers = async () => {
        try {
          console.log(`Red dot clicked - starting animation sequence`);
          setIsAnimating(true);
          
          // Start zoom animation first
          setTimeout(() => {
            setShowDropAnimation(true);
          }, 500);
          
          console.log(`Fetching nearby users for red dot click at: ${userLocation.lat}, ${userLocation.lng}`);
          const response = await fetch(`/api/users/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&mode=proximity`);
          if (response.ok) {
            const proximityUsers = await response.json();
            console.log(`Received ${proximityUsers.length} nearby users for card display`);
            
            // Delay showing users to allow animation to complete
            setTimeout(() => {
              setNearbyUsers(proximityUsers);
              setIsAnimating(false);
            }, 2000);
          }
        } catch (error) {
          console.error('Error fetching nearby users:', error);
          setIsAnimating(false);
        }
      };
      
      fetchNearbyUsers();
    } else {
      setShowDropAnimation(false);
      setIsAnimating(false);
    }
  }, [showNearbyCard, userLocation]);

  // Set map bounds to show all random users (up to 50)
  useEffect(() => {
    if (users.length > 0) {
      const latitudes = users.map(u => u.latitude);
      const longitudes = users.map(u => u.longitude);
      
      const minLat = Math.min(...latitudes);
      const maxLat = Math.max(...latitudes);
      const minLng = Math.min(...longitudes);
      const maxLng = Math.max(...longitudes);
      
      // Add padding to show all users comfortably
      const latPadding = (maxLat - minLat) * 0.1 || 1; // Minimum padding for single points
      const lngPadding = (maxLng - minLng) * 0.1 || 1;
      
      setBounds(new LatLngBounds(
        [minLat - latPadding, minLng - lngPadding],
        [maxLat + latPadding, maxLng + lngPadding]
      ));
      
      // Set a large radius to ensure all users are "nearby"
      setMapRadius(5000); // 5000km to cover global users
    } else {
      setBounds(null);
    }
  }, [users]); // Show up to 50 random users as anchor pins

  const createCustomIcon = (user: MapUser, index: number = 0) => {
    // Green for selected user, otherwise navy blue for sailors or ocean teal for locals
    const color = selectedUser?.id === user.id ? '#22c55e' : (user.userType === 'sailor' ? '#1e3a8a' : '#0891b2');
    const animationDelay = showDropAnimation ? `${index * 0.1}s` : '0s';
    
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
          animation: ${showDropAnimation ? `anchorDrop 1.2s cubic-bezier(0.68, -0.55, 0.265, 1.55) ${animationDelay} forwards` : 'none'};
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

  // Fallback function to calculate nearest users from the displayed users (for compatibility)
  const getNearestUsers = (count: number = 9): (MapUser & { distance: number })[] => {
    if (!userLocation || !showNearbyCard) return [];
    
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

  // Use fetched nearby users when available, fallback to calculated nearest users
  const nearestUsers = nearbyUsers.length > 0 ? nearbyUsers : getNearestUsers();

  return (
    <div className="w-full h-full overflow-hidden bg-gray-100 relative">
      {/* Custom CSS for anchor drop animation */}
      <style>
        {`
          @keyframes anchorDrop {
            0% {
              transform: translateY(-200vh) scale(0) rotate(360deg);
              opacity: 0;
            }
            50% {
              transform: translateY(-20px) scale(1.3) rotate(180deg);
              opacity: 0.8;
            }
            70% {
              transform: translateY(30px) scale(1.1) rotate(45deg);
              opacity: 1;
            }
            85% {
              transform: translateY(-10px) scale(1.05) rotate(10deg);
              opacity: 1;
            }
            100% {
              transform: translateY(0) scale(1) rotate(0deg);
              opacity: 1;
            }
          }
          
          .anchor-drop-animation {
            animation: anchorDrop 1.2s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
          }
          
          .custom-anchor-marker {
            transition: all 0.3s ease;
          }
          
          .custom-anchor-marker:hover {
            transform: scale(1.1);
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
          }
          
          @keyframes slideInFromBottom {
            0% {
              transform: translateY(100px);
              opacity: 0;
            }
            100% {
              transform: translateY(0);
              opacity: 1;
            }
          }
          
          .animate-in {
            animation: slideInFromBottom 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          
          @keyframes pulse {
            0% {
              transform: scale(1);
              box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
            }
            70% {
              transform: scale(1.05);
              box-shadow: 0 0 0 30px rgba(239, 68, 68, 0);
            }
            100% {
              transform: scale(1);
              box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
            }
          }
          
          @keyframes mapZoom {
            0% { transform: scale(1); }
            50% { transform: scale(1.3); }
            100% { transform: scale(1); }
          }
        `}
      </style>
      {/* Coordinates Display Panel */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-gray-500/80 backdrop-blur-sm px-4 py-2 rounded-lg min-w-[280px]">
        {selectedUser ? (
          <div className="text-white text-center">
            <div className="text-sm font-medium">{selectedUser.fullName}</div>
            <div className="font-mono text-xs mt-1">
              {selectedUser.latitude.toFixed(6)}, {selectedUser.longitude.toFixed(6)}
            </div>
          </div>
        ) : userLocation ? (
          <div className="text-white text-center">
            <div className="text-sm font-medium">Your Location</div>
            <div className="font-mono text-xs mt-1">
              {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
            </div>
          </div>
        ) : (
          <div className="text-white text-center text-sm">Location Loading...</div>
        )}
      </div>
      
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="w-full h-full"
        bounds={showNearbyCard && bounds ? bounds : undefined}
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
        {userLocation && !showNearbyCard && (
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
                  // Start epic zoom and animation sequence
                  this.classList.add('clicked');
                  
                  // Add zoom animation to entire map container
                  const mapContainer = document.querySelector('.leaflet-container');
                  if (mapContainer) {
                    mapContainer.style.transition = 'transform 2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                    mapContainer.style.transform = 'scale(1.5)';
                    
                    // Reset zoom after animation
                    setTimeout(() => {
                      mapContainer.style.transform = 'scale(1)';
                      mapContainer.style.transition = '';
                    }, 3000);
                  }
                  
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
                  
                  // Create spectacular ripple effect from user location
                  const userMarker = this;
                  userMarker.style.transform = 'scale(1.5)';
                  userMarker.style.boxShadow = '0 0 0 0 rgba(239, 68, 68, 0.7)';
                  userMarker.style.animation = 'pulse 2s infinite';
                  
                  // Reset user marker after animation
                  setTimeout(() => {
                    userMarker.style.transform = 'scale(1)';
                    userMarker.style.animation = 'none';
                  }, 4000);
                  
                  // Trigger the search functionality after animation completes
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
                      font-family: 'Arial Rounded MT Bold', 'Helvetica Rounded', Arial, sans-serif;
                      text-align: center;
                      animation: koihaiGrow 2s ease-out 1s forwards;
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
                        font-family: 'Arial Rounded MT Bold', 'Helvetica Rounded', Arial, sans-serif;
                      }
                      15% { 
                        opacity: 1; 
                        transform: translate(-50%, -50%) scale(1);
                        font-size: 10px;
                        font-family: 'Arial Rounded MT Bold', 'Helvetica Rounded', Arial, sans-serif;
                      }
                      40% { 
                        opacity: 0.8; 
                        transform: translate(-50%, -50%) scale(2);
                        font-size: 16px;
                        font-family: 'Arial Rounded MT Bold', 'Helvetica Rounded', Arial, sans-serif;
                      }
                      70% { 
                        opacity: 0.5; 
                        transform: translate(-50%, -50%) scale(3);
                        font-size: 20px;
                        font-family: 'Arial Rounded MT Bold', 'Helvetica Rounded', Arial, sans-serif;
                      }
                      100% { 
                        opacity: 0; 
                        transform: translate(-50%, -50%) scale(4);
                        font-size: 24px;
                        font-family: 'Arial Rounded MT Bold', 'Helvetica Rounded', Arial, sans-serif;
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
          />
        )}
        

        

        
        {!isLoading && users.map((user, index) => (
          <Marker
            key={user.id}
            position={[user.latitude, user.longitude]}
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

      {/* Animated User Cards List at Bottom */}
      {showNearbyCard && nearestUsers.length > 0 && (
        <div className={`absolute bottom-4 left-4 right-4 z-[1000] transition-all duration-1000 ${
          isAnimating ? 'transform translate-y-full opacity-0' : 'transform translate-y-0 opacity-100'
        }`}>
          <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-2xl p-4 max-h-40 overflow-y-auto border border-white/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800 flex items-center">
                <span className="mr-2 text-lg">⚓</span>
                Nearby Maritime Professionals
              </h3>
              <div className="text-xs text-gray-500 bg-blue-100 px-2 py-1 rounded-full">
                {nearestUsers.length} found
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {nearestUsers.map((user, index) => (
                <div
                  key={user.id}
                  onClick={() => {
                    if (selectedUser?.id === user.id) {
                      setSelectedUser(null);
                    } else {
                      setSelectedUser(user);
                    }
                  }}
                  className={`p-3 rounded-lg cursor-pointer transition-all duration-300 transform hover:scale-105 animate-in slide-in-from-bottom ${
                    selectedUser?.id === user.id 
                      ? 'bg-gradient-to-br from-green-100 to-green-200 border-2 border-green-500 shadow-lg' 
                      : 'bg-gradient-to-br from-white/70 to-white/50 hover:from-white/90 hover:to-white/70 border border-gray-200 shadow-md'
                  }`}
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animationDuration: '600ms'
                  }}
                >
                  <div className="text-xs font-bold text-gray-900 truncate mb-1">
                    {user.fullName}
                  </div>
                  <div className="text-xs text-gray-600 truncate mb-1">
                    {user.rank ? getRankAbbreviation(user.rank) : 'Maritime Professional'}
                    {user.questionCount !== undefined && 
                      <span className="text-blue-600 font-bold ml-1 bg-blue-50 px-1 rounded">
                        {user.questionCount}Q
                      </span>
                    }
                  </div>
                  <div className="text-xs text-gray-500 font-medium">
                    📍 {user.distance?.toFixed(1)}km away
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loading Animation Overlay */}
      {isAnimating && (
        <div className="absolute inset-0 z-[1001] bg-black/20 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white/95 rounded-xl p-6 shadow-2xl text-center">
            <div className="text-4xl mb-4 animate-bounce">⚓</div>
            <div className="text-lg font-bold text-gray-800 mb-2">Discovering Maritime Professionals</div>
            <div className="text-sm text-gray-600">Calculating distances and finding nearby sailors...</div>
            <div className="mt-4 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}