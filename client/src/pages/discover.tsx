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
import { useLocation as useWouterLocation } from "wouter";
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
  const [, setLocation] = useWouterLocation();

  const [selectedCategory, setSelectedCategory] = useState("");
  const [showUsers, setShowUsers] = useState(false);
  const [showNearbyCard, setShowNearbyCard] = useState(false);
  const [showWhatsAppPanel, setShowWhatsAppPanel] = useState(false);
  const [mapType, setMapType] = useState<'leaflet' | 'google'>('leaflet');
  const [isPremiumMode, setIsPremiumMode] = useState(false);
  
  // Location functionality for enhanced user discovery
  const { location, error: locationError, isLoading: locationLoading, requestDeviceLocation, updateShipLocation } = useLocation(user?.id, true);
  
  const { data: posts = [], isLoading, refetch } = useQuery<Post[]>({
    queryKey: ['/api/posts'],
    queryFn: async () => {
      const response = await fetch('/api/posts');
      if (!response.ok) throw new Error('Failed to load posts');
      return response.json();
    }
  });

  const handleSearch = () => {
    setShowUsers(true);
    setShowNearbyCard(true); // Show the nearby card list when button is pressed
    refetch();
  };

  // Listen for hash changes to trigger user search
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash.includes('koi-hai')) {
        setShowUsers(true);
        setShowNearbyCard(true);
        refetch();
      }
    };

    // Listen for hash change events
    window.addEventListener('hashchange', handleHashChange);
    
    // Check initial hash on component mount
    handleHashChange();

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [refetch]);

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
            <button 
              onClick={() => setLocation('/')}
              className="flex items-center space-x-3 hover:bg-white/10 rounded-lg p-2 transition-colors"
            >
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <i className="fas fa-anchor text-xl text-white"></i>
              </div>
              <div>
                <h1 className="text-2xl font-bold">QaaqConnect</h1>
                <p className="text-sm text-white/80">Welcome{user.fullName && !user.fullName.startsWith('+') ? `, ${user.fullName.split(' ')[0]}` : ''}!</p>
              </div>
            </button>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-white/80">
                {user.userType === 'sailor' ? '🚢' : '🏠'} {user.userType}
              </span>
              <Button
                onClick={() => setShowWhatsAppPanel(!showWhatsAppPanel)}
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                title="Discover Bot - Maritime Assistant"
              >
                <i className="fab fa-whatsapp mr-2"></i>Discover
              </Button>
              <Button
                onClick={() => {
                  localStorage.removeItem('qaaq_token');
                  localStorage.removeItem('qaaq_user');
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



      {/* Main Content Area - Full Screen Map */}
      <div className="flex-1 overflow-hidden relative">
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
              showNearbyCard={showNearbyCard}
              searchQuery=""
              center={{ lat: 19.076, lng: 72.8977 }}
            />
          </div>
        ) : (
          <UsersMap showUsers={showUsers} showNearbyCard={showNearbyCard} searchQuery="" />
        )}
        
        {/* WhatsApp Bot Control Panel - positioned outside map */}
        {showWhatsAppPanel && user.isAdmin && (
          <div className="absolute top-16 right-4 z-50 max-w-sm">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 border">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-gray-800">Discover Bot Control</h3>
                <Button
                  onClick={() => setShowWhatsAppPanel(false)}
                  variant="ghost"
                  size="sm"
                  className="p-1 h-6 w-6"
                >
                  ×
                </Button>
              </div>
              <WhatsAppBotControl />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
