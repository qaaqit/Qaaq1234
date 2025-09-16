import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import type { User } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import UserDropdown from "@/components/user-dropdown";
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
  ChevronDown,
  ExternalLink
} from "lucide-react";

// Using public asset path for better reliability
const qaaqLogo = "/qaaq-logo.png";

interface RFQDetailPageProps {
  user: User | null;
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
}

export default function RFQDetailPage({ user }: RFQDetailPageProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const params = useParams();
  
  const [rfqData, setRfqData] = useState<RFQRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    price: "",
    currency: "USD",
    readinessDate: "immediate",
    customDate: "",
    notes: ""
  });

  // Helper function to get proper image URL for attachments
  const getAttachmentUrl = (attachment: string): string => {
    // If it's already a full URL, return as-is
    if (attachment.startsWith('http') || attachment.startsWith('/replit-objstore-')) {
      return attachment;
    }
    
    // If it's just a filename, construct the object storage URL
    return `/replit-objstore-b2ad59ef-ca8b-42b8-bc12-f53a0b9ec0ee/public/${attachment}`;
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

  // Determine if this is a slug-based or UUID-based URL
  const isSlugUrl = params.port && params.date && params.userPublicId && params.serial;
  const isUuidUrl = params.id && !isSlugUrl;

  // Fetch RFQ data based on URL format
  useEffect(() => {
    const fetchRFQData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let response;
        let apiUrl;

        if (isSlugUrl) {
          // Fetch via slug endpoint
          apiUrl = `/api/rfq/by-slug/${params.port}/${params.date}/${params.userPublicId}/${params.serial}`;
        } else if (isUuidUrl) {
          // First try to resolve UUID to slug for redirect
          const resolveResponse = await fetch(`/api/rfq/resolve/${params.id}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (resolveResponse.ok) {
            const { canonical } = await resolveResponse.json();
            // Redirect to canonical slug URL
            setLocation(canonical);
            return;
          }
          
          // If resolve fails, try direct UUID fetch as fallback
          apiUrl = `/api/rfq/${params.id}`;
        } else {
          throw new Error('Invalid URL format');
        }

        response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
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
          
          // Update view count if we have a valid RFQ
          if (mappedRfq.id && isSlugUrl) {
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

    if (isSlugUrl || isUuidUrl) {
      fetchRFQData();
    } else {
      setError('Invalid URL format');
      setIsLoading(false);
    }
  }, [params, isSlugUrl, isUuidUrl, setLocation]);

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

    // Use slug URL if available, otherwise construct from current URL
    let shareUrl;
    if (rfqData.port && rfqData.date && rfqData.userPublicId && rfqData.serial) {
      shareUrl = `${window.location.origin}/rfq/${rfqData.port}/${rfqData.date}/${rfqData.userPublicId}/${rfqData.serial}`;
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
                    <span>{rfqData.urgency.toUpperCase()}</span>
                  </Badge>
                  <Badge variant="outline" data-testid={`badge-status-${rfqData.status}`}>
                    {rfqData.status.toUpperCase()}
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
          
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap" data-testid="text-rfq-description">
                    {rfqData.description}
                  </p>
                </div>

                {rfqData.attachments && rfqData.attachments.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center">
                      <Paperclip className="w-4 h-4 mr-2" />
                      Attachments ({rfqData.attachments.length})
                    </h3>
                    <div className="space-y-2">
                      {rfqData.attachments.map((attachment, index) => (
                        <div key={index} className="flex items-center space-x-2 p-2 border rounded">
                          <Paperclip className="w-4 h-4 text-gray-500" />
                          <a
                            href={getAttachmentUrl(attachment)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex-1"
                            data-testid={`link-attachment-${index}`}
                          >
                            {attachment.split('/').pop() || attachment}
                          </a>
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3">RFQ Details</h3>
                  <div className="space-y-3">
                    {rfqData.vesselName && (
                      <div className="flex items-center space-x-2">
                        <Ship className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">Vessel</p>
                          <p className="font-medium" data-testid="text-vessel-name">
                            {getVesselInitials(rfqData.vesselName)}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Location</p>
                        <p className="font-medium" data-testid="text-location">{rfqData.location}</p>
                      </div>
                    </div>

                    {rfqData.deadline && (
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">Deadline</p>
                          <p className="font-medium" data-testid="text-deadline">
                            {new Date(rfqData.deadline).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )}

                    {rfqData.budget && (
                      <div className="flex items-center space-x-2">
                        <div>
                          <p className="text-sm text-gray-600">Budget</p>
                          <p className="font-medium" data-testid="text-budget">{rfqData.budget}</p>
                        </div>
                      </div>
                    )}
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
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Submit Quote</DialogTitle>
                        <DialogDescription>
                          Provide your quote for this RFQ request.
                        </DialogDescription>
                      </DialogHeader>
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
      </div>
    </div>
  );
}