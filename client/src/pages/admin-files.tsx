import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Star, Trash2, Eye, Crown, FileImage } from "lucide-react";

interface UploadedFile {
  id: string;
  questionId: number;
  attachmentType: string;
  attachmentUrl: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  source: 'file_uploads' | 'question_attachments';
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all uploaded files (from both tables)
  const { data: uploadedFiles, isLoading: filesLoading } = useQuery({
    queryKey: ["/api/admin/uploaded-files"],
    queryFn: () => apiRequest("/api/admin/uploaded-files"),
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/uploaded-files"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/uploaded-files"] });
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
      notes: `Added to carousel at position ${position}`
    });
  };

  if (filesLoading || selectionsLoading) {
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

        {/* All Available Images */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileImage className="mr-2 text-blue-500" size={20} />
              All Uploaded Images ({uploadedFiles?.length || 0})
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">Click the crown icon on any image to add it to the homepage carousel</p>
          </CardHeader>
          <CardContent>
            {uploadedFiles && uploadedFiles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {uploadedFiles.map((file: UploadedFile) => (
                  <div key={file.id} className="bg-white border rounded-lg p-3 hover:shadow-md transition-shadow">
                    <div className="relative mb-2">
                      <img
                        src={file.attachmentUrl}
                        alt={file.fileName}
                        className="w-full h-32 object-cover rounded"
                      />
                      {/* Crown icon for carousel selection */}
                      <div className="absolute top-2 right-2">
                        <Button
                          variant={isInCarousel(file.id) ? "default" : "secondary"}
                          size="sm"
                          onClick={() => {
                            if (isInCarousel(file.id)) {
                              // Remove from carousel - find the selection and remove it
                              const selection = carouselSelections?.find((s: CarouselSelection) => s.attachmentId === file.id);
                              if (selection) {
                                removeFromCarouselMutation.mutate(selection.id);
                              }
                            } else {
                              // Add to carousel
                              handleAddToCarousel(file.id);
                            }
                          }}
                          disabled={addToCarouselMutation.isPending || removeFromCarouselMutation.isPending}
                          className={`h-8 w-8 p-1 ${isInCarousel(file.id) 
                            ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                            : 'bg-white/80 hover:bg-white text-gray-600 hover:text-orange-600 border'
                          }`}
                          title={isInCarousel(file.id) ? "Remove from carousel" : "Add to carousel"}
                        >
                          <Crown size={16} />
                        </Button>
                      </div>
                      {isInCarousel(file.id) && (
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-green-600 text-white text-xs">
                            <Star size={10} className="mr-1" />
                            In Carousel
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    <h4 className="font-medium text-sm text-gray-800 mb-1 truncate">
                      {file.originalName || file.fileName}
                    </h4>
                    
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {file.question?.content || "No associated question"}
                    </p>
                    
                    <div className="text-xs text-gray-500 mb-3">
                      <div>Type: {file.mimeType}</div>
                      <div>Size: {file.fileSize}MB</div>
                      <div>Source: {file.source}</div>
                      <div>Added: {new Date(file.createdAt).toLocaleDateString()}</div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(file.attachmentUrl, '_blank')}
                        className="flex-1 text-xs"
                      >
                        <Eye size={14} className="mr-1" />
                        View Full Size
                      </Button>
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