import { useState, useEffect } from "react";
import { User } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Crown, Search, MapPin, Users, Navigation, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MapUser {
  id: string;
  fullName: string;
  userType: string;
  maritimeRank?: string;
  isOnline?: boolean;
  lastSeen?: string;
  location?: {
    lat: number;
    lng: number;
    city?: string;
    country?: string;
  };
  profilePhoto?: string;
}

interface QRadarPageProps {
  user: User;
}

export default function QRadarPage({ user }: QRadarPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [nearbyUsers, setNearbyUsers] = useState<MapUser[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [radiusKm, setRadiusKm] = useState(50);

  // Initialize user location
  useEffect(() => {
    console.log('🗺️ Q-Radar initializing...');
    
    // Set fallback location (Mumbai) for now - real location tracking disabled for stability
    setUserLocation({ lat: 19.076, lng: 72.8777 });
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    console.log('🔍 Q-Radar searching for:', searchQuery);
    
    // Simulate search delay
    setTimeout(() => {
      setIsSearching(false);
      // Search functionality disabled for now - will be rebuilt
      console.log('🔍 Search completed (currently disabled)');
    }, 1000);
  };

  const handleKoiHai = () => {
    console.log('❓ Koi Hai? button pressed');
    // "Who's there?" functionality - will show nearby users
    setNearbyUsers([]); // Empty for now, will be implemented
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-orange-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
              <Navigation className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Q Radar</h1>
              <p className="text-sm text-slate-600">Maritime Discovery System</p>
            </div>
          </div>
          
          {user.isAdmin && (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              <Crown className="w-3 h-3 mr-1" />
              Admin
            </Badge>
          )}
        </div>
      </div>

      {/* Search Section */}
      <div className="p-4 bg-white border-b border-slate-200">
        <div className="flex space-x-2 mb-4">
          <div className="relative flex-1">
            <Crown className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-orange-500" />
            <Input
              type="text"
              placeholder="Sailors / Ships / Company"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 border-orange-200 focus:border-orange-400 focus:ring-orange-400"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              data-testid="input-search"
            />
          </div>
          <Button 
            onClick={handleSearch}
            disabled={isSearching}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4"
            data-testid="button-search"
          >
            <Search className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline"
            className="border-orange-300 text-orange-600 hover:bg-orange-50"
            data-testid="button-filter"
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {/* Koi Hai Button */}
        <div className="flex justify-center mb-4">
          <Button
            onClick={handleKoiHai}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-3 rounded-full font-medium shadow-lg"
            data-testid="button-koi-hai"
          >
            <Users className="w-5 h-5 mr-2" />
            Koi Hai?
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4 text-sm">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="rounded border-orange-300 text-orange-600 focus:ring-orange-400"
              data-testid="checkbox-online-only"
            />
            <span className="text-slate-600">Online only</span>
          </label>
          <div className="flex items-center space-x-2">
            <span className="text-slate-600">Radius:</span>
            <select
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="border border-orange-200 rounded px-2 py-1 text-sm focus:border-orange-400 focus:ring-orange-400"
              data-testid="select-radius"
            >
              <option value={10}>10 km</option>
              <option value={25}>25 km</option>
              <option value={50}>50 km</option>
              <option value={100}>100 km</option>
              <option value={500}>500 km</option>
            </select>
          </div>
        </div>
      </div>

      {/* Map Placeholder */}
      <div className="flex-1 relative">
        <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-slate-700 mb-2">Q Radar Map</h3>
            <p className="text-slate-500 mb-4">Clean, stable maritime discovery system</p>
            
            {userLocation ? (
              <div className="text-sm text-slate-600">
                <p>📍 Current location: {userLocation.lat.toFixed(3)}, {userLocation.lng.toFixed(3)}</p>
                <p className="text-xs text-slate-500 mt-1">Mumbai, India (Fallback)</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Getting your location...</p>
            )}
            
            {nearbyUsers.length > 0 && (
              <Card className="mt-4 max-w-sm mx-auto">
                <CardContent className="pt-4">
                  <p className="text-sm font-medium">Found {nearbyUsers.length} nearby users</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-white border-t border-slate-200 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Q Radar v2.0 - Stable</span>
          <span>👤 {user.fullName}</span>
        </div>
      </div>
    </div>
  );
}