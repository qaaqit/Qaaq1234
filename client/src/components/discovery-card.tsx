import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type User } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";

interface Post {
  id: string;
  content: string;
  location: string;
  category: string;
  authorName: string;
  likesCount: number;
  createdAt: string;
}

interface DiscoveryCardProps {
  post: Post;
  onLike: () => void;
  user: User;
}

export default function DiscoveryCard({ post, onLike, user }: DiscoveryCardProps) {
  const [isLiking, setIsLiking] = useState(false);

  const handleLike = async () => {
    setIsLiking(true);
    try {
      await onLike();
    } finally {
      setIsLiking(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'Local Discovery': '🗺️',
      'Maritime Meetup': '🚢',
      'Port Experience': '⚓',
      'Community Event': '👥',
      'Question/Help': '❓',
      'Adventure': '🌊',
      'Culture': '🎨',
      'Evening Event': '🌅',
    };
    return icons[category] || '📍';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Local Discovery': 'bg-green-100 text-green-700',
      'Maritime Meetup': 'bg-blue-100 text-blue-700',
      'Port Experience': 'bg-navy/10 text-navy',
      'Community Event': 'bg-purple-100 text-purple-700',
      'Question/Help': 'bg-yellow-100 text-yellow-700',
      'Adventure': 'bg-cyan-100 text-cyan-700',
      'Culture': 'bg-pink-100 text-pink-700',
      'Evening Event': 'bg-orange-100 text-orange-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  // Placeholder images for different categories
  const getPlaceholderImage = (category: string) => {
    const images: Record<string, string> = {
      'Local Discovery': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&w=400&h=240&fit=crop',
      'Maritime Meetup': 'https://images.unsplash.com/photo-1521791136064-7986c2920216?ixlib=rb-4.0.3&w=400&h=240&fit=crop',
      'Port Experience': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&w=400&h=240&fit=crop',
      'Community Event': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&w=400&h=240&fit=crop',
      'Adventure': 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?ixlib=rb-4.0.3&w=400&h=240&fit=crop',
      'Culture': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&w=400&h=240&fit=crop',
    };
    return images[category] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&w=400&h=240&fit=crop';
  };

  return (
    <Card className="maritime-shadow overflow-hidden hover:shadow-xl transition-shadow">
      <div className="relative">
        <img 
          src={getPlaceholderImage(post.category)} 
          alt={`${post.category} experience`}
          className="w-full h-48 object-cover"
        />
        <Badge 
          className={`absolute top-4 right-4 ${getCategoryColor(post.category)} border-0`}
        >
          {getCategoryIcon(post.category)} {post.category}
        </Badge>
      </div>
      
      <CardContent className="p-6">
        <h4 className="text-lg font-semibold mb-2 line-clamp-2">
          {post.content.length > 60 ? `${post.content.substring(0, 60)}...` : post.content}
        </h4>
        
        {post.location && (
          <p className="text-sm text-gray-500 mb-2 flex items-center">
            <i className="fas fa-map-marker-alt mr-1"></i>
            {post.location}
          </p>
        )}
        
        <p className="text-gray-600 text-sm mb-4">
          by {post.authorName}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={isLiking}
              className="duck-like hover:scale-110 transition-transform p-0"
            >
              <i className={`fas fa-heart text-lg ${isLiking ? 'fa-spin' : ''}`}></i>
              <span className="text-sm ml-1">{post.likesCount}</span>
            </Button>
            <span className="text-sm text-gray-500">
              <i className="fas fa-users mr-1"></i>
              {Math.floor(Math.random() * 10) + 1} going
            </span>
          </div>
          <span className="text-xs text-gray-400">
            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
