import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import MarineChatButton from './marine-chat-button';
import SingleMessageChat from './single-message-chat';
import GoogleMap from './google-map';
import LeafletMap from './leaflet-map';

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
    description: 'Captain, Chief Officer, Chief Engineer',
    ranks: ['captain', 'chief officer', 'chief engineer']
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
  const [radiusKm, setRadiusKm] = useState(50);
  const [selectedRankCategory, setSelectedRankCategory] = useState<string>('everyone');
  const [showRankDropdown, setShowRankDropdown] = useState(false);

  // Fetch all users with TanStack Query
  const { data: allUsers = [], isLoading } = useQuery<MapUser[]>({
    queryKey: ['/api/users/random'],
    enabled: true,
  });

  // Filter users based on location and online status using useMemo
  const filteredUsers = useMemo(() => {
    if (!userLocation || !allUsers.length) {
      return [];
    }

    let filtered = allUsers;

    // Filter by radius
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

  // Close rank dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.rank-dropdown') && showRankDropdown) {
        setShowRankDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showRankDropdown]);

  console.log('🗺️ UsersMapDual rendering with', filteredUsers.length, 'filtered users (online within', radiusKm, 'km). Admin mode:', !!user?.isAdmin);

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
      
      {/* Control Panel for Filtering */}
      <div className="absolute top-20 left-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 min-w-[240px]">
        <div className="text-sm font-medium text-gray-700 mb-2">Map Filter</div>
        <div className="space-y-3">
          {/* Online Users Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="onlineOnly"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="onlineOnly" className="text-sm text-gray-700">
              Online Users Only
            </label>
          </div>
          
          {/* Radius Selector */}
          <div className="space-y-1">
            <label className="text-xs text-gray-600">Radius (km)</label>
            <select
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-full text-sm p-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={10}>10 km</option>
              <option value={25}>25 km</option>
              <option value={50}>50 km</option>
              <option value={100}>100 km</option>
              <option value={500}>500 km</option>
            </select>
          </div>

          {/* Rank Category Filter */}
          <div className="space-y-1 relative rank-dropdown">
            <label className="text-xs text-gray-600">Rank Category</label>
            <button
              onClick={() => setShowRankDropdown(!showRankDropdown)}
              className="w-full text-sm p-2 border border-gray-300 rounded bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
            >
              <span className="text-left truncate">
                {MARITIME_RANK_CATEGORIES.find(cat => cat.id === selectedRankCategory)?.label || 'Everyone'}
              </span>
              <svg className={`w-4 h-4 transition-transform ${showRankDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showRankDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-[1001]">
                {MARITIME_RANK_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedRankCategory(category.id);
                      setShowRankDropdown(false);
                    }}
                    className={`w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                      selectedRankCategory === category.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <div className="font-medium text-sm">{category.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{category.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* User Count Display */}
          <div className="text-xs text-gray-500 pt-1 border-t border-gray-200">
            {filteredUsers.length} users within {radiusKm}km
            {selectedRankCategory !== 'everyone' && (
              <div className="text-blue-600 mt-1">
                Category: {MARITIME_RANK_CATEGORIES.find(cat => cat.id === selectedRankCategory)?.label}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dual Map System: Google Maps for Admin, Leaflet for Users */}
      {user?.isAdmin ? (
        <GoogleMap
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