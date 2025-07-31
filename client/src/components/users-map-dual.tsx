import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import MarineChatButton from './marine-chat-button';
import SingleMessageChat from './single-message-chat';
import GoogleMap from './google-map';
import LeafletMap from './leaflet-map';
import { ChevronDown, Map, Filter, MapPin } from 'lucide-react';

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

const getRankAbbreviation = (rank: string): string => {
  const abbreviations: { [key: string]: string } = {
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
  return abbreviations[lowerRank] || rank.substring(0, 3).toUpperCase();
};

// Calculate distance between two points using Haversine formula
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Maritime rank categories for filtering
const MARITIME_RANK_CATEGORIES = [
  {
    id: 'everyone',
    label: 'Everyone',
    description: 'All maritime professionals',
    ranks: []
  },
  {
    id: 'junior_officers_above',
    label: 'Junior Officers & Above',
    description: 'Officers, Engineers, and Leadership',
    ranks: ['captain', 'chief officer', '2nd officer', '3rd officer', 'chief engineer', '2nd engineer', '3rd engineer', '4th engineer', 'eto']
  },
  {
    id: 'senior_officers_above',
    label: 'Senior Officers & Above', 
    description: '2nd Engineer, Chief Engineer, Superintendents',
    ranks: ['2nd engineer', 'second engineer', '2E', 'chief engineer', 'chief_engineer', 'CE', 'superintendent', 'superintendents']
  }
];

interface UsersMapDualProps {
  showNearbyCard?: boolean;
  onUsersFound?: (count: number) => void;
}

export default function UsersMapDual({ showNearbyCard = false, onUsersFound }: UsersMapDualProps) {
  const { user } = useAuth();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hoveredUser, setHoveredUser] = useState<MapUser | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedUser, setSelectedUser] = useState<MapUser | null>(null);
  const [openChatUserId, setOpenChatUserId] = useState<string | null>(null);
  const [showOnlineOnly, setShowOnlineOnly] = useState(true);
  const [selectedRankCategory, setSelectedRankCategory] = useState<string>('everyone');
  const [showRankDropdown, setShowRankDropdown] = useState(false);
  const [showMapTypeDropdown, setShowMapTypeDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [mapType, setMapType] = useState('roadmap');
  const [mapZoom, setMapZoom] = useState(10); // Default zoom level

  // Fetch all users with TanStack Query
  const { data: allUsers = [], isLoading } = useQuery<MapUser[]>({
    queryKey: ['/api/users/random'],
    enabled: true,
  });

  // Calculate radius based on map zoom level
  const radiusKm = useMemo(() => {
    // Zoom levels: 1 (world) to 20 (building level)
    // Lower zoom = larger area = larger radius
    const zoomToRadius: Record<number, number> = {
      1: 20000, 2: 10000, 3: 5000, 4: 2500, 5: 1250,
      6: 625, 7: 300, 8: 150, 9: 75, 10: 50,
      11: 25, 12: 15, 13: 10, 14: 5, 15: 3,
      16: 2, 17: 1, 18: 0.5, 19: 0.3, 20: 0.1
    };
    return zoomToRadius[Math.min(20, Math.max(1, Math.round(mapZoom)))] || 50;
  }, [mapZoom]);

  // Filter users based on location and online status using useMemo
  const filteredUsers = useMemo(() => {
    if (!userLocation || !allUsers.length) {
      return [];
    }

    let filtered = allUsers;

    // Filter by auto-calculated radius based on zoom
    filtered = filtered.filter(mapUser => {
      const distance = calculateDistance(
        userLocation.lat, 
        userLocation.lng, 
        mapUser.latitude, 
        mapUser.longitude
      );
      return distance <= radiusKm;
    });

    // Filter by online status if enabled
    if (showOnlineOnly) {
      filtered = filtered.filter(mapUser => {
        const isRecentLocation = mapUser.locationUpdatedAt && 
          new Date(mapUser.locationUpdatedAt).getTime() > Date.now() - 10 * 60 * 1000;
        return !!(mapUser.deviceLatitude && mapUser.deviceLongitude && isRecentLocation);
      });
    }

    // Filter by selected rank category
    if (selectedRankCategory !== 'everyone') {
      const category = MARITIME_RANK_CATEGORIES.find(cat => cat.id === selectedRankCategory);
      if (category && category.ranks.length > 0) {
        filtered = filtered.filter(mapUser => {
          return category.ranks.some(rank => 
            mapUser.rank?.toLowerCase().includes(rank.toLowerCase())
          );
        });
      }
    }

    return filtered;
  }, [allUsers, userLocation?.lat, userLocation?.lng, showOnlineOnly, radiusKm, selectedRankCategory]);

  // Get top 6 nearest users with distance calculation
  const nearestUsers = useMemo(() => {
    if (!userLocation || !filteredUsers.length) return [];
    
    const usersWithDistance = filteredUsers.map(user => ({
      ...user,
      distance: calculateDistance(userLocation.lat, userLocation.lng, user.latitude, user.longitude)
    }));
    
    return usersWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 6);
  }, [filteredUsers, userLocation]);

  // Update user count when users are loaded (temporarily disabled to fix infinite loop)
  // useEffect(() => {
  //   if (onUsersFound && filteredUsers.length >= 0) {
  //     onUsersFound(filteredUsers.length);
  //   }
  // }, [filteredUsers.length, onUsersFound]);

  // Get user's current location
  useEffect(() => {
    const updateLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            
            // Only update if location changed significantly (>100m)
            setUserLocation(prevLocation => {
              if (!prevLocation || 
                  Math.abs(prevLocation.lat - newLocation.lat) > 0.001 ||
                  Math.abs(prevLocation.lng - newLocation.lng) > 0.001) {
                return newLocation;
              }
              return prevLocation;
            });

            // Send location to server
            fetch('/api/users/location/device', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('qaaq_token')}`
              },
              body: JSON.stringify(newLocation)
            })
            .then(() => console.log('Device location updated on server'))
            .catch(err => console.error('Failed to update device location:', err));
          },
          (error) => {
            console.error('Geolocation error:', error);
            // Fallback to Mumbai coordinates
            setUserLocation({ lat: 19.076, lng: 72.8777 });
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
      } else {
        // Fallback to Mumbai coordinates
        setUserLocation({ lat: 19.076, lng: 72.8777 });
      }
    };

    updateLocation();
    // Update location every 5 minutes
    const locationInterval = setInterval(updateLocation, 5 * 60 * 1000);
    return () => clearInterval(locationInterval);
  }, []);

  // Component updated log for debugging
  useEffect(() => {
    console.log('Component updated - hoveredUser:', hoveredUser ? hoveredUser.fullName : 'none');
  }, [hoveredUser]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setShowRankDropdown(false);
        setShowMapTypeDropdown(false);
        setShowFilterDropdown(false);
        setShowLocationDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  console.log('🗺️ UsersMapDual rendering with', filteredUsers.length, 'filtered users (online within', radiusKm, 'km). Admin mode:', !!user?.isAdmin);

  return (
    <div className="w-full h-full overflow-hidden bg-gray-100 relative">
      {/* Compact Header with Icon Dropdowns */}
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left side - Controls */}
          <div className="flex items-center space-x-2">
            {/* Map Type Dropdown */}
            {user?.isAdmin && (
              <div className="relative dropdown-container">
                <button
                  onClick={() => setShowMapTypeDropdown(!showMapTypeDropdown)}
                  className="flex items-center space-x-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Map size={16} />
                  <ChevronDown size={14} className={`transition-transform ${showMapTypeDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showMapTypeDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[120px] z-[1001]">
                    {['roadmap', 'satellite', 'hybrid'].map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          setMapType(type);
                          setShowMapTypeDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg capitalize ${
                          mapType === type ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Filter Dropdown */}
            <div className="relative dropdown-container">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="flex items-center space-x-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Filter size={16} />
                <ChevronDown size={14} className={`transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showFilterDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[200px] z-[1001]">
                  <div className="p-3 space-y-3">
                    {/* Online Toggle */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="onlineOnly"
                        checked={showOnlineOnly}
                        onChange={(e) => setShowOnlineOnly(e.target.checked)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <label htmlFor="onlineOnly" className="text-sm">Online Only</label>
                    </div>
                    
                    {/* Rank Categories */}
                    <div className="space-y-1">
                      {MARITIME_RANK_CATEGORIES.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => {
                            setSelectedRankCategory(category.id);
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full text-left px-2 py-1 rounded text-sm ${
                            selectedRankCategory === category.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                          }`}
                        >
                          {category.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Location Dropdown */}
            <div className="relative dropdown-container">
              <button
                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                className="flex items-center space-x-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <MapPin size={16} />
                <ChevronDown size={14} className={`transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showLocationDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[200px] z-[1001]">
                  <div className="p-3">
                    {selectedUser ? (
                      <div>
                        <div className="text-sm font-medium">{selectedUser.fullName}</div>
                        <div className="font-mono text-xs text-gray-500 mt-1">
                          {selectedUser.latitude.toFixed(6)}, {selectedUser.longitude.toFixed(6)}
                        </div>
                      </div>
                    ) : userLocation ? (
                      <div>
                        <div className="text-sm font-medium">Your Location</div>
                        <div className="font-mono text-xs text-gray-500 mt-1">
                          {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">Location Loading...</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right side - Status */}
          <div className="text-xs text-gray-500">
            {filteredUsers.length} users (auto-radius: {radiusKm}km)
          </div>
        </div>
      </div>

      {/* Dual Map System: Google Maps for Admin, Leaflet for Users */}
      <div className="absolute top-[60px] left-0 right-0 bottom-[180px]">
        {user?.isAdmin ? (
          <GoogleMap
            users={filteredUsers}
            userLocation={userLocation}
            mapType={mapType}
            onUserHover={(user, position) => {
              setHoveredUser(user);
              setHoverPosition(position || null);
            }}
            onUserClick={(userId) => {
              setOpenChatUserId(prev => prev === userId ? null : userId);
            }}
          />
        ) : (
          <LeafletMap
            users={filteredUsers}
            userLocation={userLocation}
            onUserHover={(user, position) => {
              setHoveredUser(user);
              setHoverPosition(position || null);
            }}
            onUserClick={(userId) => {
              setOpenChatUserId(prev => prev === userId ? null : userId);
            }}
          />
        )}
      </div>

      {/* Bottom Panel - Top 6 Nearest Users */}
      {nearestUsers.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-[180px] bg-white/95 backdrop-blur-sm border-t border-gray-200 z-[1000]">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Nearest Maritime Professionals ({nearestUsers.length})</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto">
              {nearestUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50 transition-colors min-w-[160px]"
                  onClick={() => setOpenChatUserId(prev => prev === user.id ? null : user.id)}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-blue-600">
                        {user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{user.fullName}</div>
                      {user.rank && (
                        <div className="text-xs text-blue-600 font-medium">{getRankAbbreviation(user.rank)}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    {user.shipName && (
                      <div className="text-xs text-gray-600 truncate">🚢 {user.shipName}</div>
                    )}
                    <div className="text-xs text-gray-500">📍 {user.distance?.toFixed(1)}km away</div>
                    {user.questionCount && user.answerCount && (
                      <div className="text-xs text-green-600">{user.questionCount}Q {user.answerCount}A</div>
                    )}
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
            {hoveredUser.company && (
              <p className="text-gray-600 text-xs mb-1">
                <strong>Company:</strong> {hoveredUser.company}
              </p>
            )}
            
            {/* Ship */}
            {hoveredUser.shipName && (
              <p className="text-gray-600 text-xs mb-1">
                <strong>Ship:</strong> <em>{hoveredUser.shipName}</em>
              </p>
            )}
            
            {/* Port & Visit Window */}
            {hoveredUser.port && (
              <p className="text-gray-600 text-xs mb-1">
                <strong>Port:</strong> {hoveredUser.port}
                {hoveredUser.visitWindow && ` (${hoveredUser.visitWindow})`}
              </p>
            )}
            
            {/* Location */}
            <p className="text-gray-600 text-xs">
              <strong>Location:</strong> {hoveredUser.city}, {hoveredUser.country}
            </p>
          </div>
        </div>
      )}

      {/* Chat Window */}
      {openChatUserId && (
        <div className="absolute inset-0 z-[1500] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative">
            <SingleMessageChat
              receiverId={openChatUserId}
              receiverName={filteredUsers.find(u => u.id === openChatUserId)?.fullName || 'Maritime Professional'}
              onClose={() => setOpenChatUserId(null)}
            />
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-gray-100/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <div className="text-sm text-gray-600">Loading maritime professionals...</div>
          </div>
        </div>
      )}
    </div>
  );
}