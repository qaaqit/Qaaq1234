import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import DiscoveryCard from "@/components/discovery-card";
import UsersMap from "@/components/users-map";
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
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="gradient-bg text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Cpath%20d%3D%22M20%2050h60m-50-20h40m-30%2040h20%22%20stroke%3D%22white%22%20stroke-width%3D%221%22%20fill%3D%22none%22%2F%3E%3C%2Fsvg%3E')] bg-[length:50px_50px]"></div>
        </div>
        
        <div className="relative z-10 px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <i className="fas fa-anchor text-xl text-white"></i>
              </div>
              <div>
                <h1 className="text-2xl font-bold">QaaqConnect</h1>
                <p className="text-sm text-white/80">Welcome, {user.fullName.split(' ')[0]}!</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-white/80">
                {user.userType === 'sailor' ? '🚢' : '🏠'} {user.userType}
              </span>
            </div>
          </div>

          <div className="text-center py-8">
            <h2 className="text-3xl font-bold mb-4">Discover Port Cities</h2>
            <p className="text-lg text-white/90 mb-6">
              Find experiences, connect with locals, and explore like never before
            </p>
          </div>
        </div>
      </header>

      {/* Search Interface */}
      <div className="px-4 -mt-6 relative z-10 mb-6">
        <div className="bg-white rounded-2xl maritime-shadow p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-4 py-4 text-lg border-gray-200 focus:border-ocean-teal"
                  placeholder="Search port cities, activities, or locals..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
            <Button 
              onClick={handleSearch}
              className="bg-ocean-teal hover:bg-cyan-600 text-white px-8 py-4"
            >
              <i className="fas fa-search mr-2"></i>Find
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Badge
                key={category}
                variant={selectedCategory === category.split(' ').slice(1).join(' ') ? "default" : "outline"}
                className={`cursor-pointer hover:bg-gray-50 ${
                  selectedCategory === category.split(' ').slice(1).join(' ') 
                    ? "bg-ocean-teal text-white" 
                    : ""
                }`}
                onClick={() => {
                  const catName = category.split(' ').slice(1).join(' ');
                  setSelectedCategory(selectedCategory === catName ? "" : catName);
                }}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Users Map */}
      <div className="px-4 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">QAAQ Users Worldwide</h2>
        <UsersMap />
      </div>

      {/* Posts Grid */}
      <div className="px-4">
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                <div className="w-full h-48 bg-gray-200 rounded-xl mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="flex justify-between">
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-compass text-2xl text-gray-400"></i>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery ? "No results found" : "No posts yet"}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery 
                ? "Try adjusting your search or browse all posts" 
                : "Be the first to share an experience!"
              }
            </p>
            {searchQuery && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("");
                  refetch();
                }}
              >
                Clear search
              </Button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <DiscoveryCard
                key={post.id}
                post={post}
                onLike={() => handleLike(post.id)}
                user={user}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
