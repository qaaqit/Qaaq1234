import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Star, Trash2, Eye, Crown, FileImage, Plus, ArrowUp, ArrowDown } from "lucide-react";

interface QuestionAttachment {
  id: string;
  questionId: number;
  attachmentUrl: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
  question: {
    id: number;
    content: string;
    authorId: string;
  };
}

interface CarouselSelection {
  id: string;
  position: number;
  notes: string;
  selectedAt: string;
  attachmentId: string;
  attachmentUrl: string;
  fileName: string;
  questionContent: string;
  selectedByName: string;
}

export default function AdminFiles() {
  const [, setLocation] = useLocation();
  const [selectedPosition, setSelectedPosition] = useState(1);
  const [selectionNotes, setSelectionNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all attachments
  const { data: attachments, isLoading: attachmentsLoading } = useQuery({
    queryKey: ["/api/questions/attachments"],
    queryFn: () => apiRequest("/api/questions/attachments?limit=50"),
  });

  // Fetch current carousel selections
  const { data: carouselSelections, isLoading: selectionsLoading } = useQuery({
    queryKey: ["/api/admin/carousel-selections"],
    queryFn: () => apiRequest("/api/admin/carousel-selections"),
  });

  // Add to carousel mutation
  const addToCarouselMutation = useMutation({
    mutationFn: (data: { attachmentId: string; position: number; notes: string }) =>
      apiRequest("/api/admin/carousel-selections", "POST", data),
    onSuccess: () => {
      toast({ title: "Success", description: "Image added to carousel" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/carousel-selections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/questions/attachments"] });
      setSelectionNotes("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to add image to carousel",
        variant: "destructive" 
      });
    },
  });

  // Remove from carousel mutation
  const removeFromCarouselMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/admin/carousel-selections/${id}`, "DELETE"),
    onSuccess: () => {
      toast({ title: "Success", description: "Image removed from carousel" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/carousel-selections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/questions/attachments"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to remove image from carousel",
        variant: "destructive" 
      });
    },
  });

  // Check if image is already in carousel
  const isInCarousel = (attachmentId: string) => {
    return carouselSelections?.some((selection: CarouselSelection) => 
      selection.attachmentId === attachmentId
    );
  };

  // Get next available position
  const getNextPosition = () => {
    if (!carouselSelections || carouselSelections.length === 0) return 1;
    const positions = carouselSelections.map((s: CarouselSelection) => s.position);
    const maxPosition = Math.max(...positions);
    return maxPosition + 1;
  };

  // Handle add to carousel
  const handleAddToCarousel = (attachmentId: string) => {
    const position = getNextPosition();
    addToCarouselMutation.mutate({
      attachmentId,
      position,
      notes: selectionNotes || `Added to carousel at position ${position}`
    });
  };

  if (attachmentsLoading || selectionsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading file management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/admin")}
                className="mr-4 text-gray-600 hover:text-orange-600"
              >
                ← Back to Admin
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <FileImage className="mr-3 text-orange-600" size={28} />
                  File Management & Carousel Selection
                </h1>
                <p className="text-gray-600 mt-1">Manage uploaded files and select homepage carousel images</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              <Crown className="mr-1" size={14} />
              Admin Panel
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Current Carousel Selections */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="mr-2 text-yellow-500" size={20} />
              Current Carousel Images ({carouselSelections?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {carouselSelections && carouselSelections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {carouselSelections.map((selection: CarouselSelection) => (
                  <div key={selection.id} className="bg-gray-50 rounded-lg p-4 border-2 border-orange-200">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-orange-600 text-white">
                        Position {selection.position}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCarouselMutation.mutate(selection.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                    <img
                      src={selection.attachmentUrl}
                      alt={selection.fileName}
                      className="w-full h-32 object-cover rounded mb-2"
                    />
                    <p className="text-sm font-medium text-gray-800 mb-1">{selection.fileName}</p>
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">{selection.questionContent}</p>
                    <p className="text-xs text-orange-600">Selected by {selection.selectedByName}</p>
                    {selection.notes && (
                      <p className="text-xs text-gray-500 mt-1 italic">{selection.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Star className="mx-auto mb-2" size={32} />
                <p>No images selected for carousel yet</p>
                <p className="text-sm">Choose images from the gallery below</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selection Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Selection Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optional)
                </label>
                <Textarea
                  value={selectionNotes}
                  onChange={(e) => setSelectionNotes(e.target.value)}
                  placeholder="Add notes about why this image was selected..."
                  className="h-20"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* All Available Images */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileImage className="mr-2 text-blue-500" size={20} />
              All Uploaded Images ({attachments?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attachments && attachments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {attachments.map((attachment: QuestionAttachment) => (
                  <div key={attachment.id} className="bg-white border rounded-lg p-3 hover:shadow-md transition-shadow">
                    <div className="relative mb-2">
                      <img
                        src={attachment.attachmentUrl}
                        alt={attachment.fileName}
                        className="w-full h-32 object-cover rounded"
                      />
                      {isInCarousel(attachment.id) && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-green-600 text-white text-xs">
                            <Star size={10} className="mr-1" />
                            In Carousel
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    <h4 className="font-medium text-sm text-gray-800 mb-1 truncate">
                      {attachment.fileName}
                    </h4>
                    
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {attachment.question?.content || "No associated question"}
                    </p>
                    
                    <div className="text-xs text-gray-500 mb-3">
                      <div>Type: {attachment.mimeType}</div>
                      <div>Added: {new Date(attachment.createdAt).toLocaleDateString()}</div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(attachment.attachmentUrl, '_blank')}
                        className="flex-1 text-xs"
                      >
                        <Eye size={14} className="mr-1" />
                        View
                      </Button>
                      
                      {!isInCarousel(attachment.id) ? (
                        <Button
                          size="sm"
                          onClick={() => handleAddToCarousel(attachment.id)}
                          disabled={addToCarouselMutation.isPending}
                          className="flex-1 bg-orange-600 hover:bg-orange-700 text-xs"
                        >
                          <Plus size={14} className="mr-1" />
                          Add to Carousel
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="flex-1 text-xs text-green-600 border-green-600"
                        >
                          <Star size={14} className="mr-1" />
                          Selected
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileImage className="mx-auto mb-2" size={32} />
                <p>No images found</p>
                <p className="text-sm">Upload images through the QBOT chat interface</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}