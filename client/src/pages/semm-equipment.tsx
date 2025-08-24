import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { ArrowLeft, Share2, Home, ChevronRight, Edit3, RotateCcw, ChevronUp, ChevronDown, Upload, Heart, Share, Play, FileText, Image, Video, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ObjectUploader } from '@/components/ObjectUploader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

// Bottom edge roll out flip card animation
const FlipCard = ({ char, index, large = false }: { char: string; index: number; large?: boolean }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFlipped(true);
    }, 600 + (index * 150));
    
    return () => clearTimeout(timer);
  }, [index]);

  const cardSize = large ? 'w-16 h-20' : 'w-10 h-14';
  const textSize = large ? 'text-4xl' : 'text-xl';

  return (
    <div className={`relative ${cardSize} rounded-lg overflow-hidden border-2 border-white shadow-lg`} 
         style={{ 
           perspective: '1000px',
           boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 -2px 4px rgba(255, 255, 255, 0.1), 0 4px 8px rgba(0, 0, 0, 0.2)'
         }}>
      {/* Loading state card */}
      <div
        className="absolute inset-0 bg-slate-700 flex items-center justify-center"
        style={{
          transformOrigin: 'bottom center',
          transform: isFlipped ? 'rotateX(-180deg)' : 'rotateX(0deg)',
          transition: 'transform 0.8s cubic-bezier(0.23, 1, 0.32, 1)',
          backfaceVisibility: 'hidden',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.5), 0 -1px 1px rgba(255, 255, 255, 0.1)',
          background: 'linear-gradient(145deg, #475569, #334155)'
        }}
      >
        <div className="w-3 h-3 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
      
      {/* Character reveal card */}
      <div
        className="absolute inset-0 bg-slate-700 flex items-center justify-center"
        style={{
          transformOrigin: 'bottom center',
          transform: isFlipped ? 'rotateX(0deg)' : 'rotateX(180deg)',
          transition: 'transform 0.8s cubic-bezier(0.23, 1, 0.32, 1)',
          backfaceVisibility: 'hidden',
          background: 'linear-gradient(145deg, #475569, #334155)'
        }}
      >
        <span className={`${textSize} font-bold text-white font-mono tracking-wider leading-none`}
              style={{
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.8), 0 -1px 1px rgba(255, 255, 255, 0.2)',
                filter: 'drop-shadow(0 1px 1px rgba(255, 255, 255, 0.1))'
              }}>
          {char}
        </span>
      </div>
      
      {/* Mechanical click flash effect */}
      {isFlipped && (
        <div 
          className="absolute inset-0 bg-white pointer-events-none"
          style={{
            opacity: 0,
            animation: 'flash 0.1s ease-out',
          }}
        />
      )}
      
      <style>{`
        @keyframes flash {
          0% { opacity: 0.3; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default function SemmEquipmentPage() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();

  // Get user authentication info
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  // Postcards state
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const isAdmin = user?.isAdmin || user?.role === 'admin';

  // Admin state
  const [currentMakeIndex, setCurrentMakeIndex] = useState(0);
  const [reorderEnabled, setReorderEnabled] = useState(false);
  const [reorderItems, setReorderItems] = useState<Array<{ code: string; title: string }>>([]);

  // Fetch SEMM data to find the specific equipment
  const { data: semmData, isLoading, error } = useQuery({
    queryKey: ['/api/dev/semm-cards'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  // Fetch postcards for this equipment
  const { data: postcardsData, isLoading: postcardsLoading } = useQuery({
    queryKey: ['/api/semm/postcards', code, 'equipment'],
    enabled: !!code,
    staleTime: 60000, // 1 minute
  });

  // Upload postcard mutation
  const uploadPostcardMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/semm/postcards', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/semm/postcards', code, 'equipment'] });
      setIsUploadDialogOpen(false);
      setUploadTitle('');
      setUploadDescription('');
      setUploadedFile(null);
      toast({
        title: "Success",
        description: "Postcard uploaded successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload postcard",
        variant: "destructive",
      });
    },
  });

  // Like postcard mutation
  const likePostcardMutation = useMutation({
    mutationFn: async ({ postcardId, isLiked }: { postcardId: string; isLiked: boolean }) => {
      const method = isLiked ? 'DELETE' : 'POST';
      return apiRequest(`/api/semm/postcards/${postcardId}/like`, { method });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/semm/postcards', code, 'equipment'] });
    },
  });

  // Share postcard mutation
  const sharePostcardMutation = useMutation({
    mutationFn: async (postcardId: string) => {
      return apiRequest(`/api/semm/postcards/${postcardId}/share`, {
        method: 'POST',
        body: JSON.stringify({ shareType: 'link' }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/semm/postcards', code, 'equipment'] });
      toast({
        title: "Shared",
        description: "Postcard shared successfully!",
      });
    },
  });

  // Upload functionality
  const handleGetUploadParameters = async () => {
    try {
      const response = await apiRequest('/api/semm/postcards/upload', {
        method: 'POST',
      });
      return {
        method: 'PUT' as const,
        url: response.uploadURL,
      };
    } catch (error) {
      console.error('Error getting upload URL:', error);
      throw error;
    }
  };

  const handleUploadComplete = (result: any) => {
    const uploadedFile = result.successful[0];
    if (uploadedFile) {
      const file = uploadedFile.data as File;
      const mediaType = file.type.startsWith('video/') ? 'video' : 
                       file.type.startsWith('image/') ? 'image' : 'document';
      
      // For videos, we need to get duration
      let mediaDuration = 0;
      if (mediaType === 'video') {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.onloadedmetadata = () => {
          mediaDuration = video.duration;
          URL.revokeObjectURL(video.src);
        };
      }

      setUploadedFile({
        url: uploadedFile.uploadURL,
        type: mediaType,
        size: file.size,
        duration: mediaDuration,
        name: file.name,
      });
    }
  };

  const handleSubmitPostcard = () => {
    if (!uploadedFile || !uploadTitle.trim()) {
      toast({
        title: "Error",
        description: "Please provide a title and upload a file",
        variant: "destructive",
      });
      return;
    }

    uploadPostcardMutation.mutate({
      semmCode: code,
      semmType: 'equipment',
      title: uploadTitle,
      description: uploadDescription,
      mediaType: uploadedFile.type,
      mediaUrl: uploadedFile.url,
      mediaDuration: uploadedFile.duration,
      mediaSize: uploadedFile.size,
    });
  };

  const handleLikePostcard = (postcardId: string, isLiked: boolean) => {
    likePostcardMutation.mutate({ postcardId, isLiked });
  };

  const handleSharePostcard = (postcardId: string) => {
    sharePostcardMutation.mutate(postcardId);
  };

  const postcards = postcardsData?.postcards || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600 animate-pulse">Loading equipment details...</div>
      </div>
    );
  }

  if (error || !semmData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Failed to load equipment data</div>
      </div>
    );
  }

  // Find the specific equipment by code
  let foundEquipment = null;
  let parentSystem = null;

  // Check if semmData.data is an array of systems or has a systems property
  const systems = Array.isArray((semmData as any)?.data) ? (semmData as any).data : (semmData as any)?.systems || [];
  
  for (const system of systems) {
    if (system.equipment && Array.isArray(system.equipment)) {
      for (const equipment of system.equipment) {
        if (equipment.code === code) {
          foundEquipment = equipment;
          parentSystem = system;
          break;
        }
      }
    }
    if (foundEquipment) break;
  }

  if (!foundEquipment || !parentSystem) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Equipment with code "{code}" not found</div>
      </div>
    );
  }

  // Admin edit and reorder functions
  const handleEditEquipment = (equipmentCode: string) => {
    console.log('Edit equipment:', equipmentCode);
    // TODO: Implement edit equipment modal
  };

  const handleEditMake = (makeCode: string) => {
    console.log('Edit make:', makeCode);
    // TODO: Implement edit make modal
  };

  const handleReorderMakes = () => {
    if (!foundEquipment?.makes) return;
    
    const makes = foundEquipment.makes.map((make: any) => ({
      code: make.code,
      title: make.title
    }));
    
    setReorderItems(makes);
    setReorderEnabled(true);
  };

  const handleReorderSubmit = async () => {
    try {
      // Send the reordered makes with their original codes in new order
      // Backend will assign new sequential codes based on this order
      const orderedMakeData = reorderItems.map((item, index) => ({
        oldCode: item.code,
        makeName: item.title,
        newPosition: index
      }));
      
      await apiRequest('/api/dev/semm/reorder-makes', 'POST', { 
        systemCode: parentSystem.code, 
        equipmentCode: foundEquipment.code,
        orderedMakes: orderedMakeData
      });
      console.log('✅ Successfully reordered makes');
      setReorderEnabled(false);
      setReorderItems([]);
      
      // Refresh the data to show updated codes
      queryClient.invalidateQueries({ queryKey: ['/api/dev/semm-cards'] });
    } catch (error) {
      console.error('❌ Error reordering makes:', error);
    }
  };

  const handleCancelReorder = () => {
    setReorderEnabled(false);
    setReorderItems([]);
  };

  const moveItemUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...reorderItems];
    [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
    setReorderItems(newItems);
  };

  const moveItemDown = (index: number) => {
    if (index === reorderItems.length - 1) return;
    const newItems = [...reorderItems];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setReorderItems(newItems);
  };

  const goBack = () => {
    setLocation(`/machinetree/${parentSystem.code}`);
  };

  const goHome = () => {
    setLocation('/machinetree');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header with Back Arrow and Breadcrumb in One Line */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <button 
              onClick={goBack}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              data-testid="button-back"
              title="Back to System"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="hover:text-gray-700 cursor-pointer" onClick={goHome}>Machine Tree</span>
            <ChevronRight className="w-3 h-3" />
            <span className="hover:text-gray-700 cursor-pointer" onClick={goBack}>{parentSystem.title}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-700 font-medium">{foundEquipment.title}</span>
          </div>

          {/* Share Icon */}
          <button
            className="flex items-center space-x-2 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
            data-testid="button-share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Code Card - Top Left */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="text-left">
              <div className="text-xs font-bold text-gray-500 mb-2 tracking-widest">EQUIPMENT</div>
              <div className="flex items-center space-x-1">
                <FlipCard char={foundEquipment.code[0]} index={0} large={true} />
                <FlipCard char={foundEquipment.code[1]} index={1} large={true} />
              </div>
            </div>
            
            <div>
              <h1 className="text-3xl font-black text-gray-900 mb-2">
                {foundEquipment.title}
              </h1>
              <p className="text-sm text-gray-600">
                Maritime equipment classification: <span className="font-bold text-orange-600">{parentSystem.title}</span>
              </p>
            </div>
          </div>

          {/* Admin Edit Button */}
          {isAdmin && (
            <button
              onClick={() => handleEditEquipment(foundEquipment.code)}
              className="flex items-center space-x-2 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
              title="Edit Equipment"
              data-testid="edit-equipment-btn"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit</span>
            </button>
          )}
        </div>

        {/* Makes Cards Grid */}
        {foundEquipment.makes && foundEquipment.makes.length > 0 ? (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Makes for {foundEquipment.title}</h2>
              {isAdmin && !reorderEnabled && (
                <button
                  onClick={handleReorderMakes}
                  className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg"
                  title="Reorder Makes"
                  data-testid="reorder-makes-btn"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Reorder Controls - Fixed buttons when in reorder mode */}
            {reorderEnabled && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-orange-800">Reorder Makes</h3>
                  <div className="flex space-x-3">
                    <Button
                      variant="outline"
                      onClick={handleCancelReorder}
                      data-testid="cancel-reorder"
                      className="border-orange-300 text-orange-600 hover:bg-orange-100"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleReorderSubmit}
                      data-testid="save-reorder"
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      Save Order
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(reorderEnabled ? reorderItems : foundEquipment.makes).map((make: any, index: number) => (
                <div 
                  key={make.code}
                  className={`bg-white rounded-xl shadow-lg border border-gray-200 p-6 transition-shadow group ${
                    reorderEnabled ? 'cursor-default' : 'cursor-pointer hover:shadow-xl'
                  }`}
                  onClick={reorderEnabled ? undefined : () => setLocation(`/machinetree/${make.code}`)}
                  data-testid={`make-card-${make.code}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                        <span className="text-orange-600 font-bold">{make.code}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 group-hover:text-orange-600 transition-colors">
                          {make.title}
                        </h3>
                        <p className="text-sm text-gray-500">Make Type</p>
                      </div>
                    </div>
                    
                    {/* Reorder controls when in reorder mode */}
                    {reorderEnabled ? (
                      <div className="flex flex-col space-y-1">
                        <button
                          onClick={() => moveItemUp(index)}
                          disabled={index === 0}
                          className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-white transition-colors"
                          data-testid={`move-up-${make.code}`}
                          title="Move up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveItemDown(index)}
                          disabled={index === reorderItems.length - 1}
                          className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-white transition-colors"
                          data-testid={`move-down-${make.code}`}
                          title="Move down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      {make.description || `${make.title} make classification`}
                    </p>
                    
                    {make.models && make.models.length > 0 && (
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-500">Models Available</span>
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                          {make.models.length} {make.models.length === 1 ? 'Model' : 'Models'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Admin edit button - only show when not in reorder mode */}
                  {isAdmin && !reorderEnabled && (
                    <div className="mt-4 pt-2 border-t border-gray-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditMake(make.code);
                        }}
                        className="flex items-center space-x-2 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors w-full justify-center"
                        title="Edit Make"
                        data-testid={`edit-make-${make.code}`}
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Edit Make</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-8 bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
            <p className="text-lg text-gray-600">No makes found for this equipment.</p>
          </div>
        )}

        {/* SEMM Postcards Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Equipment Postcards</h2>
            {isAuthenticated && (
              <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white" data-testid="button-upload-postcard">
                    <Upload className="w-4 h-4 mr-2" />
                    Share Content
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Share Equipment Content</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Title</label>
                      <Input
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                        placeholder="Add a title for your content..."
                        data-testid="input-postcard-title"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description (Optional)</label>
                      <Textarea
                        value={uploadDescription}
                        onChange={(e) => setUploadDescription(e.target.value)}
                        placeholder="Add a description..."
                        data-testid="textarea-postcard-description"
                      />
                    </div>
                    <div>
                      <ObjectUploader
                        maxNumberOfFiles={1}
                        maxFileSize={524288000} // 500MB
                        onGetUploadParameters={handleGetUploadParameters}
                        onComplete={handleUploadComplete}
                        data-testid="object-uploader-postcard"
                      >
                        <div className="flex items-center gap-2">
                          <Upload className="w-4 h-4" />
                          <span>Upload Video/Photo/PDF</span>
                          <span className="text-xs text-gray-500">(Max 500MB, Videos ≤90s)</span>
                        </div>
                      </ObjectUploader>
                    </div>
                    {uploadedFile && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm font-medium text-green-800">File ready: {uploadedFile.name}</p>
                        <p className="text-xs text-green-600">
                          {uploadedFile.type} • {(uploadedFile.size / 1024 / 1024).toFixed(1)}MB
                          {uploadedFile.duration > 0 && ` • ${uploadedFile.duration.toFixed(1)}s`}
                        </p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSubmitPostcard}
                        disabled={uploadPostcardMutation.isPending || !uploadedFile || !uploadTitle.trim()}
                        data-testid="button-submit-postcard"
                      >
                        {uploadPostcardMutation.isPending ? 'Publishing...' : 'Publish'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Postcards Grid - 9:16 aspect ratio */}
          {postcardsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-lg aspect-[9/16] animate-pulse">
                  <div className="bg-gray-300 rounded-xl w-full h-full"></div>
                </div>
              ))}
            </div>
          ) : postcards.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {postcards.map((postcard: any) => (
                <div 
                  key={postcard.id}
                  className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden aspect-[9/16] group hover:shadow-xl transition-shadow"
                  data-testid={`postcard-${postcard.id}`}
                >
                  {/* Media Content */}
                  <div className="relative h-2/3 bg-gray-100">
                    {postcard.media_type === 'video' ? (
                      <div className="relative w-full h-full">
                        <video 
                          className="w-full h-full object-cover rounded-t-xl"
                          controls
                          poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 600'%3E%3Crect width='400' height='600' fill='%23f3f4f6'/%3E%3C/svg%3E"
                        >
                          <source src={postcard.media_url} type="video/mp4" />
                        </video>
                        <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs flex items-center">
                          <Video className="w-3 h-3 mr-1" />
                          {postcard.media_duration && `${Math.round(postcard.media_duration)}s`}
                        </div>
                      </div>
                    ) : postcard.media_type === 'image' ? (
                      <div className="relative w-full h-full">
                        <img 
                          src={postcard.media_url} 
                          alt={postcard.title}
                          className="w-full h-full object-cover rounded-t-xl"
                        />
                        <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs flex items-center">
                          <Image className="w-3 h-3 mr-1" />
                          Photo
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200 rounded-t-xl">
                        <div className="text-center">
                          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-xs text-gray-500">PDF Document</p>
                        </div>
                        <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs flex items-center">
                          <FileText className="w-3 h-3 mr-1" />
                          PDF
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-3 h-1/3 flex flex-col">
                    <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 mb-1">
                      {postcard.title}
                    </h3>
                    {postcard.description && (
                      <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                        {postcard.description}
                      </p>
                    )}
                    
                    {/* Author and Actions */}
                    <div className="mt-auto flex items-center justify-between text-xs text-gray-500">
                      <span className="truncate">
                        {postcard.author_name || postcard.author_nickname || 'Anonymous'}
                      </span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleLikePostcard(postcard.id, postcard.isLiked)}
                          className={`flex items-center space-x-1 transition-colors ${
                            postcard.isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                          }`}
                          data-testid={`button-like-${postcard.id}`}
                        >
                          <Heart className={`w-3 h-3 ${postcard.isLiked ? 'fill-current' : ''}`} />
                          <span>{postcard.likes_count || 0}</span>
                        </button>
                        <button
                          onClick={() => handleSharePostcard(postcard.id)}
                          className="flex items-center space-x-1 text-gray-400 hover:text-blue-500 transition-colors"
                          data-testid={`button-share-${postcard.id}`}
                        >
                          <Share className="w-3 h-3" />
                          <span>{postcard.shares_count || 0}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                  <Upload className="w-8 h-8 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No content shared yet</h3>
                  <p className="text-gray-600 mb-4">
                    Be the first to share photos, videos, or documents about this equipment.
                  </p>
                  {isAuthenticated ? (
                    <Button 
                      onClick={() => setIsUploadDialogOpen(true)}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                      data-testid="button-first-upload"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Share First Content
                    </Button>
                  ) : (
                    <p className="text-sm text-gray-500">Sign in to share content</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}