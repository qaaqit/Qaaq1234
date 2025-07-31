import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { LatLngBounds, divIcon } from 'leaflet';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import MarineChatButton from './marine-chat-button';
import SingleMessageChat from './single-message-chat';

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
  deviceLatitude?: number | null;  // Precise location for online users
  deviceLongitude?: number | null; // Precise location for online users
  locationUpdatedAt?: Date | string | null; // Track when location was last updated
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
  const [selectedUser, setSelectedUser] = useState<MapUser | null>(null); // Track selected user for coordinate display
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [hoveredUser, setHoveredUser] = useState<MapUser | null>(null); // Track hovered user for card display
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null); // Track mouse position for card
  const [openChatUserId, setOpenChatUserId] = useState<string | null>(null); // Track opened chat window
  const { user } = useAuth();

  // Fetch up to 100 random users for anchor pin display (global distribution)
  const { data: users = [], isLoading } = useQuery<MapUser[]>({
    queryKey: ['/api/users/random'],
    staleTime: 60000, // 1 minute
    enabled: true, // Always fetch users to show pins from start
    queryFn: async () => {
      const response = await fetch('/api/users/random?limit=100');
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

  // Fetch nearby users when red dot is clicked
  useEffect(() => {
    if (showNearbyCard && userLocation) {
      const fetchNearbyUsers = async () => {
        try {
          console.log(`Fetching nearby users for red dot click at: ${userLocation.lat}, ${userLocation.lng}`);
          const response = await fetch(`/api/users/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&mode=proximity`);
          if (response.ok) {
            const proximityUsers = await response.json();
            console.log(`Received ${proximityUsers.length} nearby users for card display`);
            setNearbyUsers(proximityUsers);
          }
        } catch (error) {
          console.error('Error fetching nearby users:', error);
        }
      };
      
      fetchNearbyUsers();
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

  const createCustomIcon = (user: MapUser, isOnlineWithLocation = false) => {
    // Green for online users with location enabled, selected user gets bright green,
    // otherwise navy blue for sailors or ocean teal for locals
    let color;
    if (isOnlineWithLocation) {
      color = selectedUser?.id === user.id ? '#16a34a' : '#22c55e'; // Green for online with location
    } else {
      color = selectedUser?.id === user.id ? '#22c55e' : (user.userType === 'sailor' ? '#1e3a8a' : '#0891b2');
    }
    
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
          ${isOnlineWithLocation ? 'animation: pulse 2s infinite;' : ''}
        ">
          ⚓
        </div>
        ${isOnlineWithLocation ? `
          <style>
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.7; }
            }
          </style>
        ` : ''}
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
        

        

        
        {!isLoading && users.map((user) => {
          // Check if user is online with recent location update (within 10 minutes)
          const isRecentLocation = user.locationUpdatedAt && 
            new Date(user.locationUpdatedAt).getTime() > Date.now() - 10 * 60 * 1000;
          const isOnlineWithLocation = !!(user.deviceLatitude && user.deviceLongitude && isRecentLocation);
          
          let plotLat: number, plotLng: number;
          if (isOnlineWithLocation && user.deviceLatitude && user.deviceLongitude) {
            // Use precise location for online users with location enabled
            plotLat = user.deviceLatitude;
            plotLng = user.deviceLongitude;
          } else {
            // Scatter within ±50km of city location (≈ ±0.45 degrees)
            const scatterRadius = 0.45; // 50km ≈ 0.45 degrees
            plotLat = user.latitude + (Math.random() - 0.5) * scatterRadius;
            plotLng = user.longitude + (Math.random() - 0.5) * scatterRadius;
          }
          
          return (
            <Marker
              key={user.id}
              position={[plotLat, plotLng]}
              icon={createCustomIcon(user, isOnlineWithLocation)}
              eventHandlers={{
                click: (e) => {
                  // Open chat window on click
                  setOpenChatUserId(openChatUserId === user.id ? null : user.id);
                  e.originalEvent.stopPropagation();
                },
                mouseover: (e) => {
                  // Show user card on hover
                  setHoveredUser(user);
                  const mouseEvent = e.originalEvent as MouseEvent;
                  setHoverPosition({ x: mouseEvent.clientX, y: mouseEvent.clientY });
                },
                mouseout: () => {
                  // Hide user card when not hovering
                  setHoveredUser(null);
                  setHoverPosition(null);
                }
              }}
            />
          );
        })}
      </MapContainer>

      {/* Transparent User Cards List at Bottom */}
      {showNearbyCard && nearestUsers.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 z-[1000]">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-3 max-h-32 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Nearby Maritime Professionals</h3>
            <div className="grid grid-cols-3 gap-2">
              {nearestUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => {
                    if (selectedUser?.id === user.id) {
                      setSelectedUser(null);
                    } else {
                      setSelectedUser(user);
                    }
                  }}
                  className={`p-2 rounded-md cursor-pointer transition-all ${
                    selectedUser?.id === user.id 
                      ? 'bg-green-100 border-2 border-green-500' 
                      : 'bg-white/50 hover:bg-white/70 border border-gray-200'
                  }`}
                >
                  <div className="text-xs font-medium text-gray-900 truncate">
                    {user.fullName}
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    {user.rank ? getRankAbbreviation(user.rank) : 'Maritime Professional'}
                    {user.questionCount !== undefined && 
                      <span className="text-blue-600 font-medium ml-1">
                        {user.questionCount}Q
                      </span>
                    }
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
      
      {/* Hover User Card */}
      {hoveredUser && hoverPosition && (
        <div 
          className="fixed z-[2000] pointer-events-none"
          style={{
            left: `${hoverPosition.x + 10}px`,
            top: `${hoverPosition.y - 10}px`,
            transform: hoverPosition.x > window.innerWidth - 300 ? 'translateX(-100%)' : 'none'
          }}
        >
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-200 p-3 max-w-[280px]">
            <h3 className="font-bold text-gray-900 mb-2 text-sm">
              {hoveredUser.fullName} 
              {hoveredUser.rank && ` (${getRankAbbreviation(hoveredUser.rank)})`}
              {hoveredUser.questionCount !== undefined && 
                <span className="text-blue-600 font-medium ml-2">
                  {hoveredUser.questionCount}Q{hoveredUser.answerCount || 0}A
                </span>
              }
            </h3>
            
            {/* Company */}
            {hoveredUser.company && hoveredUser.company !== '' && (
              <p className="text-xs text-gray-600 mb-1">
                <span className="font-medium">Company:</span> {hoveredUser.company}
              </p>
            )}
            
            {/* Ship */}
            {hoveredUser.shipName && hoveredUser.shipName !== '' && (
              <p className="text-xs text-gray-600 mb-1">
                <span className="font-medium">Ship:</span> {hoveredUser.shipName}
              </p>
            )}
            
            {/* Location & Distance */}
            {userLocation && (
              <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
                {(() => {
                  const isRecentLocation = hoveredUser.locationUpdatedAt && 
                    new Date(hoveredUser.locationUpdatedAt).getTime() > Date.now() - 10 * 60 * 1000;
                  const isOnline = !!(hoveredUser.deviceLatitude && hoveredUser.deviceLongitude && isRecentLocation);
                  
                  if (isOnline && hoveredUser.deviceLatitude && hoveredUser.deviceLongitude) {
                    return (
                      <>
                        <p className="text-green-600 font-medium">🟢 Online with precise location</p>
                        <p>
                          {calculateDistance(
                            userLocation.lat, userLocation.lng,
                            hoveredUser.deviceLatitude, hoveredUser.deviceLongitude
                          ).toFixed(1)}km away
                        </p>
                      </>
                    );
                  } else {
                    return (
                      <>
                        <p className="text-gray-500">📍 City-based location</p>
                        <p>
                          {calculateDistance(
                            userLocation.lat, userLocation.lng,
                            hoveredUser.latitude, hoveredUser.longitude
                          ).toFixed(1)}km away (approx)
                        </p>
                      </>
                    );
                  }
                })()}
                <p className="text-xs text-blue-500 mt-1 italic">Click to chat</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Chat Window */}
      {openChatUserId && (() => {
        const chatUser = users.find(u => u.id === openChatUserId);
        return chatUser ? (
          <div className="fixed inset-0 z-[3000] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {chatUser.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {chatUser.fullName}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {chatUser.rank ? getRankAbbreviation(chatUser.rank) : 'Maritime Professional'}
                      {chatUser.questionCount !== undefined && 
                        <span className="text-blue-600 font-medium ml-2">
                          {chatUser.questionCount}Q{chatUser.answerCount || 0}A
                        </span>
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setOpenChatUserId(null)}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  ✕
                </button>
              </div>
              
              {/* Chat Content */}
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="text-center text-gray-500 text-sm mb-4">
                  <p>Start a conversation with {chatUser.fullName}</p>
                  <p className="text-xs mt-1">You can send one message. They'll see it when they accept.</p>
                </div>
                
                {/* Single Message Interface */}
                <div className="space-y-3">
                  <SingleMessageChat
                    receiverId={chatUser.id}
                    receiverName={chatUser.fullName}
                    receiverRank={chatUser.rank ? getRankAbbreviation(chatUser.rank) : undefined}
                    onClose={() => setOpenChatUserId(null)}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null;
      })()}
    </div>
  );
}