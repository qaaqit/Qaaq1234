import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import DiscoveryCard from "@/components/discovery-card";
import UsersMap from "@/components/users-map";
import GoogleMaps from "@/components/google-maps";
import WhatsAppBotControl from "@/components/whatsapp-bot-control";
import CPSSNavigator from "@/components/cpss-navigator";
import { useLocation } from "@/hooks/useLocation";
import { type User } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { MapPin, Navigation, Ship, Satellite, Crown } from "lucide-react";

interface Post {
  id: string;
  content: string;
  location: string;
  category: string;
  authorName: string;
  likesCount: number;
  createdAt: string;
}

interface DiscoverProps {
  user: User;
}

export default function Discover({ user }: DiscoverProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showUsers, setShowUsers] = useState(false);
  const [showWhatsAppPanel, setShowWhatsAppPanel] = useState(false);
  const [mapType, setMapType] = useState<'leaflet' | 'google'>('leaflet');
  const [isPremiumMode, setIsPremiumMode] = useState(false);
  
  // Location functionality for enhanced user discovery
  const { location, error: locationError, isLoading: locationLoading, requestDeviceLocation, updateShipLocation } = useLocation();
  
  const { data: posts = [], isLoading, refetch } = useQuery<Post[]>({
    queryKey: searchQuery ? ['/api/posts/search', searchQuery, selectedCategory] : ['/api/posts'],
    queryFn: async () => {
      if (searchQuery) {
        const params = new URLSearchParams({
          q: searchQuery,
          ...(selectedCategory && { category: selectedCategory })
        });
        const response = await fetch(`/api/posts/search?${params}`);
        if (!response.ok) throw new Error('Search failed');
        return response.json();
      } else {
        const response = await fetch('/api/posts');
        if (!response.ok) throw new Error('Failed to load posts');
        return response.json();
      }
    }
  });

  const handleSearch = () => {
    setShowUsers(true);
    // Always show users when "Koi Hai?" is clicked, regardless of search query
    refetch();
  };

  const handleLike = async (postId: string) => {
    try {
      const token = localStorage.getItem('qaaq_token');
      await apiRequest('POST', `/api/posts/${postId}/like`, null);
      refetch(); // Refresh the posts to update like counts
      toast({
        title: "🦆",
        description: "Duck like added!",
      });
    } catch (error) {
      toast({
        title: "Failed to like post",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const categories = [
    "🚢 Maritime Meetups",
    "🗺️ Local Tours", 
    "🍽️ Port Dining",
    "🛍️ Shore Shopping",
    "⚓ Adventure",
    "🎨 Culture",
    "🌅 Evening"
  ];

  return (
    <div className="h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="gradient-bg text-white relative overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Cpath%20d%3D%22M20%2050h60m-50-20h40m-30%2040h20%22%20stroke%3D%22white%22%20stroke-width%3D%221%22%20fill%3D%22none%22%2F%3E%3C%2Fsvg%3E')] bg-[length:50px_50px]"></div>
        </div>
        
        <div className="relative z-10 px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <i className="fas fa-anchor text-xl text-white"></i>
              </div>
              <div>
                <h1 className="text-2xl font-bold">QaaqConnect</h1>
                <p className="text-sm text-white/80">Welcome{user.fullName && !user.fullName.startsWith('+') ? `, ${user.fullName.split(' ')[0]}` : ''}!</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-white/80">
                {user.userType === 'sailor' ? '🚢' : '🏠'} {user.userType}
              </span>
              <Button
                onClick={() => setShowWhatsAppPanel(!showWhatsAppPanel)}
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <i className="fab fa-whatsapp mr-2"></i>Bot
              </Button>
              <Button
                onClick={() => {
                  localStorage.removeItem('qaaq_token');
                  window.location.href = '/';
                }}
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <i className="fas fa-sign-out-alt mr-2"></i>Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Search and Location Controls */}
      <div className="px-4 py-4 bg-white border-b border-gray-200 flex-shrink-0">
        {/* Location Controls Row */}
        <div className="flex flex-wrap gap-3 mb-4">
          {/* Device Location Button */}
          <Button 
            onClick={() => requestDeviceLocation(user.id)}
            disabled={locationLoading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md flex items-center gap-2"
          >
            <Navigation className="w-4 h-4" />
            {locationLoading ? 'Getting Location...' : 'Update My Location'}
          </Button>

          {/* Ship Location Button (for sailors) */}
          {user.userType === 'sailor' && (
            <Button 
              onClick={() => {
                // Example: update ship location using user's IMO or ship name
                const imoNumber = (user as any).imoNumber || (user as any).seafarerId;
                const shipName = (user as any).shipName || (user as any).lastShip;
                if (imoNumber || shipName) {
                  updateShipLocation(user.id, imoNumber, shipName);
                }
              }}
              disabled={locationLoading}
              className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg shadow-md flex items-center gap-2"
            >
              <Ship className="w-4 h-4" />
              Track My Ship
            </Button>
          )}
        </div>

        {/* Location Status Display */}
        {location && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <MapPin className="w-4 h-4" />
              <span className="font-medium">Location Updated</span>
            </div>
            <div className="text-sm text-green-600 mt-1">
              Source: {location.source} • Coordinates: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              {location.accuracy && <span> • Accuracy: {Math.round(location.accuracy)}m</span>}
            </div>
          </div>
        )}

        {/* Location Error Display */}
        {locationError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <MapPin className="w-4 h-4" />
              <span className="font-medium">Location Error</span>
            </div>
            <div className="text-sm text-red-600 mt-1">
              {locationError.message}
            </div>
          </div>
        )}

        {/* Search Row */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              {/* Premium Crown Toggle */}
              <Button
                onClick={() => {
                  setIsPremiumMode(!isPremiumMode);
                  setMapType(isPremiumMode ? 'leaflet' : 'google');
                }}
                variant={isPremiumMode ? 'default' : 'outline'}
                size="sm"
                className={`absolute left-2 top-1/2 transform -translate-y-1/2 z-10 h-8 w-8 p-0 rounded-full ${
                  isPremiumMode 
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500' 
                    : 'bg-white hover:bg-yellow-50 text-yellow-600 border-yellow-300'
                }`}
                title={isPremiumMode ? 'Premium Mode Active' : 'Activate Premium Mode'}
              >
                <Crown className="w-4 h-4" />
              </Button>
              
              <i className="fas fa-search absolute left-12 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-20 pr-4 py-3 text-lg border-gray-200 focus:border-ocean-teal"
                placeholder="ek, do, teen, char..."
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              
              {/* Premium Mode Indicator */}
              {isPremiumMode && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Badge className="bg-yellow-500 text-white text-xs">
                    Premium
                  </Badge>
                </div>
              )}
            </div>
          </div>
          <Button 
            onClick={handleSearch}
            className="bg-ocean-teal hover:bg-cyan-600 text-white px-8 py-3 text-lg font-bold flex items-center gap-2"
          >
            <MapPin className="w-5 h-5" />
            🌊 Koi Hai? (Who's there?)
          </Button>
        </div>
      </div>

      {/* Main Content Area with Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="koihai" className="h-full flex flex-col">
          <TabsList className="mx-4 mt-2 mb-4 grid w-auto grid-cols-2">
            <TabsTrigger value="koihai" className="flex items-center space-x-2">
              <i className="fas fa-users"></i>
              <span>Koi Hai?</span>
            </TabsTrigger>
            <TabsTrigger value="cpss" className="flex items-center space-x-2">
              <i className="fas fa-map-marked-alt"></i>
              <span>CPSS Navigator</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="koihai" className="flex-1 overflow-hidden relative m-0">
            {/* Admin WhatsApp Toggle (only for admin users) */}
            {user.isAdmin && (
              <div className="absolute top-4 left-4 z-10">
                <Button
                  size="sm"
                  onClick={() => setShowWhatsAppPanel(!showWhatsAppPanel)}
                  className="bg-green-600 hover:bg-green-700 text-white rounded-full w-10 h-10 p-0"
                  title="WhatsApp Bot Controls"
                >
                  <i className="fab fa-whatsapp"></i>
                </Button>
              </div>
            )}

            {/* Premium Mode Notice */}
            {isPremiumMode && !user.isAdmin && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg max-w-sm">
                <div className="text-center">
                  <Crown className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                  <h3 className="font-semibold text-yellow-800 mb-2">Premium Features</h3>
                  <p className="text-sm text-yellow-700 mb-3">
                    Unlock Google Maps with satellite view, enhanced navigation, and premium maritime features.
                  </p>
                  <Button className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm">
                    Upgrade to Premium
                  </Button>
                </div>
              </div>
            )}

            {/* Render appropriate map based on selection */}
            {isPremiumMode && user.isAdmin ? (
              <div className="w-full h-full">
                <GoogleMaps 
                  showUsers={showUsers}
                  searchQuery={searchQuery}
                  center={{ lat: 19.076, lng: 72.8977 }}
                />
              </div>
            ) : (
              <UsersMap showUsers={showUsers} searchQuery={searchQuery} />
            )}
            
            {/* WhatsApp Bot Control Panel */}
            {showWhatsAppPanel && user.isAdmin && (
              <div className="absolute top-4 right-4 z-50">
                <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-1">
                  <WhatsAppBotControl />
                  <Button
                    onClick={() => setShowWhatsAppPanel(false)}
                    variant="ghost"
                    size="sm"
                    className="absolute -top-2 -right-2 bg-white hover:bg-gray-50 rounded-full w-6 h-6 p-0 shadow-md"
                  >
                    ×
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="cpss" className="flex-1 overflow-auto m-0 p-4">
            <CPSSNavigator />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
