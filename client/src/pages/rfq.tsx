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
import { EnhancedFileUpload } from "@/components/EnhancedFileUpload";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  X,
  Share2,
  Pencil,
  Trash2
} from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

// Using public asset path for better reliability
const qaaqLogo = "/qaaq-logo.png";

interface RFQPageProps {
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
  // Slug components for canonical URLs
  port?: string;
  date?: string;
  userPublicId?: string;
  serial?: string;
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

  // Check URL parameters for tab and workshop info
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    const workshopParam = urlParams.get('workshop');
    const locationParam = urlParams.get('location');
    
    if (tabParam === 'post') {
      setActiveTab('post');
    }
    
    if (workshopParam || locationParam) {
      setFormData(prev => ({
        ...prev,
        location: locationParam ? decodeURIComponent(locationParam) : prev.location,
        description: workshopParam ? 
          `Request for quotation for repair services.\n\nWorkshop: ${workshopParam}\n\n` + prev.description :
          prev.description
      }));
    }
  }, []);

  // Form state for creating new RFQ
  const [formData, setFormData] = useState({
    category: "",
    description: "",
    vesselName: "",
    location: "",
    urgency: "medium",
    deadline: ""
  });
  const [attachments, setAttachments] = useState<string[]>([]);
  const [showAdditionalData, setShowAdditionalData] = useState(false);
  const [editingRFQ, setEditingRFQ] = useState<RFQRequest | null>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedRFQ, setSelectedRFQ] = useState<RFQRequest | null>(null);
  const [quoteForm, setQuoteForm] = useState({
    price: "",
    currency: "USD",
    readinessDate: "immediate",
    customDate: "",
    notes: ""
  });
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Specification extraction state
  const [extractedSpecs, setExtractedSpecs] = useState<Record<string, any>>({});
  const [isExtracting, setIsExtracting] = useState<Record<string, boolean>>({});
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [selectedRFQForSpecs, setSelectedRFQForSpecs] = useState<RFQRequest | null>(null);

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
      // Store the full uploadURL instead of just the filename
      const fileUrls = result.successful.map((file: any) => file.uploadURL || file.name);
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

  // Temporarily allow all authenticated users to post RFQs for testing
  const canPostRFQ = !!user; // user?.isAdmin || seniorRoles.includes(user?.maritimeRank || '');

  // Check if current user can edit an RFQ
  const canEditRFQ = (rfq: RFQRequest) => {
    if (!user) return false;
    // Check if user owns this RFQ by comparing user IDs
    // Fallback to formatted name comparison if userId is not available
    if (rfq.userId && user.id) {
      return rfq.userId === user.id;
    }
    // Fallback: check by matching the formatted name
    const userFormattedName = `${user.maritimeRank || ''} ${getInitials(user.fullName || '')}`;
    return rfq.postedBy === userFormattedName;
  };

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

  // Helper function to get proper image URL for attachments
  const getAttachmentUrl = (attachment: string): string => {
    console.log(`🔗 Processing attachment URL: ${attachment}`);
    
    // If it's a full Google Cloud Storage URL for private objects, extract the object ID and use our proxy
    if (attachment.startsWith('https://storage.googleapis.com/') && attachment.includes('/.private/uploads/')) {
      const objectId = attachment.split('/').pop();
      if (objectId) {
        console.log(`📥 Using proxy for private object: ${objectId}`);
        return `/api/objects/${objectId}`;
      }
    }
    
    // If it's already a full URL or replit object store URL, return as-is
    if (attachment.startsWith('http') || attachment.startsWith('/replit-objstore-')) {
      return attachment;
    }
    
    // If it's just a filename, construct the object storage URL
    // Use the public directory from the object storage setup
    return `/replit-objstore-b2ad59ef-ca8b-42b8-bc12-f53a0b9ec0ee/public/${attachment}`;
  };

  // Fetch RFQ requests from API
  useEffect(() => {
    const fetchRFQs = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/rfq?page=1&limit=20', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          // Map the backend response to include postedBy field
          const mappedRfqs = (data.rfqs || []).map((rfq: any) => ({
            ...rfq,
            postedBy: `${rfq.userRank || ''} ${getInitials(rfq.userFullName || '')}`,
            postedAt: rfq.createdAt, // Add postedAt for consistency
            category: rfq.category || 'parts' // Default category if missing
          }));
          setRfqRequests(mappedRfqs);
        } else {
          console.error('Failed to fetch RFQ requests:', response.status);
          // Show mock data as fallback for now
          const mockRFQs: RFQRequest[] = [
            {
              id: "sample-1",
              title: "Main Engine Spare Parts Required",
              description: "Looking for MAN B&W 6S60MC main engine spare parts including fuel pump components and cylinder head gaskets. Urgent requirement due to upcoming dry dock.",
              vesselName: "M.V. Atlantic Voyager",
              location: "Singapore",
              urgency: "high",
              deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
              contactMethod: "dm",
              status: "active",
              viewCount: 15,
              quoteCount: 3,
              createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              userFullName: "John Smith",
              userRank: "Chief Engineer",
              userId: "sample-user-1",
              attachments: [],
              postedBy: "Chief Engineer J.S.",
              category: "parts",
              postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
              id: "sample-2", 
              title: "Propeller Shaft Alignment Service",
              description: "Need certified technicians for propeller shaft alignment and stern tube bearing inspection during port call.",
              vesselName: "M.V. Ocean Pioneer",
              location: "Rotterdam",
              urgency: "medium",
              deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
              contactMethod: "dm",
              status: "active",
              viewCount: 8,
              quoteCount: 1,
              createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
              userFullName: "Mark Roberts",
              userRank: "Captain",
              userId: "sample-user-2",
              attachments: [],
              postedBy: "Captain M.R.",
              category: "services",
              postedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
              id: "sample-3",
              title: "Emergency Generator Repair",
              description: "Emergency generator failure, need immediate repair service. Vessel currently anchored awaiting assistance.",
              vesselName: "M.V. Baltic Star",
              location: "Hamburg",
              urgency: "urgent",
              deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
              contactMethod: "dm",
              status: "active",
              viewCount: 25,
              quoteCount: 7,
              createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
              userFullName: "Alex Hansen",
              userRank: "Chief Engineer",
              userId: "sample-user-3",
              attachments: [],
              postedBy: "Chief Engineer A.H.",
              category: "repairs",
              postedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
            }
          ];
          setRfqRequests(mockRFQs);
        }
      } catch (error) {
        console.error('Error fetching RFQ requests:', error);
        toast({
          title: "Error",
          description: "Failed to load RFQ requests",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRFQs();
  }, [toast]);

  const handleSubmitRFQ = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to post RFQ requests.",
        variant: "destructive"
      });
      // Redirect to login after a brief delay
      setTimeout(() => setLocation('/login'), 1500);
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
      // Prepare API request data
      const requestData = {
        title: titleFromDescription,
        description: formData.description,
        vesselName: formData.vesselName || '',
        vesselType: formData.vesselName ? "General Cargo" : undefined,
        location: formData.location,
        urgency: formData.urgency as 'low' | 'medium' | 'high' | 'urgent',
        budget: undefined, // Not captured in form yet
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : undefined,
        contactMethod: "dm",
        attachments: attachments || []
      };

      if (editingRFQ) {
        // Update existing RFQ via API
        const response = await fetch(`/api/rfq/${editingRFQ.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(requestData)
        });

        if (response.ok) {
          const updatedRFQ = await response.json();
          // Update local state with API response
          setRfqRequests(prev => prev.map(rfq => rfq.id === editingRFQ.id ? updatedRFQ : rfq));
          
          // Reset editing state
          setEditingRFQ(null);
          setActiveTab('feed');
          
          toast({
            title: "RFQ Updated Successfully",
            description: "Your RFQ request has been updated in the database."
          });
        } else {
          const errorData = await response.json().catch(() => ({ message: 'Update failed' }));
          throw new Error(errorData.message || 'Failed to update RFQ');
        }
      } else {
        // Create new RFQ via API
        const response = await fetch('/api/rfq', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(requestData)
        });

        if (response.ok) {
          const newRFQ = await response.json();
          // Add new RFQ to local state from API response
          setRfqRequests(prev => [newRFQ, ...prev]);
          
          toast({
            title: "RFQ Posted Successfully",
            description: "Your RFQ has been saved to the database and is now visible to maritime suppliers."
          });
        } else {
          const errorData = await response.json().catch(() => ({ message: 'Creation failed' }));
          throw new Error(errorData.message || 'Failed to create RFQ');
        }
      }
      
      // Reset form
      setFormData({
        category: "",
        description: "",
        vesselName: "",
        location: "",
        urgency: "medium",
        deadline: ""
      });
      setAttachments([]);
      
    } catch (error) {
      console.error('Error posting RFQ:', error);
      toast({
        title: "Failed to Post RFQ",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  };

  // Start editing an RFQ
  const startEditRFQ = (rfq: RFQRequest) => {
    setEditingRFQ(rfq);
    setFormData({
      category: rfq.category,
      description: rfq.description,
      vesselName: rfq.vesselName,
      location: rfq.location,
      urgency: rfq.urgency,
      deadline: rfq.deadline
    });
    setAttachments(rfq.attachments || []);
    setActiveTab('create');
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingRFQ(null);
    setFormData({
      category: "",
      description: "",
      vesselName: "",
      location: "",
      urgency: "medium",
      deadline: ""
    });
    setAttachments([]);
  };

  // Delete RFQ
  const deleteRFQ = async (rfq: RFQRequest) => {
    if (!canEditRFQ(rfq)) {
      toast({
        title: "Access Denied",
        description: "You can only delete your own RFQ requests.",
        variant: "destructive"
      });
      return;
    }

    // Confirm deletion
    const confirmed = window.confirm(`Are you sure you want to delete this RFQ?\n\nTitle: ${rfq.title}\nLocation: ${rfq.location}\n\nThis action cannot be undone.`);
    
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/rfq/${rfq.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        // Remove from local state
        setRfqRequests(prev => prev.filter(r => r.id !== rfq.id));
        
        toast({
          title: "RFQ Deleted",
          description: "Your RFQ request has been deleted successfully."
        });
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Delete failed' }));
        throw new Error(errorData.message || 'Failed to delete RFQ');
      }
    } catch (error) {
      console.error('Error deleting RFQ:', error);
      toast({
        title: "Failed to Delete RFQ",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  };

  // Share RFQ functionality with slug-based URLs
  const shareRFQ = async (rfq: RFQRequest) => {
    const shareText = `🚢 Maritime RFQ: ${rfq.title}\n\n📍 Location: ${rfq.location}\n⏰ Urgency: ${rfq.urgency.toUpperCase()}\n📝 Details: ${rfq.description.substring(0, 100)}${rfq.description.length > 100 ? '...' : ''}\n\n💼 Posted by: ${rfq.postedBy}\n📅 Deadline: ${rfq.deadline ? new Date(rfq.deadline).toLocaleDateString() : 'No deadline'}\n\n#MaritimeRFQ #Shipping #QuoteRequest`;
    
    // Use slug-based URLs if available, fallback to UUID for legacy support
    let shareUrl: string;
    let directRfqUrl: string;
    
    if (rfq.port && rfq.date && rfq.userPublicId && rfq.serial) {
      // Use canonical slug URL for better SEO and user experience
      directRfqUrl = `${window.location.origin}/rfq/${rfq.port}/${rfq.date}/${rfq.userPublicId}/${rfq.serial}`;
      shareUrl = `${window.location.origin}/api/rfq/by-slug/${rfq.port}/${rfq.date}/${rfq.userPublicId}/${rfq.serial}/share`;
    } else {
      // Fallback to legacy UUID URLs for backward compatibility
      shareUrl = `${window.location.origin}/api/rfq/${rfq.id}/share`;
      directRfqUrl = `${window.location.origin}/rfq/${rfq.id}`;
    }
    
    // Try using Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Maritime RFQ: ${rfq.title}`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (error) {
        console.log('Web Share API failed, falling back to manual sharing');
      }
    }
    
    // Fallback: Create share options dropdown
    const shareOptions = [
      {
        name: 'WhatsApp',
        url: `https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`,
        color: 'bg-green-500'
      },
      {
        name: 'LinkedIn',
        url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(`Maritime RFQ: ${rfq.title}`)}&summary=${encodeURIComponent(shareText)}`,
        color: 'bg-blue-600'
      },
      {
        name: 'Twitter',
        url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
        color: 'bg-sky-500'
      },
      {
        name: 'Copy Link',
        action: () => {
          navigator.clipboard.writeText(shareUrl);
          toast({
            title: "Link Copied!",
            description: "RFQ link has been copied to clipboard."
          });
        },
        color: 'bg-gray-500'
      }
    ];
    
    // Show custom share modal (simplified - just open first option for now)
    // In production, you might want a proper modal with all options
    const whatsappShare = shareOptions[0];
    window.open(whatsappShare.url, '_blank', 'noopener,noreferrer');
  };

  // Open quote modal
  const openQuoteModal = (rfq: RFQRequest) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to submit quotes for RFQ requests.",
        variant: "destructive"
      });
      // Redirect to login after a brief delay
      setTimeout(() => setLocation('/login'), 1500);
      return;
    }
    
    setSelectedRFQ(rfq);
    setShowQuoteModal(true);
    setQuoteForm({
      price: "",
      currency: "USD",
      readinessDate: "immediate",
      customDate: "",
      notes: ""
    });
    setShowAdvancedOptions(false);
  };

  // Close quote modal
  const closeQuoteModal = () => {
    setShowQuoteModal(false);
    setSelectedRFQ(null);
    setShowAdvancedOptions(false);
  };

  // Extract specifications from RFQ using AI
  const extractSpecifications = async (rfq: RFQRequest) => {
    if (!user || !rfq) return;

    // Set loading state for this specific RFQ
    setIsExtracting(prev => ({ ...prev, [rfq.id]: true }));

    try {
      toast({
        title: "🔧 Extracting Specifications",
        description: "AI is analyzing your RFQ to extract technical specifications...",
      });

      // Call the API to extract specifications
      const response = await fetch(`/api/rfq/${rfq.id}/extract-specs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Extraction failed' }));
        throw new Error(errorData.message || 'Failed to extract specifications');
      }

      const result = await response.json();

      // Store extracted specifications in local state
      setExtractedSpecs(prev => ({
        ...prev,
        [rfq.id]: result.specifications
      }));

      // Open the specifications modal
      setSelectedRFQForSpecs(rfq);
      setShowSpecModal(true);

      toast({
        title: "✅ Specifications Extracted",
        description: "AI has successfully analyzed your RFQ and extracted technical specifications.",
      });

    } catch (error) {
      console.error('Error extracting specifications:', error);
      toast({
        title: "Failed to Extract Specifications",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive"
      });
    } finally {
      // Clear loading state
      setIsExtracting(prev => ({ ...prev, [rfq.id]: false }));
    }
  };

  // Save extracted specifications to database
  const saveSpecifications = async (rfqId: string, specifications: any) => {
    try {
      const response = await fetch(`/api/rfq/${rfqId}/specs`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ specifications })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Save failed' }));
        throw new Error(errorData.message || 'Failed to save specifications');
      }

      toast({
        title: "💾 Specifications Saved",
        description: "Your extracted specifications have been saved to the RFQ.",
      });

      // Close the modal after saving
      setShowSpecModal(false);
      setSelectedRFQForSpecs(null);

    } catch (error) {
      console.error('Error saving specifications:', error);
      toast({
        title: "Failed to Save Specifications",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive"
      });
    }
  };

  // Submit quote
  const submitQuote = async () => {
    if (!selectedRFQ || !quoteForm.price) {
      toast({
        title: "Missing Information",
        description: "Please enter a price for your quote.",
        variant: "destructive"
      });
      return;
    }

    // Check if we have a valid token
    const authToken = localStorage.getItem('auth_token');
    if (!authToken) {
      toast({
        title: "Authentication Required",
        description: "Please log in to submit a quote.",
        variant: "destructive"
      });
      return;
    }

    try {
      const quoteData = {
        price: parseFloat(quoteForm.price),
        currency: quoteForm.currency,
        readinessDate: quoteForm.readinessDate,
        customDate: quoteForm.readinessDate === 'custom' ? quoteForm.customDate : null,
        notes: quoteForm.notes || null
      };

      // Submit quote via API
      const response = await fetch(`/api/rfq/${selectedRFQ.id}/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(quoteData)
      });

      if (response.ok) {
        const submittedQuote = await response.json();
        console.log('Quote submitted successfully:', submittedQuote);

        toast({
          title: "Quote Submitted Successfully!",
          description: `Your quote of ${quoteData.currency} ${quoteForm.price} has been sent to the requester via DM.`
        });

        closeQuoteModal();

        // Refresh RFQ list to update quote counts
        try {
          const rfqResponse = await fetch('/api/rfq?page=1&limit=20', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
          });
          if (rfqResponse.ok) {
            const rfqData = await rfqResponse.json();
            setRfqRequests(rfqData.rfqs || []);
          }
        } catch (refreshError) {
          console.log('Could not refresh RFQ list:', refreshError);
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Quote submission failed' }));
        
        // Handle authentication errors specifically
        if (response.status === 401 || response.status === 403) {
          throw new Error('Your session has expired. Please log in again to submit your quote.');
        }
        
        throw new Error(errorData.message || 'Failed to submit quote');
      }
    } catch (error) {
      console.error('Error submitting quote:', error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit quote. Please try again.",
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

  const formatTimeAgo = (date: Date | string | undefined) => {
    if (!date) return 'Unknown';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return 'Unknown';
    
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60));
    
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
              {user ? (
                <UserDropdown user={user} onLogout={() => window.location.reload()} />
              ) : (
                <Button 
                  variant="default" 
                  size="sm" 
                  data-testid="button-login"
                  onClick={() => setLocation('/login')}
                  className="bg-navy hover:bg-navy/90"
                >
                  Login
                </Button>
              )}
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
                  disabled={!user}
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
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
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
                        
                        {/* Attachments Display - Horizontal Carousel */}
                        {rfq.attachments && rfq.attachments.length > 0 && (
                          <div className="-mx-6 px-6">
                            <Carousel
                              opts={{
                                align: "start",
                                loop: false,
                              }}
                              className="w-full"
                              data-testid={`carousel-rfq-attachments-${rfq.id}`}
                            >
                              <CarouselContent className="-ml-2">
                                {rfq.attachments.map((attachment, index) => (
                                  <CarouselItem key={index} className="pl-2 basis-auto">
                                    <div className="relative w-48">
                                      {attachment.includes('video') || attachment.includes('.mp4') || attachment.includes('.mov') ? (
                                        <div className="relative bg-gray-100 rounded aspect-video flex items-center justify-center h-32">
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
                                          src={getAttachmentUrl(attachment)} 
                                          alt={`RFQ attachment ${index + 1}`}
                                          className="w-full h-32 object-cover rounded border border-orange-200"
                                          data-testid={`img-rfq-attachment-${index}`}
                                        />
                                      )}
                                    </div>
                                  </CarouselItem>
                                ))}
                              </CarouselContent>
                              {rfq.attachments.length > 1 && (
                                <>
                                  <CarouselPrevious className="-left-4" data-testid={`button-carousel-previous-${rfq.id}`} />
                                  <CarouselNext className="-right-4" data-testid={`button-carousel-next-${rfq.id}`} />
                                </>
                              )}
                            </Carousel>
                            {rfq.attachments.length > 1 && (
                              <div className="text-center text-xs text-gray-500 mt-2">
                                {rfq.attachments.length} attachment{rfq.attachments.length !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                          <div className="text-sm text-gray-500">
                            <div>By: {rfq.postedBy}</div>
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              Deadline: {rfq.deadline ? new Date(rfq.deadline).toLocaleDateString() : 'No deadline set'}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-orange-200 hover:bg-orange-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                openQuoteModal(rfq);
                              }}
                              data-testid={`button-submit-quote-${rfq.id}`}
                            >
                              Submit Quote
                            </Button>
                            {canEditRFQ(rfq) && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="border-yellow-200 hover:bg-yellow-50 text-yellow-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    extractSpecifications(rfq);
                                  }}
                                  data-testid={`button-extract-specs-${rfq.id}`}
                                  title="Extract specifications with AI"
                                >
                                  💡
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="border-blue-200 hover:bg-blue-50 text-blue-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditRFQ(rfq);
                                  }}
                                  data-testid={`button-edit-rfq-${rfq.id}`}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="border-red-200 hover:bg-red-50 text-red-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteRFQ(rfq);
                                  }}
                                  data-testid={`button-delete-rfq-${rfq.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {/* Share buttons in vertical stack - WhatsApp on top */}
                            <div className="flex flex-col gap-1">
                              {/* Dedicated WhatsApp share button - Now on top */}
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-green-500 hover:bg-green-50 text-green-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const shareText = `${rfq.description}`;
                                  
                                  // Use slug-based URLs if available, fallback to UUID for legacy support
                                  let shareUrl: string;
                                  if (rfq.port && rfq.date && rfq.userPublicId && rfq.serial) {
                                    // Use canonical slug URL for better SEO and user experience
                                    shareUrl = `${window.location.origin}/rfq/${rfq.port}/${rfq.date}/${rfq.userPublicId}/${rfq.serial}`;
                                  } else {
                                    // Fallback to legacy UUID URL for backward compatibility
                                    shareUrl = `${window.location.origin}/rfq/${rfq.id}`;
                                  }
                                  
                                  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`;
                                  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
                                }}
                                data-testid={`button-whatsapp-share-${rfq.id}`}
                                title="Share on WhatsApp"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.349"/>
                                </svg>
                              </Button>
                              
                              {/* General share button - Now below WhatsApp */}
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-green-200 hover:bg-green-50 text-green-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  shareRFQ(rfq);
                                }}
                                data-testid={`button-share-rfq-${rfq.id}`}
                              >
                                <Share2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
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
              {user ? (
                <Card className="max-w-2xl mx-auto">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        {editingRFQ ? 'Edit RFQ Request' : 'Post New RFQ Request'}
                      </CardTitle>
                      {editingRFQ && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={cancelEdit}
                          className="text-gray-500 hover:text-gray-700"
                          data-testid="button-cancel-edit"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <form onSubmit={handleSubmitRFQ} className="space-y-4">
                      
                      {/* Location Field - Always Visible */}
                      <div>
                        <Label htmlFor="location">Location *</Label>
                        <Input
                          id="location"
                          placeholder="Port/Position"
                          value={formData.location}
                          onChange={(e) => setFormData(prev => ({...prev, location: e.target.value}))}
                          className="border-orange-200 focus:border-orange-500"
                          data-testid="input-rfq-location"
                        />
                      </div>
                      
                      {/* Enhanced Requirements Field with File Upload */}
                      <EnhancedFileUpload
                        value={formData.description}
                        onChange={(value) => setFormData(prev => ({...prev, description: value}))}
                        attachments={attachments}
                        onAttachmentsChange={setAttachments}
                        onGetUploadParameters={handleGetUploadParameters}
                        placeholder="What do you need? (First line will be used as title)
• Drag and drop files here or use Ctrl+V to paste
• Supported: Images, videos, PDF, Word, Excel documents"
                        rows={5}
                        maxFiles={5}
                        maxFileSize={52428800}
                        label="Requirement"
                        required={true}
                        className="space-y-3"
                      />
                      
                      {/* Additional Data Toggle */}
                      <div className="border-t pt-4">
                        <button
                          type="button"
                          onClick={() => setShowAdditionalData(!showAdditionalData)}
                          className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium"
                          data-testid="button-additional-data"
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform ${showAdditionalData ? 'rotate-180' : ''}`} />
                          Additional data
                        </button>
                      </div>
                      
                      {/* Additional Fields - Hidden by Default */}
                      {showAdditionalData && (
                        <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="category">Category</Label>
                              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({...prev, category: value}))}>
                                <SelectTrigger data-testid="select-rfq-category">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="parts">Spare Parts</SelectItem>
                                  <SelectItem value="repair">Repair Workshop</SelectItem>
                                  <SelectItem value="supply">IMPA STORES</SelectItem>
                                  <SelectItem value="emergency">Emergency</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="urgency">Urgency Level</Label>
                              <Select value={formData.urgency} onValueChange={(value) => setFormData(prev => ({...prev, urgency: value}))}>
                                <SelectTrigger data-testid="select-rfq-urgency">
                                  <SelectValue placeholder="Select urgency" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="urgent">Urgent</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="vessel">Vessel Name</Label>
                              <Input
                                id="vessel"
                                placeholder="M.V. Example"
                                value={formData.vesselName}
                                onChange={(e) => setFormData(prev => ({...prev, vesselName: e.target.value}))}
                                className="border-orange-200 focus:border-orange-500"
                                data-testid="input-rfq-vessel"
                              />
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
                          </div>
                        </div>
                      )}
                      
                      <Button 
                        type="submit" 
                        className="w-full bg-orange-600 hover:bg-orange-700"
                        data-testid="button-submit-rfq"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {editingRFQ ? 'Update RFQ Request' : 'Post RFQ Request'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              ) : (
                <Card className="max-w-md mx-auto text-center">
                  <CardContent className="pt-6">
                    <Ship className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Login Required</h3>
                    <p className="text-gray-600 mb-6">
                      Please log in to post RFQ requests on the maritime marketplace.
                    </p>
                    <Button 
                      className="bg-orange-600 hover:bg-orange-700 w-full"
                      onClick={() => setLocation('/login')}
                      data-testid="button-login-to-post-rfq"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Login to Post RFQ
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Quote Submission Modal */}
        <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Submit Quote
              </DialogTitle>
              <DialogDescription>
                Review the RFQ details and submit your quote
              </DialogDescription>
            </DialogHeader>
            
            {selectedRFQ && (
              <div className="space-y-6">
                {/* RFQ Details Review */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3">{selectedRFQ.title}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div className="flex items-center gap-2">
                      <Ship className="w-4 h-4 text-orange-600" />
                      <span>{getVesselInitials(selectedRFQ.vesselName)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-orange-600" />
                      <span>{selectedRFQ.location}</span>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-3">{selectedRFQ.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Deadline: {selectedRFQ.deadline ? new Date(selectedRFQ.deadline).toLocaleDateString() : 'No deadline set'}</span>
                    </div>
                    <Badge className={getUrgencyColor(selectedRFQ.urgency)}>
                      {selectedRFQ.urgency.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                {/* Quote Form */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Your Quote</h4>
                  
                  {/* Price Input */}
                  <div>
                    <Label htmlFor="quote-price">Price *</Label>
                    <div className="flex gap-2">
                      <Select value={quoteForm.currency} onValueChange={(value) => setQuoteForm(prev => ({...prev, currency: value}))}>
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        id="quote-price"
                        type="number"
                        placeholder="Enter price"
                        value={quoteForm.price}
                        onChange={(e) => setQuoteForm(prev => ({...prev, price: e.target.value}))}
                        className="flex-1"
                        data-testid="input-quote-price"
                      />
                    </div>
                  </div>

                  {/* Readiness Date */}
                  <div>
                    <Label>Readiness</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="immediate"
                          name="readiness"
                          value="immediate"
                          checked={quoteForm.readinessDate === 'immediate'}
                          onChange={(e) => setQuoteForm(prev => ({...prev, readinessDate: e.target.value}))}
                          className="text-orange-600"
                        />
                        <Label htmlFor="immediate">Immediate</Label>
                      </div>
                      
                      <div className="border-t pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                          className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700"
                        >
                          <ChevronDown className={`w-3 h-3 transition-transform ${showAdvancedOptions ? 'rotate-180' : ''}`} />
                          Advanced options (for items with lead time)
                        </button>
                      </div>
                      
                      {showAdvancedOptions && (
                        <div className="space-y-2 bg-gray-50 p-3 rounded">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="custom-date"
                              name="readiness"
                              value="custom"
                              checked={quoteForm.readinessDate === 'custom'}
                              onChange={(e) => {
                                setQuoteForm(prev => ({...prev, readinessDate: 'custom'}));
                              }}
                              className="text-orange-600"
                            />
                            <Label htmlFor="custom-date">Custom date:</Label>
                          </div>
                          <Input
                            type="date"
                            value={quoteForm.customDate}
                            onChange={(e) => setQuoteForm(prev => ({...prev, customDate: e.target.value}))}
                            className="ml-6"
                            disabled={quoteForm.readinessDate !== 'custom'}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Notes */}
                  <div>
                    <Label htmlFor="quote-notes">Additional Notes (Optional)</Label>
                    <Textarea
                      id="quote-notes"
                      placeholder="Include any additional information about your quote..."
                      value={quoteForm.notes}
                      onChange={(e) => setQuoteForm(prev => ({...prev, notes: e.target.value}))}
                      rows={3}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeQuoteModal}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={submitQuote}
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                    data-testid="button-submit-quote-final"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Submit Quote
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Specifications Extraction Modal */}
        <Dialog open={showSpecModal} onOpenChange={setShowSpecModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                💡
                AI-Extracted Specifications
              </DialogTitle>
              <DialogDescription>
                Review and save the specifications extracted from your RFQ
              </DialogDescription>
            </DialogHeader>
            
            {selectedRFQForSpecs && extractedSpecs[selectedRFQForSpecs.id] && (
              <div className="space-y-6">
                {/* RFQ Overview */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">{selectedRFQForSpecs.title}</h3>
                  <p className="text-gray-700 text-sm">{selectedRFQForSpecs.description}</p>
                </div>

                {/* Extracted Specifications by Category */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">Extracted Specifications</h4>
                  
                  {extractedSpecs[selectedRFQForSpecs.id].categories?.map((category: any, categoryIndex: number) => (
                    <Card key={categoryIndex} className="border border-yellow-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <span className="bg-yellow-100 px-2 py-1 rounded-full text-sm font-medium text-yellow-800">
                            {category.name}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {category.specifications?.map((spec: any, specIndex: number) => (
                            <div key={specIndex} className="flex items-start gap-3 p-2 bg-gray-50 rounded">
                              <input
                                type="checkbox"
                                id={`spec-${categoryIndex}-${specIndex}`}
                                defaultChecked={true}
                                className="mt-0.5 h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                                data-testid={`checkbox-spec-${categoryIndex}-${specIndex}`}
                              />
                              <label 
                                htmlFor={`spec-${categoryIndex}-${specIndex}`}
                                className="flex-1 text-sm cursor-pointer"
                              >
                                <span className="font-medium text-gray-900">{spec.key}:</span>
                                <span className="text-gray-700 ml-2">
                                  {spec.value}
                                  {spec.unit && <span className="text-gray-500 ml-1">{spec.unit}</span>}
                                </span>
                              </label>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Extraction Metadata */}
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <span>🤖</span>
                      <span>
                        Extracted using {extractedSpecs[selectedRFQForSpecs.id].model || 'AI'} 
                        {extractedSpecs[selectedRFQForSpecs.id].extractedAt && 
                          ` on ${new Date(extractedSpecs[selectedRFQForSpecs.id].extractedAt).toLocaleString()}`
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowSpecModal(false)}
                    className="flex-1"
                  >
                    Close Without Saving
                  </Button>
                  <Button
                    type="button"
                    onClick={() => saveSpecifications(selectedRFQForSpecs.id, extractedSpecs[selectedRFQForSpecs.id])}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                    data-testid="button-save-specifications"
                  >
                    💾 Save Specifications
                  </Button>
                </div>
              </div>
            )}
            
            {/* Loading State */}
            {selectedRFQForSpecs && isExtracting[selectedRFQForSpecs.id] && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-4"></div>
                <p className="text-gray-600">🔧 AI is extracting specifications...</p>
              </div>
            )}
            
            {/* Empty State */}
            {selectedRFQForSpecs && !extractedSpecs[selectedRFQForSpecs.id] && !isExtracting[selectedRFQForSpecs.id] && (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">💡</div>
                <p className="text-gray-600">No specifications extracted yet.</p>
                <Button
                  onClick={() => extractSpecifications(selectedRFQForSpecs)}
                  className="mt-4 bg-yellow-600 hover:bg-yellow-700"
                >
                  Extract Specifications
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}