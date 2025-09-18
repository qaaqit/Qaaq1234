import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import UserDropdown from "@/components/user-dropdown";
import { apiRequest, queryClient } from "@/lib/queryClient";
import LEDIndicator from "@/components/LEDIndicator";
import { 
  ArrowLeft,
  Clock, 
  MapPin, 
  Ship, 
  AlertTriangle,
  Share2,
  Send,
  Eye,
  MessageSquare,
  Paperclip,
  ExternalLink,
  Lightbulb,
  CheckCircle,
  Calendar,
  Download,
  FileText,
  Image as ImageIcon,
  Video,
  User as UserIcon,
  DollarSign,
  Loader2,
  Brain
} from "lucide-react";

// Using public asset path for better reliability
const qaaqLogo = "/qaaq-logo.png";

interface RFQDetailPageProps {
  user: User | null;
}

interface SpecificationMatch {
  specId: string;
  matched: boolean;
  confidence: number;
  matchedText?: string;
  reason?: string;
}

interface RFQRequest {
  id: string;
  title: string;
  description: string;
  vesselName: string;
  vesselType?: string;
  location: string;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  budget?: string;
  deadline: string;
  contactMethod: string;
  attachments?: string[];
  extractedSpecifications?: {
    categories: Array<{
      name: string;
      color: string;
      specifications: Array<{
        key: string;
        value: string;
        type?: string;
      }>;
    }>;
  };
  status: 'active' | 'closed' | 'fulfilled';
  viewCount: number;
  quoteCount: number;
  createdAt: string;
  // User info from join
  userFullName: string;
  userRank: string;
  userId: string;
  // Additional computed properties
  postedBy: string;
  category: string;
  postedAt: string;
  // Slug components
  port?: string;
  date?: string;
  userPublicId?: string;
  serial?: string;
  port_slug?: string;
}

interface Quote {
  id: string;
  supplierName: string;
  supplierCompany: string;
  price: number;
  currency: string;
  deliveryTime: string;
  specifications: Record<string, string>; // key-value pairs of spec matches
  notes?: string;
  createdAt: string;
}

export default function RFQDetailPage({ user }: RFQDetailPageProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const params = useParams();
  
  const [rfqData, setRfqData] = useState<RFQRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]); // Mock quotes for now
  const [quoteForm, setQuoteForm] = useState({
    price: "",
    currency: "USD",
    readinessDate: "immediate",
    customDate: "",
    notes: "",
    customText: "",
    checkedSpecs: [] as string[],
    aiMatchedSpecs: [] as SpecificationMatch[],
    overallMatchScore: 0
  });
  const [isAnalyzingSpecs, setIsAnalyzingSpecs] = useState(false);

  // Helper function to get proper image URL for attachments
  const getAttachmentUrl = (attachment: string): string => {
    // If it's a full Google Cloud Storage URL for private objects, extract the object ID and use our proxy
    if (attachment.startsWith('https://storage.googleapis.com/') && attachment.includes('/.private/uploads/')) {
      const objectId = attachment.split('/').pop();
      if (objectId) {
        return `/api/objects/${objectId}`;
      }
    }
    
    // If it's already a full URL or replit object store URL, return as-is
    if (attachment.startsWith('http') || attachment.startsWith('/replit-objstore-')) {
      return attachment;
    }
    
    // If it's just a filename, construct the object storage URL
    return `/replit-objstore-b2ad59ef-ca8b-42b8-bc12-f53a0b9ec0ee/public/${attachment}`;
  };
  
  // Get attachment type
  const getAttachmentType = (url: string): 'image' | 'video' | 'document' => {
    const extension = url.split('.').pop()?.toLowerCase();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const videoExtensions = ['mp4', 'webm', 'avi', 'mov'];
    
    if (imageExtensions.includes(extension || '')) return 'image';
    if (videoExtensions.includes(extension || '')) return 'video';
    return 'document';
  };

  // Helper function to get initials for privacy
  const getInitials = (fullName: string): string => {
    if (!fullName) return 'N/A';
    return fullName
      .split(' ')
      .map(name => name.charAt(0).toUpperCase())
      .join('.');
  };

  // Helper function to format vessel name for privacy
  const getVesselInitials = (vesselName: string): string => {
    if (!vesselName) return 'Vessel N/A';
    const prefixMatch = vesselName.match(/^(M\.V\.|MV|MS|MT)\s+(.+)/i);
    if (!prefixMatch) return vesselName;
    
    const prefix = prefixMatch[1].replace(/\./g, '').toUpperCase();
    const namesPart = prefixMatch[2];
    const words = namesPart.split(' ').filter(word => word.length > 0);
    
    if (words.length === 0) return `${prefix} N/A`;
    
    const formattedWords = words.map(word => word.charAt(0).toUpperCase() + 'xxx');
    return `${prefix} ${formattedWords.join(' ')}`;
  };

  // Determine URL format: simple (port/serial), legacy slug (4 parts), or UUID
  const isSimpleSlugUrl = params.port && params.serial && !params.date && !params.userPublicId;
  const isLegacySlugUrl = params.port && params.date && params.userPublicId && params.serial;
  const isUuidUrl = params.id && !isSimpleSlugUrl && !isLegacySlugUrl;

  // Fetch RFQ data based on URL format
  useEffect(() => {
    const fetchRFQData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let response;
        let apiUrl;

        if (isSimpleSlugUrl) {
          // Fetch via simple port/serial endpoint
          apiUrl = `/api/rfq/${params.port}/${params.serial}`;
        } else if (isLegacySlugUrl) {
          // Fetch via legacy 4-part slug endpoint
          apiUrl = `/api/rfq/by-slug/${params.port}/${params.date}/${params.userPublicId}/${params.serial}`;
        } else if (isUuidUrl) {
          // First try to resolve UUID to slug for redirect
          const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
          const resolveResponse = await fetch(`/api/rfq/resolve/${params.id}`, {
            headers: token ? {
              'Authorization': `Bearer ${token}`
            } : {}
          });
          
          if (resolveResponse.ok) {
            const data = await resolveResponse.json();
            // If canonical URL provided, redirect
            if (data.canonical) {
              setLocation(data.canonical);
              return;
            }
            // Otherwise use the RFQ data directly from the resolve endpoint
            const mappedRfq = {
              ...data,
              postedBy: `${data.userRank || ''} ${getInitials(data.userFullName || '')}`,
              postedAt: data.createdAt,
              category: data.category || 'parts'
            };
            
            setRfqData(mappedRfq);
            setIsLoading(false);
            
            // Load mock quotes for testing
            loadMockQuotes();
            return;
          }
          
          // If resolve fails, try direct UUID fetch as fallback
          apiUrl = `/api/rfq/${params.id}`;
        } else {
          throw new Error('Invalid URL format');
        }

        const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
        response = await fetch(apiUrl, {
          headers: token ? {
            'Authorization': `Bearer ${token}`
          } : {}
        });

        if (response.ok) {
          const data = await response.json();
          
          // Map the backend response to include display properties
          const mappedRfq = {
            ...data,
            postedBy: `${data.userRank || ''} ${getInitials(data.userFullName || '')}`,
            postedAt: data.createdAt,
            category: data.category || 'parts'
          };
          
          setRfqData(mappedRfq);
          
          // Load mock quotes for testing
          loadMockQuotes();
          
          // Update view count if we have a valid RFQ
          if (mappedRfq.id && (isSimpleSlugUrl || isLegacySlugUrl)) {
            // Track view for slug URLs only to avoid double counting
            fetch(`/api/rfq/${mappedRfq.id}/view`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            }).catch(() => {}); // Silent fail for view tracking
          }
        } else if (response.status === 404) {
          setError('RFQ not found');
        } else {
          throw new Error('Failed to fetch RFQ details');
        }
      } catch (error) {
        console.error('Error fetching RFQ details:', error);
        setError(error instanceof Error ? error.message : 'Failed to load RFQ details');
      } finally {
        setIsLoading(false);
      }
    };

    if (isSimpleSlugUrl || isLegacySlugUrl || isUuidUrl) {
      fetchRFQData();
    } else {
      setError('Invalid URL format');
      setIsLoading(false);
    }
  }, [params, isSimpleSlugUrl, isLegacySlugUrl, isUuidUrl, setLocation]);

  // Load mock quotes for testing
  const loadMockQuotes = () => {
    const mockQuotes: Quote[] = [
      {
        id: "q1",
        supplierName: "Marine Parts Co.",
        supplierCompany: "Singapore Marine Supplies",
        price: 45000,
        currency: "USD",
        deliveryTime: "3-5 days",
        specifications: {
          "Dynamic Load Test": "upto satisfaction of class NKK",
          "Material": "Steel",
          "Warranty": "2 years",
          "Pump Capacity": "50L",
          "Certification": "DNV GL approved"
        },
        notes: "Ready stock available. Includes installation support.",
        createdAt: new Date().toISOString()
      },
      {
        id: "q2",
        supplierName: "Global Ship Supplies",
        supplierCompany: "Global Marine Solutions",
        price: 42000,
        currency: "USD",
        deliveryTime: "7-10 days",
        specifications: {
          "Dynamic Load Test": "class approved",
          "Material": "Steel",
          "Warranty": "1 year",
          "Pump Capacity": "45L",
          "Certification": "ABS certified"
        },
        notes: "Bulk discount available for multiple units.",
        createdAt: new Date().toISOString()
      },
      {
        id: "q3",
        supplierName: "Maritime Express",
        supplierCompany: "Express Maritime Trading",
        price: 48000,
        currency: "USD",
        deliveryTime: "2-3 days",
        specifications: {
          "Dynamic Load Test": "upto satisfaction of class NKK",
          "Material": "Stainless Steel",
          "Warranty": "3 years",
          "Pump Capacity": "50L",
          "Certification": "DNV GL approved"
        },
        notes: "Premium quality with extended warranty. Express delivery available.",
        createdAt: new Date().toISOString()
      }
    ];
    
    setQuotes(mockQuotes);
  };

  // Check if a quote specification matches the RFQ specification
  const checkSpecMatch = (rfqValue: string, quoteValue: string): boolean => {
    if (!rfqValue || !quoteValue) return false;
    
    // Normalize values for comparison
    const normalizedRfq = rfqValue.toLowerCase().trim();
    const normalizedQuote = quoteValue.toLowerCase().trim();
    
    // Check for exact match or contains
    return normalizedRfq === normalizedQuote || normalizedQuote.includes(normalizedRfq);
  };

  // Get all specifications from RFQ
  const getAllSpecifications = () => {
    const specs: Array<{ key: string; value: string }> = [];
    
    if (rfqData?.extractedSpecifications?.categories) {
      rfqData.extractedSpecifications.categories.forEach(category => {
        category.specifications.forEach(spec => {
          specs.push(spec);
        });
      });
    }
    
    return specs;
  };

  // Handle AI specification matching
  const handleAIMatching = async () => {
    if (!quoteForm.customText || !rfqData?.extractedSpecifications) {
      toast({
        title: "Please enter custom text",
        description: "Enter your product details to match against requirements.",
        variant: "default"
      });
      return;
    }

    setIsAnalyzingSpecs(true);
    
    try {
      const response = await fetch('/api/rfq/match-specs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          vendorText: quoteForm.customText,
          specifications: rfqData.extractedSpecifications.categories || [],
          rfqId: rfqData.id
        })
      });

      if (!response.ok) throw new Error('Failed to analyze specifications');

      const result = await response.json();
      
      if (result.success && result.matchResults) {
        const matches = result.matchResults.matches || [];
        setQuoteForm(prev => ({
          ...prev,
          aiMatchedSpecs: matches,
          overallMatchScore: result.matchResults.overallScore || 0
        }));

        toast({
          title: "AI Analysis Complete",
          description: `Matched ${matches.filter((m: any) => m.matched).length} out of ${matches.length} specifications (${result.matchResults.overallScore}% match)`,
        });
      }
    } catch (error) {
      console.error('AI matching error:', error);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze specifications. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzingSpecs(false);
    }
  };

  // Handle specification checkbox toggle
  const handleSpecCheckboxToggle = (specId: string) => {
    setQuoteForm(prev => ({
      ...prev,
      checkedSpecs: prev.checkedSpecs.includes(specId)
        ? prev.checkedSpecs.filter(id => id !== specId)
        : [...prev.checkedSpecs, specId]
    }));
  };

  // Check if a specification is matched (manually or by AI)
  const isSpecMatched = (specId: string): { matched: boolean; confidence: number } => {
    if (quoteForm.checkedSpecs.includes(specId)) {
      return { matched: true, confidence: 100 };
    }
    
    const aiMatch = quoteForm.aiMatchedSpecs.find((m: SpecificationMatch) => m.specId === specId);
    if (aiMatch && aiMatch.matched) {
      return { matched: true, confidence: aiMatch.confidence };
    }
    
    return { matched: false, confidence: 0 };
  };

  // Handle quote submission
  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !rfqData) {
      toast({
        title: "Login Required",
        description: "Please log in to submit quotes.",
        variant: "destructive"
      });
      return;
    }

    if (!quoteForm.price || !quoteForm.notes) {
      toast({
        title: "Missing Information",
        description: "Please fill in price and notes.",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('/api/rfq/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          rfqId: rfqData.id,
          price: parseFloat(quoteForm.price),
          currency: quoteForm.currency,
          readinessDate: quoteForm.readinessDate,
          customDate: quoteForm.customDate || null,
          notes: quoteForm.notes
        })
      });

      if (response.ok) {
        toast({
          title: "Quote Submitted",
          description: "Your quote has been sent to the RFQ owner."
        });
        setShowQuoteModal(false);
        setQuoteForm({
          price: "",
          currency: "USD",
          readinessDate: "immediate",
          customDate: "",
          notes: ""
        });
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to submit quote' }));
        throw new Error(errorData.message);
      }
    } catch (error) {
      console.error('Error submitting quote:', error);
      toast({
        title: "Failed to Submit Quote",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  };

  // Handle sharing
  const handleShare = async (method: 'whatsapp' | 'copy' | 'general') => {
    if (!rfqData) return;

    // Use simple slug URL if available
    let shareUrl;
    if (rfqData.port_slug && rfqData.serial) {
      shareUrl = `${window.location.origin}/rfq/${rfqData.port_slug}/${rfqData.serial}`;
    } else {
      shareUrl = window.location.href; // Fallback to current URL
    }

    const shareText = `🚢 Maritime RFQ Request\n\n📋 ${rfqData.title}\n📍 ${rfqData.location}\n⏰ Deadline: ${rfqData.deadline ? new Date(rfqData.deadline).toLocaleDateString() : 'No deadline'}\n\n#MaritimeRFQ #Shipping #QuoteRequest`;
    
    try {
      switch (method) {
        case 'whatsapp':
          const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
          window.open(whatsappUrl, '_blank');
          break;
        
        case 'copy':
          await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
          toast({
            title: "Link Copied",
            description: "RFQ link copied to clipboard"
          });
          break;
        
        case 'general':
          if (navigator.share) {
            await navigator.share({
              title: `RFQ: ${rfqData.title}`,
              text: shareText,
              url: shareUrl
            });
          } else {
            // Fallback to copy
            await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
            toast({
              title: "Link Copied",
              description: "RFQ link copied to clipboard"
            });
          }
          break;
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast({
        title: "Sharing Failed",
        description: "Could not share the RFQ",
        variant: "destructive"
      });
    }
  };

  // Get urgency color
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  // Get urgency icon
  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <Clock className="w-4 h-4" />;
      case 'low': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header with logo */}
        <div className="border-b bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/rfq')}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to RFQs
              </Button>
              <img src={qaaqLogo} alt="QAAQ Connect" className="h-8" />
              <span className="text-lg font-semibold text-navy">RFQ Details</span>
            </div>
            {user && <UserDropdown user={user} />}
          </div>
        </div>

        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-navy to-ocean-teal rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Ship className="w-8 h-8 text-white" />
            </div>
            <p className="text-maritime-grey" data-testid="text-loading">Loading RFQ details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header with logo */}
        <div className="border-b bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/rfq')}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to RFQs
              </Button>
              <img src={qaaqLogo} alt="QAAQ Connect" className="h-8" />
              <span className="text-lg font-semibold text-navy">RFQ Details</span>
            </div>
            {user && <UserDropdown user={user} />}
          </div>
        </div>

        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2" data-testid="text-error-title">RFQ Not Found</h2>
            <p className="text-maritime-grey mb-4" data-testid="text-error-message">{error}</p>
            <Button onClick={() => setLocation('/rfq')} data-testid="button-back-to-rfqs">
              View All RFQs
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!rfqData) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-maritime-grey" data-testid="text-no-data">No RFQ data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header with logo and navigation */}
      <div className="border-b bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/rfq')}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to RFQs
            </Button>
            <img src={qaaqLogo} alt="QAAQ Connect" className="h-8" />
            <span className="text-lg font-semibold text-navy">RFQ Details</span>
          </div>
          {user && <UserDropdown user={user} />}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* RFQ Details Card */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-xl mb-2" data-testid="text-rfq-title">{rfqData.title}</CardTitle>
                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                  <div className="flex items-center space-x-1">
                    <span data-testid="text-posted-by">Posted by {rfqData.postedBy}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span data-testid="text-posted-time">
                      {new Date(rfqData.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Eye className="w-4 h-4" />
                    <span data-testid="text-view-count">{rfqData.viewCount} views</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MessageSquare className="w-4 h-4" />
                    <span data-testid="text-quote-count">{rfqData.quoteCount} quotes</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={getUrgencyColor(rfqData.urgency)} 
                    className="flex items-center space-x-1"
                    data-testid={`badge-urgency-${rfqData.urgency}`}
                  >
                    {getUrgencyIcon(rfqData.urgency)}
                    <span>{rfqData.urgency?.toUpperCase() || 'STANDARD'}</span>
                  </Badge>
                  <Badge variant="outline" data-testid={`badge-status-${rfqData.status}`}>
                    {rfqData.status?.toUpperCase() || 'PENDING'}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShare('general')}
                  data-testid="button-share"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Main content grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                {/* Description Section */}
                <div>
                  <h3 className="font-semibold mb-2 text-lg">Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap" data-testid="text-rfq-description">
                    {rfqData.description}
                  </p>
                </div>

                <Separator />

                {/* Extracted Specifications Section */}
                {rfqData.extractedSpecifications && rfqData.extractedSpecifications.categories.length > 0 && (
                  <>
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Lightbulb className="h-5 w-5 text-purple-600" />
                        <h3 className="font-semibold text-lg">Extracted Specifications</h3>
                      </div>
                      <div className="space-y-4">
                        {rfqData.extractedSpecifications.categories.map((category, idx) => (
                          <Card 
                            key={idx} 
                            className="border-l-4 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                            style={{ borderLeftColor: category.color || '#9333ea' }}
                          >
                            <CardHeader className="pb-3" style={{ backgroundColor: `${category.color}10` || '#9333ea10' }}>
                              <h4 className="font-semibold text-sm flex items-center gap-2" style={{ color: category.color || '#9333ea' }}>
                                <CheckCircle className="h-4 w-4" />
                                {category.name}
                              </h4>
                            </CardHeader>
                            <CardContent className="pt-3">
                              <ul className="space-y-2">
                                {category.specifications.map((spec, specIdx) => (
                                  <li key={specIdx} className="flex items-start gap-2 text-sm">
                                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                      <span className="font-medium text-gray-700">{spec.key}:</span>{' '}
                                      <span className="text-gray-600">{spec.value}</span>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Attachments Gallery Section */}
                {rfqData.attachments && rfqData.attachments.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Paperclip className="h-5 w-5 text-gray-600" />
                      <h3 className="font-semibold text-lg">Attachments ({rfqData.attachments.length})</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {rfqData.attachments.map((attachment, idx) => {
                        const type = getAttachmentType(attachment);
                        const url = getAttachmentUrl(attachment);
                        const fileName = attachment.split('/').pop() || `File ${idx + 1}`;
                        
                        return (
                          <Card 
                            key={idx} 
                            className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
                            onClick={() => type === 'image' && setSelectedImage(url)}
                          >
                            {type === 'image' ? (
                              <div className="aspect-square relative bg-gray-100">
                                <img 
                                  src={url} 
                                  alt={fileName}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                  <ImageIcon className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            ) : type === 'video' ? (
                              <div className="aspect-square relative bg-gray-100 flex flex-col items-center justify-center">
                                <Video className="h-12 w-12 text-gray-400 mb-2" />
                                <span className="text-xs text-center px-2 truncate w-full">
                                  {fileName}
                                </span>
                              </div>
                            ) : (
                              <div className="aspect-square relative bg-gray-50 flex flex-col items-center justify-center p-4">
                                <FileText className="h-12 w-12 text-gray-400 mb-2" />
                                <span className="text-xs text-center truncate w-full px-2">
                                  {fileName}
                                </span>
                              </div>
                            )}
                            <div className="p-2 border-t bg-white">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(url, '_blank');
                                }}
                                data-testid={`button-download-${idx}`}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Quote Comparison Table Section */}
                {quotes.length > 0 && (
                  <div>
                    <Separator className="my-6" />
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <h3 className="font-semibold text-lg">Quote Comparison ({quotes.length} Quotes)</h3>
                      </div>
                      
                      {/* Legend */}
                      <div className="flex gap-4 mb-4 text-sm">
                        <div className="flex items-center gap-2">
                          <LEDIndicator matched={true} size="sm" />
                          <span className="text-gray-600">Specification Met</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <LEDIndicator matched={false} size="sm" />
                          <span className="text-gray-600">Not Met / Not Specified</span>
                        </div>
                      </div>
                      
                      {/* Comparison Table */}
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[200px] sticky left-0 bg-white">Specification</TableHead>
                              {quotes.map(quote => (
                                <TableHead key={quote.id} className="text-center min-w-[150px]">
                                  <div className="space-y-1">
                                    <div className="font-semibold text-xs">{quote.supplierCompany}</div>
                                    <div className="text-xs text-gray-600">{quote.price.toLocaleString()} {quote.currency}</div>
                                    <div className="text-xs text-gray-500">{quote.deliveryTime}</div>
                                  </div>
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getAllSpecifications().map((spec, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-medium sticky left-0 bg-white">
                                  <div className="space-y-1">
                                    <div className="text-sm font-medium">{spec.key}</div>
                                    <div className="text-xs text-gray-600">{spec.value}</div>
                                  </div>
                                </TableCell>
                                {quotes.map(quote => {
                                  const quoteValue = quote.specifications[spec.key];
                                  const isMatch = checkSpecMatch(spec.value, quoteValue || '');
                                  
                                  return (
                                    <TableCell key={quote.id} className="text-center">
                                      <LEDIndicator 
                                        matched={isMatch}
                                        actualValue={quoteValue}
                                        expectedValue={spec.value}
                                      />
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            ))}
                            
                            {/* Additional specs from quotes not in RFQ */}
                            {(() => {
                              const rfqSpecKeys = getAllSpecifications().map(s => s.key);
                              const additionalSpecs = new Set<string>();
                              
                              quotes.forEach(quote => {
                                Object.keys(quote.specifications).forEach(key => {
                                  if (!rfqSpecKeys.includes(key)) {
                                    additionalSpecs.add(key);
                                  }
                                });
                              });
                              
                              return Array.from(additionalSpecs).map(key => (
                                <TableRow key={key} className="bg-gray-50">
                                  <TableCell className="font-medium sticky left-0 bg-gray-50">
                                    <div className="space-y-1">
                                      <div className="text-sm font-medium">{key}</div>
                                      <div className="text-xs text-gray-500 italic">Not in original RFQ</div>
                                    </div>
                                  </TableCell>
                                  {quotes.map(quote => {
                                    const quoteValue = quote.specifications[key];
                                    
                                    return (
                                      <TableCell key={quote.id} className="text-center">
                                        {quoteValue ? (
                                          <div className="text-xs text-gray-600">{quoteValue}</div>
                                        ) : (
                                          <span className="text-gray-400">-</span>
                                        )}
                                      </TableCell>
                                    );
                                  })}
                                </TableRow>
                              ));
                            })()}
                            
                            {/* Notes Row */}
                            <TableRow className="border-t-2">
                              <TableCell className="font-medium sticky left-0 bg-white">
                                <div className="text-sm font-medium">Supplier Notes</div>
                              </TableCell>
                              {quotes.map(quote => (
                                <TableCell key={quote.id} className="text-center">
                                  {quote.notes && (
                                    <div className="text-xs text-gray-600 max-w-[150px] mx-auto">{quote.notes}</div>
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                      
                      {/* Quote Summary */}
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="font-medium text-sm text-blue-900 mb-1">Quick Analysis</h4>
                            <p className="text-xs text-blue-700">
                              Based on specifications match, Quote #3 from {quotes[2]?.supplierCompany || 'Maritime Express'} appears to best match your requirements
                              with the highest specification compliance rate.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Sidebar */}
              <div className="space-y-4">
                {/* RFQ Details Card */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3">RFQ Details</h3>
                  <div className="space-y-3">
                    {rfqData.vesselName && (
                      <div className="flex items-start gap-2">
                        <Ship className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-600">Vessel</p>
                          <p className="font-medium" data-testid="text-vessel-name">
                            {getVesselInitials(rfqData.vesselName)}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">Location</p>
                        <p className="font-medium" data-testid="text-location">{rfqData.location}</p>
                      </div>
                    </div>

                    {rfqData.deadline && (
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-600">Deadline</p>
                          <p className="font-medium text-orange-600" data-testid="text-deadline">
                            {new Date(rfqData.deadline).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    )}

                    {rfqData.budget && (
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <p className="text-sm text-gray-600">Budget</p>
                          <p className="font-medium" data-testid="text-budget">{rfqData.budget}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Posted By Info */}
                    <Separator className="my-2" />
                    <div className="flex items-start gap-2">
                      <UserIcon className="w-4 h-4 text-gray-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">Posted by</p>
                        <p className="font-medium" data-testid="text-posted-by">
                          {rfqData.userRank} {getInitials(rfqData.userFullName)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(rfqData.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="space-y-2">
                  <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}>
                    <DialogTrigger asChild>
                      <Button className="w-full" data-testid="button-submit-quote">
                        <Send className="w-4 h-4 mr-2" />
                        Submit Quote
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Submit Quote</DialogTitle>
                        <DialogDescription>
                          Provide your quote and match specifications for this RFQ.
                        </DialogDescription>
                      </DialogHeader>
                      
                      {/* Overall Match Score if AI analysis has been run */}
                      {quoteForm.overallMatchScore > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Overall Specification Match</span>
                            <span className="text-sm font-bold">{quoteForm.overallMatchScore}%</span>
                          </div>
                          <Progress value={quoteForm.overallMatchScore} className="h-2" />
                        </div>
                      )}
                      
                      <Tabs defaultValue="details" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="details">Quote Details</TabsTrigger>
                          <TabsTrigger value="specifications" className="flex items-center gap-2">
                            Specifications 
                            {rfqData?.extractedSpecifications && (
                              <Badge variant="outline" className="ml-1">
                                {rfqData.extractedSpecifications.categories.reduce(
                                  (acc, cat) => acc + cat.specifications.length, 0
                                )}
                              </Badge>
                            )}
                          </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="details">
                          <form onSubmit={handleSubmitQuote} className="space-y-4">
                        <div>
                          <Label htmlFor="price">Price *</Label>
                          <div className="flex space-x-2">
                            <Input
                              id="price"
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={quoteForm.price}
                              onChange={(e) => setQuoteForm(prev => ({ ...prev, price: e.target.value }))}
                              className="flex-1"
                              required
                              data-testid="input-quote-price"
                            />
                            <Select
                              value={quoteForm.currency}
                              onValueChange={(value) => setQuoteForm(prev => ({ ...prev, currency: value }))}
                            >
                              <SelectTrigger className="w-20" data-testid="select-currency">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="EUR">EUR</SelectItem>
                                <SelectItem value="GBP">GBP</SelectItem>
                                <SelectItem value="SGD">SGD</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="readiness">Readiness</Label>
                          <Select
                            value={quoteForm.readinessDate}
                            onValueChange={(value) => setQuoteForm(prev => ({ ...prev, readinessDate: value }))}
                          >
                            <SelectTrigger data-testid="select-readiness">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="immediate">Immediate</SelectItem>
                              <SelectItem value="1-day">Within 1 day</SelectItem>
                              <SelectItem value="3-days">Within 3 days</SelectItem>
                              <SelectItem value="1-week">Within 1 week</SelectItem>
                              <SelectItem value="custom">Custom date</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {quoteForm.readinessDate === 'custom' && (
                          <div>
                            <Label htmlFor="customDate">Custom Date</Label>
                            <Input
                              id="customDate"
                              type="date"
                              value={quoteForm.customDate}
                              onChange={(e) => setQuoteForm(prev => ({ ...prev, customDate: e.target.value }))}
                              data-testid="input-custom-date"
                            />
                          </div>
                        )}

                        <div>
                          <Label htmlFor="notes">Notes *</Label>
                          <Textarea
                            id="notes"
                            placeholder="Additional details about your quote..."
                            value={quoteForm.notes}
                            onChange={(e) => setQuoteForm(prev => ({ ...prev, notes: e.target.value }))}
                            rows={3}
                            required
                            data-testid="textarea-quote-notes"
                          />
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowQuoteModal(false)}
                            className="flex-1"
                            data-testid="button-cancel-quote"
                          >
                            Cancel
                          </Button>
                          <Button type="submit" className="flex-1" data-testid="button-confirm-quote">
                            Submit Quote
                          </Button>
                        </div>
                      </form>
                    </TabsContent>
                    
                    <TabsContent value="specifications" className="space-y-4">
                      {/* Custom Vendor Text for AI Matching */}
                      <div className="space-y-2">
                        <Label htmlFor="customText">Your Product Specifications</Label>
                        <Textarea
                          id="customText"
                          placeholder="Describe your product specifications, materials, certifications, and capabilities. Include any relevant links or documentation..."
                          value={quoteForm.customText}
                          onChange={(e) => setQuoteForm(prev => ({ ...prev, customText: e.target.value }))}
                          rows={4}
                          className="w-full"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAIMatching}
                          disabled={!quoteForm.customText || isAnalyzingSpecs}
                          className="w-full"
                          data-testid="button-ai-match"
                        >
                          {isAnalyzingSpecs ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Analyzing Specifications...
                            </>
                          ) : (
                            <>
                              <Brain className="mr-2 h-4 w-4" />
                              Match Specs with AI
                            </>
                          )}
                        </Button>
                      </div>

                      <Separator />

                      {/* Specifications Checklist */}
                      {rfqData?.extractedSpecifications && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">Required Specifications</h4>
                            {quoteForm.checkedSpecs.length > 0 || quoteForm.aiMatchedSpecs.length > 0 ? (
                              <Badge variant="secondary">
                                {quoteForm.checkedSpecs.length + quoteForm.aiMatchedSpecs.filter(s => s.matched).length} matched
                              </Badge>
                            ) : null}
                          </div>
                          
                          {rfqData.extractedSpecifications.categories.map((category, idx) => (
                            <Card key={idx} className="border-l-4" style={{ borderLeftColor: category.color || '#9333ea' }}>
                              <CardHeader className="pb-3" style={{ backgroundColor: `${category.color}10` || '#9333ea10' }}>
                                <h4 className="font-semibold text-sm" style={{ color: category.color || '#9333ea' }}>
                                  {category.name}
                                </h4>
                              </CardHeader>
                              <CardContent className="pt-3">
                                <div className="space-y-3">
                                  {category.specifications.map((spec, specIdx) => {
                                    const specId = spec.id || `${category.name}-${spec.key}`;
                                    const matchInfo = isSpecMatched(specId);
                                    
                                    return (
                                      <div key={specIdx} className="flex items-start gap-3">
                                        <Checkbox
                                          id={specId}
                                          checked={quoteForm.checkedSpecs.includes(specId)}
                                          onCheckedChange={() => handleSpecCheckboxToggle(specId)}
                                          data-testid={`checkbox-spec-${specId}`}
                                        />
                                        <div className="flex-1">
                                          <label
                                            htmlFor={specId}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                          >
                                            <span className="font-semibold">{spec.key}:</span>{' '}
                                            <span className="text-gray-600">{spec.value}</span>
                                            {spec.unit && <span className="text-gray-500 ml-1">({spec.unit})</span>}
                                          </label>
                                        </div>
                                        {/* LED Indicator for AI Matching */}
                                        {matchInfo.matched && (
                                          <div className="flex items-center gap-1">
                                            <LEDIndicator
                                              matched={matchInfo.matched}
                                              size="sm"
                                            />
                                            {matchInfo.confidence < 100 && (
                                              <span className="text-xs text-gray-500">
                                                {matchInfo.confidence}%
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}

                      {/* No Specifications Message */}
                      {!rfqData?.extractedSpecifications && (
                        <Alert>
                          <AlertDescription>
                            No specifications have been extracted for this RFQ. You can still submit your quote with the details provided in the description.
                          </AlertDescription>
                        </Alert>
                      )}
                    </TabsContent>
                  </Tabs>
                </DialogContent>
                  </Dialog>
                  
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleShare('whatsapp')}
                    data-testid="button-share-whatsapp"
                  >
                    Share via WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Bottom Action Buttons */}
        <div className="flex gap-3 justify-center mb-8">
          {rfqData.status === 'active' && (
            <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-orange-600 hover:bg-orange-700" 
                  size="lg"
                  data-testid="button-submit-quote-bottom"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Submit Quote
                </Button>
              </DialogTrigger>
            </Dialog>
          )}
          
          <Button
            variant="outline"
            size="lg"
            onClick={() => setLocation('/rfq')}
            data-testid="button-back-bottom"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to RFQ Feed
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleShare('general')}
            data-testid="button-share-bottom"
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share RFQ
          </Button>
        </div>
      </div>
      
      {/* Image Modal */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img 
                src={selectedImage} 
                alt="Attachment" 
                className="max-w-full max-h-[90vh] object-contain"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-white hover:bg-white/20"
                onClick={() => setSelectedImage(null)}
              >
                <ExternalLink className="h-5 w-5" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}