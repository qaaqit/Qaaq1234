import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { Search } from "lucide-react";
import QaaqStore from "./qaaq-store";
import SuburbUsersDisplay from "./suburb-users-display";

interface CPSSItem {
  id: string;
  title: string;
  content: string;
  author: string;
  authorRank?: string;
  authorShip?: string;
  location: string;
  type: 'meetup' | 'tour' | 'dining' | 'shopping' | 'cultural';
  category: string;
  likes: number;
  shares: number;
  isLiked: boolean;
  isShared: boolean;
  createdAt: string;
  images?: string[];
  tags: string[];
}

interface CPSSLevel {
  id: string;
  name: string;
  type: 'country' | 'port' | 'suburb' | 'service';
  children?: CPSSLevel[];
  icon?: string;
  description?: string;
  items?: CPSSItem[];
}

// Sample CPSS data with SEMM-like content structure
const generateSampleItems = (category: string, location: string): CPSSItem[] => [
  {
    id: `${category}-1`,
    title: `Best ${category} experience in ${location}`,
    content: `Looking for recommendations for ${category} in ${location}. Any sailors or locals have good suggestions?`,
    author: "CAPT. Rodriguez",
    authorRank: "Captain", 
    authorShip: "MV Pacific Star",
    location: location,
    type: category.toLowerCase() as any,
    category: category,
    likes: Math.floor(Math.random() * 50) + 5,
    shares: Math.floor(Math.random() * 20) + 2,
    isLiked: false,
    isShared: false,
    createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    tags: [category.toLowerCase(), location.toLowerCase().replace(/\s+/g, '-')],
  },
  {
    id: `${category}-2`,
    title: `${category} meetup this weekend`,
    content: `Organizing a ${category} event for maritime professionals. Who's interested in joining?`,
    author: "CE Singh", 
    authorRank: "Chief Engineer",
    authorShip: "Tanker Horizon",
    location: location,
    type: category.toLowerCase() as any,
    category: category,
    likes: Math.floor(Math.random() * 30) + 8,
    shares: Math.floor(Math.random() * 15) + 3,
    isLiked: false,
    isShared: false,
    createdAt: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString(),
    tags: [category.toLowerCase(), 'meetup', 'weekend'],
  }
];

const cpssData: CPSSLevel[] = [
  {
    id: 'india',
    name: 'India',
    type: 'country',
    icon: '🇮🇳',
    children: [
      {
        id: 'mumbai-port',
        name: 'Mumbai Port',
        type: 'port',
        icon: '⚓',
        children: [
          {
            id: 'colaba',
            name: 'Colaba',
            type: 'suburb',
            icon: '🏙️',
            children: [
              {
                id: 'maritime-meetup',
                name: 'Maritime Meetups',
                type: 'service',
                icon: '🤝',
                description: 'Connect with fellow seafarers',
                items: generateSampleItems('Maritime Meetups', 'Mumbai Colaba')
              },
              {
                id: 'local-tours',
                name: 'Local Tours',
                type: 'service',
                icon: '🗺️',
                description: 'Explore Mumbai with local guides',
                items: generateSampleItems('Local Tours', 'Mumbai Colaba')
              },
              {
                id: 'port-dining',
                name: 'Port Dining',
                type: 'service',
                icon: '🍽️',
                description: 'Authentic local restaurants',
                items: generateSampleItems('Port Dining', 'Mumbai Colaba')
              },
              {
                id: 'qaaq-store',
                name: 'Qaaq Store',
                type: 'service',
                icon: '🏪',
                description: 'Pre-order supplies for ship delivery',
                items: []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'uae',
    name: 'UAE',
    type: 'country',
    icon: '🇦🇪',
    children: [
      {
        id: 'dubai-port',
        name: 'Dubai Port',
        type: 'port',
        icon: '⚓',
        children: [
          {
            id: 'deira',
            name: 'Deira',
            type: 'suburb',
            icon: '🏙️',
            children: [
              {
                id: 'maritime-meetup',
                name: 'Maritime Meetups',
                type: 'service',
                icon: '🤝',
                description: 'International seafarer gatherings',
                items: generateSampleItems('Maritime Meetups', 'Dubai Deira')
              },
              {
                id: 'port-dining',
                name: 'Port Dining',
                type: 'service',
                icon: '🍽️',
                description: 'Multi-cuisine restaurants',
                items: generateSampleItems('Port Dining', 'Dubai Deira')
              },
              {
                id: 'qaaq-store',
                name: 'Qaaq Store',
                type: 'service',
                icon: '🏪',
                description: 'Pre-order supplies for ship delivery',
                items: []
              }
            ]
          }
        ]
      }
    ]
  }
];

interface CPSSNavigatorProps {
  onServiceSelect?: (service: CPSSLevel, breadcrumb: CPSSLevel[]) => void;
}

export default function CPSSNavigator({ onServiceSelect }: CPSSNavigatorProps) {
  const [currentLevel, setCurrentLevel] = useState<CPSSLevel[]>(cpssData);
  const [breadcrumb, setBreadcrumb] = useState<CPSSLevel[]>([]);
  const [currentItems, setCurrentItems] = useState<CPSSItem[]>([]);
  const [displayedItems, setDisplayedItems] = useState<CPSSItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CPSSItem[]>([]);
  const [editingItem, setEditingItem] = useState<CPSSItem | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    content: '',
    author: '',
    authorRank: '',
    authorShip: '',
    category: '',
    tags: ''
  });
  const { toast } = useToast();
  const { user } = useAuth();
  const observerRef = useRef<IntersectionObserver>();
  const lastItemRef = useRef<HTMLDivElement>(null);

  const ITEMS_PER_PAGE = 5;

  // Infinite scroll setup
  const lastItemElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreItems();
      }
    });
    if (node) observerRef.current.observe(node);
  }, [loading, hasMore]);

  const loadMoreItems = () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    setTimeout(() => {
      const startIndex = (page - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const newItems = currentItems.slice(startIndex, endIndex);
      
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setDisplayedItems(prev => [...prev, ...newItems]);
        setPage(prev => prev + 1);
      }
      setLoading(false);
    }, 500);
  };

  const handleItemClick = (item: CPSSLevel) => {
    if (item.type === 'service') {
      // Service selected - show items
      setCurrentItems(item.items || []);
      setDisplayedItems((item.items || []).slice(0, ITEMS_PER_PAGE));
      setPage(2);
      setHasMore((item.items || []).length > ITEMS_PER_PAGE);
      setBreadcrumb([...breadcrumb, item]);
      setCurrentLevel([]);
    } else if (item.children) {
      // Navigate deeper
      setCurrentLevel(item.children);
      setBreadcrumb([...breadcrumb, item]);
      setCurrentItems([]);
      setDisplayedItems([]);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      // Back to root
      setCurrentLevel(cpssData);
      setBreadcrumb([]);
      setCurrentItems([]);
      setDisplayedItems([]);
    } else {
      // Navigate to specific level
      const targetItem = breadcrumb[index];
      const newBreadcrumb = breadcrumb.slice(0, index + 1);
      setBreadcrumb(newBreadcrumb);
      
      if (targetItem.type === 'service') {
        setCurrentItems(targetItem.items || []);
        setDisplayedItems((targetItem.items || []).slice(0, ITEMS_PER_PAGE));
        setCurrentLevel([]);
      } else {
        setCurrentLevel(targetItem.children || cpssData);
        setCurrentItems([]);
        setDisplayedItems([]);
      }
    }
  };

  const handleLike = (itemId: string) => {
    setDisplayedItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, isLiked: !item.isLiked, likes: item.isLiked ? item.likes - 1 : item.likes + 1 }
        : item
    ));
    setCurrentItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, isLiked: !item.isLiked, likes: item.isLiked ? item.likes - 1 : item.likes + 1 }
        : item
    ));
  };

  const handleShare = (item: CPSSItem) => {
    setDisplayedItems(prev => prev.map(i => 
      i.id === item.id 
        ? { ...i, isShared: true, shares: i.shares + 1 }
        : i
    ));
    setCurrentItems(prev => prev.map(i => 
      i.id === item.id 
        ? { ...i, isShared: true, shares: i.shares + 1 }
        : i
    ));
    
    // Copy to clipboard
    navigator.clipboard.writeText(`${item.title} - ${item.content}`);
    toast({
      title: "Shared!",
      description: "Content copied to clipboard",
    });
  };

  // Admin functions
  const handleEditItem = (item: CPSSItem) => {
    setEditingItem(item);
    setEditForm({
      title: item.title,
      content: item.content,
      author: item.author,
      authorRank: item.authorRank || '',
      authorShip: item.authorShip || '',
      category: item.category,
      tags: item.tags.join(', ')
    });
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;

    const updatedItem = {
      ...editingItem,
      title: editForm.title,
      content: editForm.content,
      author: editForm.author,
      authorRank: editForm.authorRank || undefined,
      authorShip: editForm.authorShip || undefined,
      category: editForm.category,
      tags: editForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
    };

    setDisplayedItems(prev => prev.map(item => 
      item.id === editingItem.id ? updatedItem : item
    ));
    setCurrentItems(prev => prev.map(item => 
      item.id === editingItem.id ? updatedItem : item
    ));

    setEditingItem(null);
    toast({
      title: "Item Updated",
      description: "Content has been updated successfully",
    });
  };

  const handleDeleteItem = (itemId: string) => {
    setDisplayedItems(prev => prev.filter(item => item.id !== itemId));
    setCurrentItems(prev => prev.filter(item => item.id !== itemId));
    
    toast({
      title: "Item Deleted",
      description: "Content has been removed",
    });
  };

  const handleMoveUp = (itemId: string) => {
    const moveItemUp = (items: CPSSItem[]) => {
      const index = items.findIndex(item => item.id === itemId);
      if (index > 0) {
        const newItems = [...items];
        [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
        return newItems;
      }
      return items;
    };

    setDisplayedItems(moveItemUp);
    setCurrentItems(moveItemUp);
    
    toast({
      title: "Item Moved Up",
      description: "Item priority increased",
    });
  };

  const handleMoveDown = (itemId: string) => {
    const moveItemDown = (items: CPSSItem[]) => {
      const index = items.findIndex(item => item.id === itemId);
      if (index < items.length - 1) {
        const newItems = [...items];
        [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
        return newItems;
      }
      return items;
    };

    setDisplayedItems(moveItemDown);
    setCurrentItems(moveItemDown);
    
    toast({
      title: "Item Moved Down",
      description: "Item priority decreased",
    });
  };

  const getLevelTitle = () => {
    if (breadcrumb.length === 0) return "CPSS Navigator";
    const lastItem = breadcrumb[breadcrumb.length - 1];
    if (lastItem.type === 'service') return lastItem.name;
    switch (lastItem.type) {
      case 'country': return "Select Port";
      case 'port': return "Select Area"; 
      case 'suburb': return "Select Service";
      default: return "Navigate";
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const getLevelColor = (type: string) => {
    switch (type) {
      case 'country': return "bg-blue-100 text-blue-800 border-blue-200";
      case 'port': return "bg-teal-100 text-teal-800 border-teal-200";
      case 'suburb': return "bg-purple-100 text-purple-800 border-purple-200";
      case 'service': return "bg-orange-100 text-orange-800 border-orange-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Search functionality
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    // Search through all items in the CPSS structure
    const allItems: CPSSItem[] = [];
    const collectItems = (levels: CPSSLevel[]) => {
      levels.forEach(level => {
        if (level.items) {
          allItems.push(...level.items);
        }
        if (level.children) {
          collectItems(level.children);
        }
      });
    };
    collectItems(cpssData);

    // Filter items based on search query
    const filtered = allItems.filter(item =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.content.toLowerCase().includes(query.toLowerCase()) ||
      item.author.toLowerCase().includes(query.toLowerCase()) ||
      item.location.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );

    setSearchResults(filtered);
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 pr-4 py-3 text-lg border-gray-200 focus:border-ocean-teal"
          placeholder="Search maritime services, locations, events..."
        />
      </div>

      {/* Search Results */}
      {searchQuery && searchResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-navy">Search Results ({searchResults.length})</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {searchResults.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge className={getLevelColor('service')}>{item.category}</Badge>
                        <span className="text-sm text-gray-500">{item.location}</span>
                      </div>
                      <h4 className="font-semibold text-navy mb-1">{item.title}</h4>
                      <p className="text-gray-600 text-sm mb-2">{item.content}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{item.author} {item.authorRank && `• ${item.authorRank}`}</span>
                        <span>{formatTimeAgo(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Show "No results" message */}
      {searchQuery && searchResults.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No results found for "{searchQuery}"</p>
          <p className="text-sm mt-1">Try different keywords or browse by location</p>
        </div>
      )}

      {/* Only show navigation when not searching */}
      {!searchQuery && (
        <>
          {/* Breadcrumb Navigation */}
          {breadcrumb.length > 0 && (
            <div className="flex items-center space-x-2 text-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleBreadcrumbClick(-1)}
            className="h-8 px-2 text-gray-600 hover:text-navy"
          >
            🌍 Home
          </Button>
          {breadcrumb.map((item, index) => (
            <div key={item.id} className="flex items-center space-x-2">
              <span className="text-gray-400">→</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBreadcrumbClick(index)}
                className="h-8 px-2 text-gray-600 hover:text-navy"
              >
                {item.icon} {item.name}
              </Button>
            </div>
          ))}
            </div>
          )}

      {/* Current Level Title */}
      <h3 className="text-lg font-semibold text-navy">{getLevelTitle()}</h3>

      {/* Navigation Level Items */}
      {currentLevel.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {currentLevel.map((item) => (
            <Card
              key={item.id}
              className="cursor-pointer hover:shadow-md transition-shadow border border-gray-200 hover:border-ocean-teal"
              onClick={() => handleItemClick(item)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <h4 className="font-medium text-navy">{item.name}</h4>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className={getLevelColor(item.type)}>
                      {item.type}
                    </Badge>
                    {(item.children || item.items) && (
                      <i className="fas fa-chevron-right text-gray-400"></i>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* SEMM-like Content Cards */}
      {displayedItems.length > 0 && (
        <div className="space-y-4">
          {displayedItems.map((item, index) => (
            <Card
              key={item.id}
              ref={index === displayedItems.length - 1 ? lastItemElementRef : null}
              className="border border-gray-200 hover:shadow-sm transition-shadow"
            >
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-navy to-ocean-teal rounded-full flex items-center justify-center">
                      <i className="fas fa-user text-white text-sm"></i>
                    </div>
                    <div>
                      <h4 className="font-semibold text-navy">{item.author}</h4>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>{item.authorRank}</span>
                        {item.authorShip && (
                          <>
                            <span>•</span>
                            <span className="italic">{item.authorShip}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{formatTimeAgo(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {item.location}
                  </Badge>
                </div>

                {/* Content */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-navy mb-2">{item.title}</h3>
                  <p className="text-gray-700 leading-relaxed">{item.content}</p>
                </div>

                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {item.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(item.id)}
                      className={`flex items-center space-x-2 ${
                        item.isLiked ? 'text-red-500' : 'text-gray-600'
                      } hover:text-red-500`}
                    >
                      <i className={`fas fa-heart ${item.isLiked ? 'text-red-500' : ''}`}></i>
                      <span>{item.likes}</span>
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShare(item)}
                      className={`flex items-center space-x-2 ${
                        item.isShared ? 'text-blue-500' : 'text-gray-600'
                      } hover:text-blue-500`}
                    >
                      <i className="fas fa-share"></i>
                      <span>{item.shares}</span>
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center space-x-2 text-gray-600 hover:text-navy"
                    >
                      <i className="fas fa-comment"></i>
                      <span>Reply</span>
                    </Button>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-600 hover:text-navy"
                    >
                      <i className="fas fa-bookmark"></i>
                    </Button>
                    
                    {/* Admin Controls */}
                    {user?.isAdmin && (
                      <div className="flex items-center space-x-1 ml-4 pl-4 border-l border-gray-200">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveUp(item.id)}
                          className="text-gray-500 hover:text-green-600 p-1"
                          title="Move Up"
                        >
                          <i className="fas fa-arrow-up text-xs"></i>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveDown(item.id)}
                          className="text-gray-500 hover:text-blue-600 p-1"
                          title="Move Down"
                        >
                          <i className="fas fa-arrow-down text-xs"></i>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditItem(item)}
                          className="text-gray-500 hover:text-yellow-600 p-1"
                          title="Edit"
                        >
                          <i className="fas fa-edit text-xs"></i>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-gray-500 hover:text-red-600 p-1"
                          title="Delete"
                        >
                          <i className="fas fa-trash text-xs"></i>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Loading indicator */}
          {loading && (
            <div className="text-center py-4">
              <div className="inline-flex items-center space-x-2 text-gray-600">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-navy rounded-full animate-spin"></div>
                <span>Loading more content...</span>
              </div>
            </div>
          )}
          
          {/* End of content */}
          {!hasMore && displayedItems.length > 0 && (
            <div className="text-center py-4 text-gray-500">
              <i className="fas fa-anchor text-2xl mb-2"></i>
              <p>You've reached the end</p>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {currentLevel.length === 0 && displayedItems.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <i className="fas fa-map-marked-alt text-4xl mb-4"></i>
          <p>No content available</p>
        </div>
      )}

      {/* Qaaq Store Display */}
      {breadcrumb.length > 0 && breadcrumb[breadcrumb.length - 1].id === 'qaaq-store' && (
        <div className="space-y-6">
          <QaaqStore
            location={`${breadcrumb[breadcrumb.length - 3]?.name || 'Port'}`}
            suburb={breadcrumb[breadcrumb.length - 2]?.name || 'Suburb'}
            port={breadcrumb[breadcrumb.length - 3]?.name || 'Port'}
            country={breadcrumb[0]?.name || 'Country'}
            userShipSchedule={{
              arrivalDate: "2025-02-15",
              departureDate: "2025-02-18"
            }}
          />
          
          {/* User Cards Below Qaaq Store */}
          <SuburbUsersDisplay 
            suburb={(breadcrumb[breadcrumb.length - 2]?.name || 'Suburb')}
            port={(breadcrumb[breadcrumb.length - 3]?.name || 'Port')}
            country={(breadcrumb[0]?.name || 'Country')}
          />
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit CPSS Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Title</label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Item title"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Content</label>
              <Textarea
                value={editForm.content}
                onChange={(e) => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Item content"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Author</label>
                <Input
                  value={editForm.author}
                  onChange={(e) => setEditForm(prev => ({ ...prev, author: e.target.value }))}
                  placeholder="Author name"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Author Rank</label>
                <Input
                  value={editForm.authorRank}
                  onChange={(e) => setEditForm(prev => ({ ...prev, authorRank: e.target.value }))}
                  placeholder="Captain, Officer, etc."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Ship Name</label>
                <Input
                  value={editForm.authorShip}
                  onChange={(e) => setEditForm(prev => ({ ...prev, authorShip: e.target.value }))}
                  placeholder="Ship name"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Category</label>
                <Select
                  value={editForm.category}
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Maritime Meetups">Maritime Meetups</SelectItem>
                    <SelectItem value="Local Tours">Local Tours</SelectItem>
                    <SelectItem value="Port Dining">Port Dining</SelectItem>
                    <SelectItem value="Shore Shopping">Shore Shopping</SelectItem>
                    <SelectItem value="Cultural Experience">Cultural Experience</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Tags (comma separated)</label>
              <Input
                value={editForm.tags}
                onChange={(e) => setEditForm(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="tag1, tag2, tag3"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setEditingItem(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} className="bg-navy hover:bg-navy/90">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
}