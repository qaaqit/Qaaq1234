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
    <div className="h-screen bg-slate-50">
      {/* Full Screen Map - Primary "Koi Hai?" Discovery */}
      <UsersMap />
    </div>
  );
}
