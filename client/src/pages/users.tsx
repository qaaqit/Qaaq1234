import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Search, Filter, MapPin, MessageCircle, Users, ChevronDown } from 'lucide-react';
import { Link } from 'wouter';

interface User {
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
  whatsappNumber?: string;
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

const blurWhatsAppNumber = (number: string): string => {
  if (!number) return '';
  // Show first 3 and last 2 digits, blur the middle
  if (number.length > 5) {
    const start = number.substring(0, 3);
    const end = number.substring(number.length - 2);
    const middle = '•'.repeat(number.length - 5);
    return `${start}${middle}${end}`;
  }
  return '•'.repeat(number.length);
};

// Maritime rank categories for filtering
const MARITIME_RANK_CATEGORIES = [
  { id: 'everyone', name: 'Everyone', description: 'All maritime professionals' },
  { id: 'deck_officers', name: 'Deck Officers', description: 'Captain, Chief Officer, 2nd Officer, 3rd Officer' },
  { id: 'engine_officers', name: 'Engine Officers', description: 'Chief Engineer, 2nd Engineer, 3rd Engineer, 4th Engineer' },
  { id: 'cadets', name: 'Cadets', description: 'Engine Cadets, Deck Cadets, Trainees' },
  { id: 'crew', name: 'Crew', description: 'Bosun, Able Seaman, Oiler, Cook, Steward' }
];

export default function UsersPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRankCategory, setSelectedRankCategory] = useState('everyone');
  const [showRankDropdown, setShowRankDropdown] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Fetch all users
  const { data: allUsers = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users/search', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append('q', searchQuery.trim());
      }
      params.append('limit', '1000'); // High limit to get all users
      
      const response = await fetch(`/api/users/search?${params}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  // Get user's location for distance calculation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Location access denied:', error);
        }
      );
    }
  }, []);

  // Calculate distance between two coordinates
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

  // Filter users based on search and rank category
  const filteredUsers = useMemo(() => {
    let filtered = allUsers;

    // Filter by rank category
    if (selectedRankCategory !== 'everyone') {
      const rankFilters: { [key: string]: string[] } = {
        'deck_officers': ['captain', 'master', 'chief_officer', 'chief officer', 'second_officer', 'second officer', 'third_officer', 'third officer', 'capt', 'c/o', '2/o', '3/o'],
        'engine_officers': ['chief_engineer', 'chief engineer', 'second_engineer', 'second engineer', 'third_engineer', 'third engineer', 'fourth_engineer', 'fourth engineer', 'ce', '2e', '3e', '4e'],
        'cadets': ['cadet', 'trainee', 'engine_cadet', 'deck_cadet', 'e/c', 'd/c', 'trn'],
        'crew': ['bosun', 'able seaman', 'ordinary seaman', 'oiler', 'cook', 'steward', 'bsn', 'ab', 'os', 'olr', 'ck', 'stw']
      };
      
      const categoryRanks = rankFilters[selectedRankCategory] || [];
      if (categoryRanks.length > 0) {
        filtered = filtered.filter(user => {
          return categoryRanks.some(rank => 
            user.rank?.toLowerCase().includes(rank.toLowerCase())
          );
        });
      }
    }

    // Add distance calculation if user location is available
    if (userLocation) {
      filtered = filtered.map(user => ({
        ...user,
        distance: calculateDistance(userLocation.lat, userLocation.lng, user.latitude, user.longitude)
      })).sort((a: any, b: any) => a.distance - b.distance);
    }

    return filtered;
  }, [allUsers, selectedRankCategory, userLocation]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setShowRankDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-blue-600 hover:text-blue-700">
                <MapPin size={24} />
              </Link>
              <div className="flex items-center space-x-2">
                <Users size={20} className="text-gray-600" />
                <h1 className="text-xl font-semibold text-gray-900">Maritime Professionals</h1>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {filteredUsers.length} users found
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1">
              <div className="relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, ship, company, rank..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Rank Filter Dropdown */}
            <div className="relative dropdown-container">
              <button
                onClick={() => setShowRankDropdown(!showRankDropdown)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-300"
              >
                <Filter size={16} />
                <span className="text-sm font-medium">
                  {MARITIME_RANK_CATEGORIES.find(cat => cat.id === selectedRankCategory)?.name}
                </span>
                <ChevronDown size={14} className={`transition-transform ${showRankDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showRankDropdown && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[280px] z-[1001]">
                  <div className="p-2">
                    {MARITIME_RANK_CATEGORIES.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => {
                          setSelectedRankCategory(category.id);
                          setShowRankDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          selectedRankCategory === category.id
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <div className="font-medium">{category.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{category.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Users Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading maritime professionals...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredUsers.map((user: any) => (
              <div
                key={user.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                {/* Header with initials and name */}
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-blue-600">
                      {user.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{user.fullName}</h3>
                    {user.rank && (
                      <p className="text-xs text-blue-600 font-medium">{getRankAbbreviation(user.rank)}</p>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 text-xs text-gray-600">
                  {user.company && (
                    <div className="flex items-center">
                      <span className="font-medium mr-2">Company:</span>
                      <span className="truncate">{user.company}</span>
                    </div>
                  )}
                  
                  {user.shipName && (
                    <div className="flex items-center">
                      <span className="font-medium mr-2">Ship:</span>
                      <span className="truncate italic">🚢 {user.shipName}</span>
                    </div>
                  )}

                  {user.port && (
                    <div className="flex items-center">
                      <span className="font-medium mr-2">Port:</span>
                      <span className="truncate">{user.port}</span>
                    </div>
                  )}

                  <div className="flex items-center">
                    <span className="font-medium mr-2">Location:</span>
                    <span className="truncate">📍 {user.city}, {user.country}</span>
                  </div>

                  {user.distance && (
                    <div className="flex items-center">
                      <span className="font-medium mr-2">Distance:</span>
                      <span>{user.distance.toFixed(1)}km away</span>
                    </div>
                  )}

                  {user.whatsappNumber && (
                    <div className="flex items-center">
                      <span className="font-medium mr-2">WhatsApp:</span>
                      <span className="font-mono">{blurWhatsAppNumber(user.whatsappNumber)}</span>
                    </div>
                  )}

                  {(user.questionCount || user.answerCount) && (
                    <div className="flex items-center">
                      <span className="font-medium mr-2">Activity:</span>
                      <span className="text-green-600">
                        {user.questionCount || 0}Q {user.answerCount || 0}A
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      user.userType === 'sailor' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-teal-100 text-teal-800'
                    }`}>
                      {user.userType === 'sailor' ? '⚓ Sailor' : '🏠 Local'}
                    </span>
                    
                    {user.whatsappNumber && (
                      <button
                        onClick={() => window.open(`https://wa.me/${user.whatsappNumber.replace(/[^0-9]/g, '')}?text=Hello! I found you through QaaqConnect.`, '_blank')}
                        className="flex items-center space-x-1 px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-full text-xs font-medium transition-colors"
                      >
                        <MessageCircle size={12} />
                        <span>Chat</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}