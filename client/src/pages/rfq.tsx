import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import type { User } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import UserDropdown from "@/components/user-dropdown";
import { ObjectUploader } from "@/components/ObjectUploader";
import { 
  ChevronDown, 
  Crown, 
  Plus, 
  Send, 
  Ship, 
  Clock, 
  MapPin, 
  AlertTriangle,
  Filter,
  Search,
  Paperclip,
  X
} from "lucide-react";

// Using public asset path for better reliability
const qaaqLogo = "/qaaq-logo.png";

interface RFQPageProps {
  user: User;
}

interface RFQRequest {
  id: string;
  title: string;
  category: string;
  description: string;
  vesselName: string;
  location: string;
  urgency: 'normal' | 'urgent' | 'critical';
  deadline: string;
  postedBy: string;
  postedAt: Date;
  status: 'active' | 'filled' | 'expired';
  attachments?: string[];
}

export default function RFQPage({ user }: RFQPageProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("feed");
  const [rfqRequests, setRfqRequests] = useState<RFQRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState({
    category: "all",
    urgency: "all",
    location: ""
  });

  // Form state for creating new RFQ
  const [formData, setFormData] = useState({
    description: "",
    location: "",
    deadline: ""
  });
  const [attachments, setAttachments] = useState<string[]>([]);

  // Upload handlers
  const handleGetUploadParameters = async () => {
    try {
      const response = await fetch('/api/objects/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          method: 'PUT' as const,
          url: data.uploadURL,
        };
      } else {
        throw new Error('Failed to get upload URL');
      }
    } catch (error) {
      console.error('Error getting upload URL:', error);
      throw error;
    }
  };

  const handleUploadComplete = (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const fileUrls = result.successful.map((file: any) => file.name);
      setAttachments(prev => [...prev, ...fileUrls]);
      
      toast({
        title: "Files uploaded successfully",
        description: `${result.successful.length} file(s) added to your RFQ`,
      });
    }
  };

  const removeAttachment = (fileUrl: string) => {
    setAttachments(prev => prev.filter(url => url !== fileUrl));
  };

  // Check premium status for known testing accounts since JWT is disabled
  const testingEmails = ['workship.ai@gmail.com', 'mushy.piyush@gmail.com'];
  const userEmail = user?.email || localStorage.getItem('user_email') || '';
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const isPremium = testingEmails.includes(userEmail) || isAdmin;

  // Senior maritime roles that can post RFQs
  const seniorRoles = [
    'Ship Manager', 'Superintendent', 'Captain', 'Chief Engineer',
    'Chief Officer', 'Chief Mate', 'Port Captain', 'Technical Manager',
    'Fleet Manager', 'Marine Superintendent', 'Technical Superintendent'
  ];

  const canPostRFQ = user?.isAdmin || seniorRoles.includes(user?.maritimeRank || '');

  // Helper function to convert full name to initials for privacy protection
  const getInitials = (fullName: string): string => {
    if (!fullName) return 'N/A';
    return fullName
      .split(' ')
      .map(name => name.charAt(0).toUpperCase())
      .join('.');
  };

  // Helper function to convert vessel name to privacy format (MV Axxx Vxxx)
  const getVesselInitials = (vesselName: string): string => {
    if (!vesselName) return 'Vessel N/A';
    // Extract prefix and name parts
    const prefixMatch = vesselName.match(/^(M\.V\.|MV|MS|MT)\s+(.+)/i);
    if (!prefixMatch) return vesselName; // Return as-is if no standard prefix
    
    const prefix = prefixMatch[1].replace(/\./g, '').toUpperCase(); // Remove dots, make uppercase
    const namesPart = prefixMatch[2];
    const words = namesPart.split(' ').filter(word => word.length > 0);
    
    if (words.length === 0) return `${prefix} N/A`;
    
    // Format as "MV Axxx Vxxx" - first letter + xxx for each word
    const formattedWords = words.map(word => word.charAt(0).toUpperCase() + 'xxx');
    return `${prefix} ${formattedWords.join(' ')}`;
  };

  // Mock data for demonstration
  useEffect(() => {
    const mockRFQs: RFQRequest[] = [
      {
        id: "1",
        title: "Main Engine Spare Parts Required",
        category: "parts",
        description: "Looking for MAN B&W 6S60MC main engine spare parts including fuel pump components and cylinder head gaskets. Urgent requirement due to upcoming dry dock.",
        vesselName: "M.V. Atlantic Voyager",
        location: "Singapore",
        urgency: "urgent",
        deadline: "2024-01-15",
        postedBy: "Chief Engineer J.S.",
        postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: "active",
        attachments: ["https://via.placeholder.com/300x200/f97316/ffffff?text=Engine+Part+1", "https://via.placeholder.com/300x200/f97316/ffffff?text=Engine+Part+2"]
      },
      {
        id: "2", 
        title: "Propeller Shaft Alignment Service",
        category: "service",
        description: "Need certified technicians for propeller shaft alignment and stern tube bearing inspection during port call.",
        vesselName: "M.V. Ocean Pioneer",
        location: "Rotterdam",
        urgency: "normal",
        deadline: "2024-01-20",
        postedBy: "Captain M.R.",
        postedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: "active",
        attachments: []
      },
      {
        id: "3",
        title: "Emergency Generator Repair",
        category: "emergency",
        description: "Emergency generator failure, need immediate repair service. Vessel currently anchored awaiting assistance.",
        vesselName: "M.V. Baltic Star",
        location: "Hamburg",
        urgency: "critical",
        deadline: "2024-01-10",
        postedBy: "Chief Engineer A.H.",
        postedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        status: "active",
        attachments: ["https://via.placeholder.com/400x300/dc2626/ffffff?text=Generator+Damage+Video"]
      }
    ];
    
    setRfqRequests(mockRFQs);
    setIsLoading(false);
  }, []);

  const handleSubmitRFQ = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canPostRFQ) {
      toast({
        title: "Access Restricted",
        description: "Only senior maritime professionals can post RFQs.",
        variant: "destructive"
      });
      return;
    }

    // Validate required fields
    if (!formData.description || !formData.location) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    // Extract title from first line of description
    const titleFromDescription = formData.description.split('\n')[0].trim() || formData.description.substring(0, 50).trim();

    try {
      // Create new RFQ (mock implementation)
      const newRFQ: RFQRequest = {
        id: Date.now().toString(),
        title: titleFromDescription,
        category: "general", // Default category
        description: formData.description,
        vesselName: "N/A", // No vessel name collected
        location: formData.location,
        urgency: "normal", // Default urgency
        deadline: formData.deadline,
        postedBy: `${user.maritimeRank} ${getInitials(user.fullName || '')}`,
        postedAt: new Date(),
        status: "active",
        attachments: attachments
      };

      setRfqRequests(prev => [newRFQ, ...prev]);
      
      // Reset form
      setFormData({
        description: "",
        location: "",
        deadline: ""
      });
      setAttachments([]);

      toast({
        title: "RFQ Posted Successfully",
        description: "Your request has been posted to the maritime community.",
      });
      
    } catch (error) {
      console.error('Error posting RFQ:', error);
      toast({
        title: "Failed to Post RFQ",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'urgent': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'parts': return '🔧';
      case 'service': return '⚙️';
      case 'emergency': return '🚨';
      case 'supply': return '📦';
      default: return '🔧';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <div className="h-[90vh] bg-gradient-to-br from-orange-50 via-white to-yellow-50 flex flex-col">
      {/* Header - Maritime Theme */}
      <header className="bg-white text-black shadow-md relative overflow-hidden flex-shrink-0 z-[1002] border-b-2 border-orange-400">
        <div className="absolute inset-0 bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 opacity-50"></div>
        
        <div className="relative z-10 px-2 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-shrink-0">
              <DropdownMenu onOpenChange={setIsMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="p-1 h-auto w-auto rounded-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                    data-testid="button-main-menu"
                  >
                    <div className="flex items-center space-x-2">
                      <ChevronDown className={`w-4 h-4 text-white transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
                      <div className="w-10 h-10 rounded-full bg-white border-2 border-white shadow-lg flex items-center justify-center">
                        <img 
                          src={qaaqLogo} 
                          alt="QAAQ Logo" 
                          className="w-full h-full rounded-full object-cover"
                        />
                      </div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 bg-white border border-gray-200 shadow-lg rounded-lg">
                  <DropdownMenuItem 
                    onClick={() => setLocation("/")}
                    className="cursor-pointer flex items-center space-x-3 px-4 py-3 hover:bg-orange-50 transition-colors"
                    data-testid="menu-item-home"
                  >
                    <i className="fas fa-home text-orange-600 w-4"></i>
                    <span className="text-gray-700 font-medium">Home</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setLocation("/glossary")}
                    className="cursor-pointer flex items-center space-x-3 px-4 py-3 hover:bg-orange-50 transition-colors"
                    data-testid="menu-item-dictionary"
                  >
                    <i className="fas fa-ship text-orange-600 w-4"></i>
                    <span className="text-gray-700 font-medium">Shipping Dictionary</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setLocation("/question-bank")}
                    className="cursor-pointer flex items-center space-x-3 px-4 py-3 hover:bg-orange-50 transition-colors"
                    data-testid="menu-item-questions"
                  >
                    <i className="fas fa-question-circle text-orange-600 w-4"></i>
                    <span className="text-gray-700 font-medium">QuestionBank</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setLocation("/machine-tree")}
                    className="cursor-pointer flex items-center space-x-3 px-4 py-3 hover:bg-orange-50 transition-colors"
                    data-testid="menu-item-machine-tree"
                  >
                    <i className="fas fa-sitemap text-orange-600 w-4"></i>
                    <span className="text-gray-700 font-medium">Machine Tree</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setLocation("/workshop-tree")}
                    className="cursor-pointer flex flex-col items-start space-y-1 px-4 py-3 hover:bg-orange-50 transition-colors"
                    data-testid="menu-item-workshop-tree"
                  >
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-network-wired text-orange-600 w-4"></i>
                      <span className="text-gray-700 font-medium">Workshop Tree</span>
                    </div>
                    <div className="text-xs text-gray-500 pl-6 leading-tight">
                      System → Equipment → Task → Expertise → Port → Workshop
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setLocation("/premium")}
                    className="cursor-pointer flex items-center space-x-3 px-4 py-3 hover:bg-orange-50 transition-colors"
                    data-testid="menu-item-premium"
                  >
                    <i className="fas fa-crown text-orange-600 w-4"></i>
                    <span className="text-gray-700 font-medium">Premium Subscription</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setLocation("/readme")}
                    className="cursor-pointer flex items-center space-x-3 px-4 py-3 hover:bg-orange-50 transition-colors"
                    data-testid="menu-item-readme"
                  >
                    <i className="fas fa-info-circle text-orange-600 w-4"></i>
                    <span className="text-gray-700 font-medium">ReadMe</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="min-w-0 flex items-center space-x-2">
                <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent whitespace-nowrap">
                  Qaaqit Premium
                </h1>
                {isPremium && (
                  <Crown className="w-5 h-5 text-yellow-500 animate-pulse" />
                )}
              </div>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
              <UserDropdown user={user} onLogout={() => window.location.reload()} />
            </div>
          </div>
        </div>
      </header>

      {/* RFQ Header Section */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-4">
        <div className="flex items-center gap-3">
          <i className="fas fa-clipboard-list text-2xl"></i>
          <div>
            <h2 className="text-xl font-bold">Requisition for Quotation Board</h2>
            <p className="text-orange-100 text-sm">Maritime services & ship parts marketplace</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
          {/* Tab Navigation */}
          <div className="bg-white border-b border-orange-200">
            <div className="px-6 py-3">
              <TabsList className="grid w-full grid-cols-2 bg-orange-50 border-0 rounded-lg p-1 max-w-md">
                <TabsTrigger 
                  value="feed" 
                  className="data-[state=active]:bg-white data-[state=active]:text-orange-600 text-gray-600 font-semibold transition-all duration-200 rounded-md py-2"
                  data-testid="tab-rfq-feed"
                >
                  <i className="fas fa-list mr-2"></i>
                  RFQ Feed
                </TabsTrigger>
                <TabsTrigger 
                  value="create" 
                  className="data-[state=active]:bg-white data-[state=active]:text-orange-600 text-gray-600 font-semibold transition-all duration-200 rounded-md py-2"
                  data-testid="tab-create-rfq"
                  disabled={!canPostRFQ}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Post RFQ
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* RFQ Feed Tab */}
          <TabsContent value="feed" className="flex-1 overflow-auto m-0">
            <div className="p-6 space-y-6">
              {/* Filter Controls */}
              <div className="flex flex-wrap gap-4 p-4 bg-white rounded-lg border border-orange-200">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-gray-700">Filter:</span>
                </div>
                <Select value={filter.category} onValueChange={(value) => setFilter(prev => ({...prev, category: value}))}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="parts">Spare Parts</SelectItem>
                    <SelectItem value="repair">Repair Workshop</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="supply">IMPA STORES</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filter.urgency} onValueChange={(value) => setFilter(prev => ({...prev, urgency: value}))}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Urgency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Urgency</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Filter by location..."
                  value={filter.location}
                  onChange={(e) => setFilter(prev => ({...prev, location: e.target.value}))}
                  className="w-48"
                />
              </div>

              {/* RFQ Cards */}
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading RFQ requests...</p>
                  </div>
                ) : rfqRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Ship className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">No RFQ requests found</p>
                    <p className="text-gray-500">Be the first to post a maritime requirement!</p>
                  </div>
                ) : (
                  rfqRequests.map((rfq) => (
                    <Card key={rfq.id} className="border border-orange-200 hover:shadow-lg transition-all cursor-pointer">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className={getUrgencyColor(rfq.urgency)}>
                                {rfq.urgency.toUpperCase()}
                              </Badge>
                              <span className="text-2xl">{getCategoryIcon(rfq.category)}</span>
                            </div>
                            <h3 className="font-semibold text-lg">{rfq.title}</h3>
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            {formatTimeAgo(rfq.postedAt)}
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Ship className="w-4 h-4 text-orange-600" />
                            <span className="font-medium">{getVesselInitials(rfq.vesselName)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-orange-600" />
                            <span>{rfq.location}</span>
                          </div>
                        </div>
                        
                        <p className="text-gray-700 line-clamp-3">{rfq.description}</p>
                        
                        {/* Attachments Display - flush with left edge */}
                        {rfq.attachments && rfq.attachments.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 -mx-6 px-6">
                            {rfq.attachments.slice(0, 4).map((attachment, index) => (
                              <div key={index} className="relative">
                                {attachment.includes('video') || attachment.includes('.mp4') || attachment.includes('.mov') ? (
                                  <div className="relative bg-gray-100 rounded aspect-video flex items-center justify-center">
                                    <div className="text-center">
                                      <div className="w-8 h-8 mx-auto mb-1 bg-orange-600 rounded-full flex items-center justify-center">
                                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M8 5v14l11-7z"/>
                                        </svg>
                                      </div>
                                      <p className="text-xs text-gray-600">Video</p>
                                    </div>
                                  </div>
                                ) : (
                                  <img 
                                    src={attachment} 
                                    alt={`RFQ attachment ${index + 1}`}
                                    className="w-full h-24 object-cover rounded border border-orange-200"
                                    data-testid={`img-rfq-attachment-${index}`}
                                  />
                                )}
                                {rfq.attachments && rfq.attachments.length > 4 && index === 3 && (
                                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded flex items-center justify-center">
                                    <span className="text-white font-semibold">+{rfq.attachments.length - 4} more</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                          <div className="text-sm text-gray-500">
                            <div>By: {rfq.postedBy}</div>
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              Deadline: {new Date(rfq.deadline).toLocaleDateString()}
                            </div>
                          </div>
                          <Button size="sm" variant="outline" className="border-orange-200 hover:bg-orange-50">
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* Create RFQ Tab */}
          <TabsContent value="create" className="flex-1 overflow-auto m-0">
            <div className="p-6">
              {canPostRFQ ? (
                <Card className="max-w-2xl mx-auto">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="w-5 h-5" />
                      Post New RFQ Request
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent>
                    <form onSubmit={handleSubmitRFQ} className="space-y-4">
                      <div>
                        <Label htmlFor="location">Current Location *</Label>
                        <Input
                          id="location"
                          placeholder="Port/Position"
                          value={formData.location}
                          onChange={(e) => setFormData(prev => ({...prev, location: e.target.value}))}
                          className="border-orange-200 focus:border-orange-500"
                          data-testid="input-rfq-location"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="description">Detailed Requirements *</Label>
                        <Textarea
                          id="description"
                          placeholder="Provide detailed specifications, quantities, technical requirements, and any special conditions..."
                          rows={5}
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                          className="border-orange-200 focus:border-orange-500"
                          data-testid="textarea-rfq-description"
                        />
                      </div>
                      
                      {/* Photo/Video Upload Section */}
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Photos / Videos (Optional)
                        </Label>
                        <div className="space-y-3">
                          {/* Upload Button */}
                          <ObjectUploader
                            maxNumberOfFiles={5}
                            maxFileSize={52428800} // 50MB
                            onGetUploadParameters={handleGetUploadParameters}
                            onComplete={handleUploadComplete}
                            buttonClassName="w-full border-2 border-dashed border-orange-300 hover:border-orange-500 bg-orange-50 hover:bg-orange-100 text-orange-700 py-4 px-4 rounded-lg transition-colors"
                          >
                            <div className="flex flex-col items-center gap-2">
                              <Paperclip className="w-5 h-5" />
                              <span className="text-sm font-medium">
                                Upload Photos/Videos
                              </span>
                              <span className="text-xs text-gray-500">
                                JPG, PNG, MP4, MOV (Max 50MB, 5 files)
                              </span>
                            </div>
                          </ObjectUploader>

                          {/* Uploaded Files List */}
                          {attachments.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-gray-700">
                                Uploaded files ({attachments.length}):
                              </p>
                              <div className="space-y-2 max-h-32 overflow-y-auto">
                                {attachments.map((fileUrl, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                                  >
                                    <span className="text-sm text-gray-600 truncate flex-1 mr-2">
                                      {fileUrl.split('/').pop() || `File ${index + 1}`}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeAttachment(fileUrl)}
                                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="deadline">Response Deadline</Label>
                        <Input
                          type="date"
                          id="deadline"
                          value={formData.deadline}
                          onChange={(e) => setFormData(prev => ({...prev, deadline: e.target.value}))}
                          className="border-orange-200 focus:border-orange-500"
                          data-testid="input-rfq-deadline"
                        />
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full bg-orange-600 hover:bg-orange-700"
                        data-testid="button-submit-rfq"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Post RFQ Request
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              ) : (
                <Card className="max-w-md mx-auto text-center">
                  <CardContent className="pt-6">
                    <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Senior Role Required</h3>
                    <p className="text-gray-600 mb-4">
                      Only senior maritime professionals can post RFQ requests.
                    </p>
                    <div className="text-sm text-gray-500">
                      <p className="font-medium mb-2">Authorized roles:</p>
                      <ul className="space-y-1">
                        <li>• Ship Manager</li>
                        <li>• Superintendent</li>
                        <li>• Captain</li>
                        <li>• Chief Engineer</li>
                        <li>• Technical Manager</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}