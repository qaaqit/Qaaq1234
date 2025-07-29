import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, User, Ship } from 'lucide-react';

interface SuburbUser {
  id: string;
  fullName: string;
  userType: string;
  rank: string | null;
  shipName: string | null;
  port: string | null;
  city: string | null;
  country: string | null;
  whatsappNumber: string;
  latitude: number;
  longitude: number;
}

interface SuburbUsersDisplayProps {
  suburb: string;
  port: string;
  country: string;
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

export default function SuburbUsersDisplay({ suburb, port, country }: SuburbUsersDisplayProps) {
  // Fetch users for this specific suburb/area
  const { data: users = [], isLoading } = useQuery<SuburbUser[]>({
    queryKey: ['/api/users/map', suburb, port, country],
    queryFn: async () => {
      const response = await fetch('/api/users/map');
      if (!response.ok) throw new Error('Failed to fetch users');
      const allUsers = await response.json();
      
      // Filter users for this specific location
      return allUsers.filter((user: SuburbUser) => 
        user.port?.toLowerCase().includes(port.toLowerCase()) ||
        user.city?.toLowerCase().includes(port.toLowerCase()) ||
        user.country?.toLowerCase().includes(country.toLowerCase())
      );
    },
    staleTime: 60000 // 1 minute
  });

  const handleConnectUser = (user: SuburbUser) => {
    if (user.whatsappNumber) {
      // Open WhatsApp chat
      const whatsappUrl = `https://wa.me/${user.whatsappNumber.replace(/[^0-9]/g, '')}?text=Hello! I found you through QaaqConnect. I'm interested in connecting with maritime professionals in ${port}.`;
      window.open(whatsappUrl, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-navy flex items-center gap-2">
          <User className="w-5 h-5" />
          Maritime Professionals in {suburb}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-navy flex items-center gap-2">
          <User className="w-5 h-5" />
          Maritime Professionals in {suburb}
        </h3>
        <Card className="border-dashed border-gray-300">
          <CardContent className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <User className="w-12 h-12 mx-auto opacity-50" />
            </div>
            <p className="text-gray-500">No maritime professionals found in this area yet.</p>
            <p className="text-sm text-gray-400 mt-2">Be the first to connect from {suburb}!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-navy flex items-center gap-2">
        <User className="w-5 h-5" />
        Maritime Professionals in {suburb} ({users.length})
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {users.map((user) => (
          <Card key={user.id} className="border border-gray-200 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    user.userType === 'sailor' ? 'bg-navy text-white' : 'bg-teal-100 text-teal-700'
                  }`}>
                    {user.userType === 'sailor' ? (
                      <Ship className="w-5 h-5" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-navy">
                      {user.fullName} {user.rank && `(${getRankAbbreviation(user.rank)})`}
                    </h4>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Badge variant="outline" className={
                        user.userType === 'sailor' ? 'border-navy text-navy' : 'border-teal-600 text-teal-600'
                      }>
                        {user.userType === 'sailor' ? '🚢 Sailor' : '🏠 Local'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {user.shipName && (
                <div className="mb-3 p-2 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2 text-sm text-blue-700">
                    <Ship className="w-4 h-4" />
                    <span className="font-medium">{user.shipName.replace(/^(MV|MT)\s+/, '')}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2 text-sm text-gray-600 mb-3">
                <MapPin className="w-4 h-4" />
                <span>{user.port || user.city}, {user.country}</span>
              </div>

              <Button 
                onClick={() => handleConnectUser(user)}
                className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                size="sm"
              >
                <i className="fab fa-whatsapp"></i>
                Connect via WhatsApp
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {users.length > 6 && (
        <div className="text-center pt-4">
          <Button variant="outline" className="text-navy border-navy hover:bg-navy hover:text-white">
            Show More Maritime Professionals
          </Button>
        </div>
      )}
    </div>
  );
}