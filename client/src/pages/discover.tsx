import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import DiscoveryCard from "@/components/discovery-card";
import UsersMap from "@/components/users-map";
import WhatsAppBotControl from "@/components/whatsapp-bot-control";
import { type User } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";

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
    if (searchQuery.trim() === "") {
      // If no search query, show nearest users
      // This will be handled by the UsersMap component
    }
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

      {/* Search Bar */}
      <div className="px-4 py-4 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-3 text-lg border-gray-200 focus:border-ocean-teal"
                placeholder="Search port cities, sailors, or locations..."
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </div>
          <Button 
            onClick={handleSearch}
            className="bg-ocean-teal hover:bg-cyan-600 text-white px-8 py-3 text-lg font-bold"
          >
            <i className="fas fa-users mr-2"></i>Koi Hai?
          </Button>
        </div>
      </div>

      {/* Full Screen Map */}
      <div className="flex-1 overflow-hidden relative">
        <UsersMap showUsers={showUsers} searchQuery={searchQuery} />
        
        {/* WhatsApp Bot Control Panel */}
        {showWhatsAppPanel && (
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
      </div>
    </div>
  );
}
