import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type User } from "@/lib/auth";

interface PostProps {
  user: User;
}

export default function Post({ user }: PostProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    content: "",
    location: "",
    category: "",
    authorType: "fullName" as "fullName" | "nickname" | "anonymous",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.content.trim()) {
      toast({
        title: "Content required",
        description: "Please write something to share",
        variant: "destructive",
      });
      return;
    }

    if (!formData.category) {
      toast({
        title: "Category required",
        description: "Please select a category",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await apiRequest('/api/posts', 'POST', formData);
      
      toast({
        title: "Posted! 🦆",
        description: "Your experience has been shared with the community",
      });
      
      setLocation("/");
    } catch (error) {
      toast({
        title: "Failed to post",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getAuthorPreview = () => {
    switch (formData.authorType) {
      case 'fullName':
        return user.fullName;
      case 'nickname':
        return user.nickname || `${user.userType === 'sailor' ? '⚓' : '🏠'} ${user.fullName.split(' ')[0]}`;
      case 'anonymous':
        return 'Anonymous';
      default:
        return user.fullName;
    }
  };

  const categories = [
    "Local Discovery",
    "Maritime Meetup", 
    "Port Experience",
    "Community Event",
    "Question/Help",
    "Adventure",
    "Culture",
    "Evening Event"
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header with Home Logo */}
      <header className="gradient-bg text-white px-4 py-6">
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
              <p className="text-sm text-white/80">Share your experience</p>
            </div>
          </button>
        </div>
      </header>

      <div className="px-4 -mt-6 relative z-10">
        <Card className="maritime-shadow">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold navy">Share an Experience</CardTitle>
            <p className="text-gray-600">Post about activities, meetups, or local recommendations</p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Identity Options */}
              <div className="bg-gray-50 rounded-xl p-4">
                <Label className="text-sm font-medium text-gray-700 mb-3 block">
                  Post as:
                </Label>
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({ ...formData, authorType: 'fullName' })}
                    className={`${
                      formData.authorType === 'fullName'
                        ? 'border-navy bg-navy/5 text-navy'
                        : 'border-gray-200 hover:border-navy hover:bg-navy/5'
                    }`}
                  >
                    <i className="fas fa-user mr-2"></i>
                    {user.fullName}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({ ...formData, authorType: 'nickname' })}
                    className={`${
                      formData.authorType === 'nickname'
                        ? 'border-ocean-teal bg-ocean-teal/5 text-ocean-teal'
                        : 'border-gray-200 hover:border-ocean-teal hover:bg-ocean-teal/5'
                    }`}
                  >
                    <i className="fas fa-anchor mr-2"></i>
                    {user.nickname || `${user.userType === 'sailor' ? '⚓' : '🏠'} ${user.fullName.split(' ')[0]}`}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({ ...formData, authorType: 'anonymous' })}
                    className={`${
                      formData.authorType === 'anonymous'
                        ? 'border-gray-400 bg-gray-50 text-gray-700'
                        : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <i className="fas fa-mask mr-2"></i>
                    Anonymous
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Posting as: <span className="font-medium">{getAuthorPreview()}</span>
                </p>
              </div>

              <div>
                <Label htmlFor="content" className="text-sm font-medium text-gray-700">
                  What's happening?
                </Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="mt-2 min-h-32 resize-none focus:border-ocean-teal"
                  placeholder="Share an experience, ask for recommendations, or organize a meetup..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location" className="text-sm font-medium text-gray-700">
                    Location
                  </Label>
                  <Input
                    id="location"
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="mt-2 focus:border-ocean-teal"
                    placeholder="Port city"
                  />
                </div>
                <div>
                  <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                    Category
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="mt-2 focus:border-ocean-teal">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-gray-200 hover:bg-gray-100"
                >
                  <i className="fas fa-camera mr-2 text-gray-500"></i>
                  <span className="text-sm text-gray-600">Add Photo</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-gray-200 hover:bg-gray-100"
                >
                  <i className="fas fa-map-marker-alt mr-2 text-gray-500"></i>
                  <span className="text-sm text-gray-600">Pin Location</span>
                </Button>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full gradient-bg text-white hover:shadow-lg transition-all transform hover:scale-[1.02]"
              >
                {loading ? (
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                ) : null}
                Share with Community 🦆
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
