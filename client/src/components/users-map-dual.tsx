import { useEffect, useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import MarineChatButton from './marine-chat-button';
import SingleMessageChat from './single-message-chat';
import MessageNotificationDot from './message-notification-dot';
import GoogleMap from './google-map';
import { ChevronDown, ChevronUp, Filter, MapPin, Radar, Search, Home, Map, Satellite, Crown } from 'lucide-react';

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
  const [, navigate] = useLocation();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hoveredUser, setHoveredUser] = useState<MapUser | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedUser, setSelectedUser] = useState<MapUser | null>(null);
  const [openChatUserId, setOpenChatUserId] = useState<string | null>(null);
  const [showOnlineOnly, setShowOnlineOnly] = useState(true);
  const [searchPanelState, setSearchPanelState] = useState<'full' | 'half'>('full');
  const [selectedRankCategory, setSelectedRankCategory] = useState<string>('everyone');
  const [showRankDropdown, setShowRankDropdown] = useState(false);

  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showMapTypeDropdown, setShowMapTypeDropdown] = useState(false);
  const [mapType, setMapType] = useState('roadmap');
  const [mapZoom, setMapZoom] = useState(10); // Default zoom level
  const [scanAngle, setScanAngle] = useState(0); // For rotating scan arm
  const [showScanElements, setShowScanElements] = useState(false); // Toggle scan arm and circle
  const [searchQuery, setSearchQuery] = useState(''); // User search input
  const [shipSearchResult, setShipSearchResult] = useState<any>(null); // Ship search result
  const [searchType, setSearchType] = useState<'users' | 'ships'>('users'); // Search type

  // Stable zoom change handler to prevent map re-initialization
  const handleZoomChange = useCallback((zoom: number) => {
    setMapZoom(zoom);
  }, []);



  // Fetch all users with comprehensive search functionality
  const { data: allUsers = [], isLoading } = useQuery<MapUser[]>({
    queryKey: ['/api/users/search', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append('q', searchQuery.trim());
        params.append('limit', '500'); // Higher limit for search results
      } else {
        params.append('limit', '100'); // Default limit for browsing
      }
      
      const response = await fetch(`/api/users/search?${params}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    staleTime: searchQuery.trim() ? 30000 : 60000, // Shorter cache for search results
  });

  // Simple search handler
  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
  };

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

  // Filter users based on search query first, then location and other filters
  const filteredUsers = useMemo(() => {
    if (!allUsers.length) {
      return [];
    }

    let filtered = allUsers;

    // If there's a search query, show all search results regardless of location
    if (searchQuery.trim()) {
      console.log(`🔍 Search mode: showing ${filtered.length} search results for "${searchQuery}"`);
      
      // Apply only rank filter if selected during search
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
      
      return filtered; // Return all search results without location constraints
    }

    // If no search query, apply location-based filtering
    if (!userLocation) {
      return [];
    }

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
  }, [allUsers, userLocation?.lat, userLocation?.lng, showOnlineOnly, radiusKm, selectedRankCategory, searchQuery]);

  // Get all search results or top 6 nearest users for browsing
  const nearestUsers = useMemo(() => {
    if (!filteredUsers.length) return [];
    
    // If searching, show ALL search results with distance calculation
    if (searchQuery.trim()) {
      return filteredUsers.map(user => ({
        ...user,
        distance: userLocation ? calculateDistance(userLocation.lat, userLocation.lng, user.latitude, user.longitude) : 0
      })).sort((a, b) => a.distance - b.distance); // Sort by distance for search results
    }
    
    // If not searching, show only top 6 nearest users for browsing
    if (!userLocation) return [];
    
    const usersWithDistance = filteredUsers.map(user => ({
      ...user,
      distance: calculateDistance(userLocation.lat, userLocation.lng, user.latitude, user.longitude)
    }));
    
    return usersWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 6);
  }, [filteredUsers, userLocation, searchQuery]);

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

  // Sophisticated scan arm animation with elegant timing
  useEffect(() => {
    if (!showScanElements) return;
    
    const scanInterval = setInterval(() => {
      setScanAngle(prev => (prev + 1.2) % 360); // Slower, more elegant rotation
    }, 75); // Smoother frame rate for premium feel
    
    return () => clearInterval(scanInterval);
  }, [showScanElements]);

  // Auto-enable scan elements when users are detected
  useEffect(() => {
    if (filteredUsers.length > 0 && !showScanElements) {
      setShowScanElements(true);
      // Auto-disable after 20 seconds
      const timeout = setTimeout(() => setShowScanElements(false), 20000);
      return () => clearTimeout(timeout);
    }
  }, [filteredUsers.length, showScanElements]);

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
        setShowFilterDropdown(false);
        setShowLocationDropdown(false);
        setShowMapTypeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  console.log('🗺️ UsersMapDual rendering with', filteredUsers.length, 'filtered users (online within', radiusKm, 'km). Admin mode:', !!user?.isAdmin);

  return (
    <div className="w-full h-full overflow-hidden bg-gray-100 relative">
      {/* Mobile-Optimized Header with Touch-Friendly Controls */}
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="flex flex-col space-y-2 px-2 sm:px-4 py-2 sm:py-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          {/* Control Row - Filter and Location buttons only */}
          <div className="flex items-center space-x-1 sm:space-x-2">


            {/* Filter Dropdown - Touch-friendly */}
            <div className="relative dropdown-container">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="flex items-center space-x-1 px-2 sm:px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors min-w-[44px] min-h-[44px] sm:min-w-auto sm:min-h-auto justify-center"
                title="Filter options"
              >
                <Filter size={16} />
                <ChevronDown size={14} className={`transition-transform ${showFilterDropdown ? 'rotate-180' : ''} hidden sm:block`} />
              </button>
              
              {showFilterDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[200px] z-[500]">
                  <div className="p-3 space-y-3">
                    {/* Online Toggle */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="onlineOnly"
                        checked={showOnlineOnly}
                        onChange={(e) => setShowOnlineOnly(e.target.checked)}
                        className="w-4 h-4 text-orange-600"
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
                            selectedRankCategory === category.id ? 'bg-orange-50 text-orange-700' : 'hover:bg-gray-50'
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

            {/* Location Dropdown - Touch-friendly */}
            <div className="relative dropdown-container">
              <button
                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                className="flex items-center space-x-1 px-2 sm:px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors min-w-[44px] min-h-[44px] sm:min-w-auto sm:min-h-auto justify-center"
                title="Location settings"
              >
                <MapPin size={16} />
                <ChevronDown size={14} className={`transition-transform ${showLocationDropdown ? 'rotate-180' : ''} hidden sm:block`} />
              </button>
              
              {showLocationDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[200px] z-[500]">
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

            {/* Radar Toggle Button */}
            <button
              onClick={() => setShowScanElements(!showScanElements)}
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                showScanElements 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              title="Toggle radar scan"
            >
              <Radar size={16} className={showScanElements ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Right side - Search Results/Status */}
          <div className="flex items-center space-x-2">
            {searchQuery.trim() ? (
              <div className="px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-xs font-medium text-orange-700">
                {isLoading ? '🔍 Searching...' : `📊 ${allUsers.length} results for "${searchQuery.trim()}" • Showing ${filteredUsers.length} on map`}
              </div>
            ) : (
              <div className="px-3 py-2 bg-gray-100 rounded-lg text-xs font-medium text-gray-700"
                   title={`Zoom level ${Math.round(mapZoom)} shows ${radiusKm}km radius with ${filteredUsers.length} users`}>
                Z{Math.round(mapZoom)} • {radiusKm}km • {filteredUsers.length} users
              </div>
            )}
          </div>
        </div>


      </div>

      {/* Dual Map System: Google Maps for Admin, Leaflet for Users */}
      <div className={`absolute top-[80px] sm:top-[60px] left-0 right-0 ${
        nearestUsers.length > 0 
          ? searchPanelState === 'minimized'
            ? 'bottom-[60px]'
            : searchPanelState === 'half'
            ? 'bottom-1/2'
            : searchQuery.trim() 
            ? 'bottom-[65%]' 
            : 'bottom-[160px] sm:bottom-[180px]'
          : 'bottom-0'
      }`}>
        <GoogleMap
          users={filteredUsers}
          userLocation={userLocation}
          selectedUser={selectedUser}
          mapType={mapType}
          onUserHover={(user, position) => {
            setHoveredUser(user);
            setHoverPosition(position || null);
          }}
          onUserClick={(userId) => {
            navigate(`/user-profile/${userId}`);
          }}
          onZoomChange={handleZoomChange}
          showScanElements={showScanElements}
          scanAngle={scanAngle}
          radiusKm={radiusKm}
        />

        {/* Map Controls - Top Left Corner with Chevron Dropdown */}
        <div className="absolute top-4 left-4 z-[500]">
            <div className="relative dropdown-container">
              <button
                onClick={() => setShowMapTypeDropdown(!showMapTypeDropdown)}
                className="flex items-center space-x-1 px-3 py-2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-lg shadow-lg border border-gray-200 transition-colors"
                title="Map view options"
              >
                {mapType === 'roadmap' ? <Map size={16} /> : <Satellite size={16} />}
                <ChevronDown size={14} className={`transition-transform ${showMapTypeDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showMapTypeDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[140px] z-[501]">
                  <div className="p-1">
                    <button
                      onClick={() => {
                        setMapType('roadmap');
                        setShowMapTypeDropdown(false);
                      }}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md text-sm transition-colors ${
                        mapType === 'roadmap' 
                          ? 'bg-orange-50 text-orange-700 font-medium' 
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <Map size={16} />
                      <span>Map</span>
                    </button>
                    <button
                      onClick={() => {
                        setMapType('satellite');
                        setShowMapTypeDropdown(false);
                      }}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md text-sm transition-colors ${
                        mapType === 'satellite' 
                          ? 'bg-orange-50 text-orange-700 font-medium' 
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <Satellite size={16} />
                      <span>Satellite</span>
                    </button>
                    <button
                      onClick={() => {
                        setMapType('hybrid');
                        setShowMapTypeDropdown(false);
                      }}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md text-sm transition-colors ${
                        mapType === 'hybrid' 
                          ? 'bg-orange-50 text-orange-700 font-medium' 
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="w-4 h-4 rounded border border-gray-300 bg-gradient-to-br from-green-100 to-blue-100"></div>
                      <span>Hybrid</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        {/* Koi Hai Animation at 6 o'clock position - only show during search, not when results are displayed */}
        {showScanElements && userLocation && nearestUsers.length === 0 && (
          <div className="absolute inset-0 pointer-events-none z-[999] flex items-center justify-center">
            <div className="relative w-full h-full">
              {/* Position text at 6 o'clock (bottom) of the scanning circle */}
              <div 
                className="absolute koi-hai-blink"
                style={{
                  top: 'calc(50% + 120px)', // Position below center at 6 o'clock
                  left: '50%',
                  transform: 'translateX(-50%)'
                }}
              >
                <div className="bg-gradient-to-r from-blue-600 to-teal-600 text-white px-4 py-2 rounded-full shadow-xl border-2 border-white/30 backdrop-blur-sm">
                  <span className="text-sm font-bold tracking-wider drop-shadow-lg">Koi Hai?</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>



      {/* Search Results - Expandable Panel with Two States */}
      {nearestUsers.length > 0 && (
        <div className={`absolute left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 z-[1000] transition-all duration-300 ease-in-out ${
          searchPanelState === 'half'
            ? 'bottom-0 h-1/2'
            : searchQuery.trim() 
            ? 'top-[35%] bottom-0' 
            : 'bottom-0 h-[160px] sm:h-[180px]'
        }`}>
          <div className="p-2 sm:p-4 h-full">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h3 className="text-xs sm:text-sm font-medium text-gray-700">
                {searchQuery.toLowerCase().trim() === 'onboard'
                  ? `🚢 Sailors Currently Onboard Ships (${nearestUsers.length})`
                  : searchQuery.trim() 
                  ? `Search Results: ${nearestUsers.length} users found` 
                  : `Nearest Maritime Professionals (${nearestUsers.length})`}
              </h3>
              
              {/* Panel Control Button for Search Results */}
              {(searchQuery.trim() || nearestUsers.length > 0) && (
                <button
                  onClick={() => {
                    if (searchPanelState === 'full') {
                      setSearchPanelState('half');
                    } else {
                      setSearchPanelState('full');
                    }
                  }}
                  className="flex items-center justify-center w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors ml-2"
                  title={
                    searchPanelState === 'full' 
                      ? "Minimize to half screen" 
                      : "Expand to full screen"
                  }
                >
                  {searchPanelState === 'half' ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </button>
              )}
            </div>
            <div className={`${
              searchQuery.trim() 
                ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 overflow-y-auto h-[calc(100%-3rem)] scrollbar-thin scrollbar-thumb-gray-300 pr-2' 
                : 'flex gap-2 sm:gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 pb-2'
            }`}>
              {nearestUsers.map((user) => (
                <div
                  key={user.id}
                  className={`bg-white rounded-lg border border-gray-200 p-2 sm:p-3 hover:bg-gray-50 transition-colors touch-manipulation ${
                    searchQuery.trim() ? 'w-full' : 'min-w-[140px] sm:min-w-[160px] flex-shrink-0'
                  }`}
                  onClick={() => {
                    // Center map on user's location
                    setSelectedUser(user);
                    setHoveredUser(null);
                  }}
                >
                  <div className="flex items-center space-x-2 mb-1 sm:mb-2">
                    {/* Touch-Friendly Profile Circle for Chat */}
                    <div className="relative">
                      <div 
                        className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-200 hover:scale-110 transition-all duration-200 border-2 border-transparent hover:border-blue-300 touch-manipulation overflow-hidden"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent card click
                          setOpenChatUserId(prev => prev === user.id ? null : user.id);
                        }}
                        title="Tap to open chat"
                      >
                        {user.profilePictureUrl ? (
                          <img 
                            src={user.profilePictureUrl} 
                            alt={`${user.fullName}'s profile`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <span className={`text-xs font-medium text-blue-600 ${user.profilePictureUrl ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}>
                          {user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </span>
                      </div>
                      
                      {/* Message notification dot */}
                      <MessageNotificationDot userId={user.id} />
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer">
                      <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">{user.fullName}</div>
                      {user.rank && (
                        <div className="text-xs text-blue-600 font-medium">{getRankAbbreviation(user.rank)}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    {/* Show ship info prominently for onboard searches */}
                    {searchQuery.toLowerCase().trim() === 'onboard' ? (
                      <>
                        {user.shipName && (
                          <div className="text-xs text-blue-700 font-semibold truncate">🚢 {user.shipName}</div>
                        )}
                        {user.imoNumber && (
                          <div className="text-xs text-gray-600 truncate">IMO: {user.imoNumber}</div>
                        )}
                        <div className="text-xs text-gray-500">
                          📍 {user.city}, {user.country}
                        </div>
                      </>
                    ) : (
                      <>
                        {user.shipName && (
                          <div className="text-xs text-gray-600 truncate">🚢 {user.shipName}</div>
                        )}
                        <div className="text-xs text-gray-500">
                          {searchQuery.trim() && user.distance ? 
                            `📍 ${user.distance.toFixed(1)}km away` : 
                            searchQuery.trim() ? 
                            `📍 ${user.city}, ${user.country}` : 
                            `📍 ${user.distance?.toFixed(1)}km away`}
                        </div>
                      </>
                    )}
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

      {/* Floating Search Bar - Positioned above bottom navigation with sufficient gap */}
      <div className="fixed bottom-24 left-2 right-2 z-[1002] bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg">
        <div className="flex items-center px-3 py-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Sailors/ Ships/ Company"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              className="w-full pl-8 pr-8 py-2 text-sm border-0 bg-transparent focus:outline-none focus:ring-0"
            />
            <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg"
              >
                ×
              </button>
            )}
          </div>
          
          {/* Crown Icon for Premium */}
          <div className="ml-2 text-yellow-500">
            <Crown size={16} />
          </div>
        </div>
      </div>
    </div>
  );
}