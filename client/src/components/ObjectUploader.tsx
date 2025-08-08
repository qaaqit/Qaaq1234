import { useState, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (result: { successful: Array<{ uploadURL: string; name: string }> }) => void;
  buttonClassName?: string;
  children: ReactNode;
}

/**
 * A simple file upload component that handles file attachments
 * 
 * Features:
 * - File selection through hidden input
 * - Size and type validation
 * - Direct upload to object storage
 * - Progress feedback
 * 
 * @param props - Component props
 */
export function ObjectUploader({
  maxNumberOfFiles = 5,
  maxFileSize = 52428800, // 50MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;
    
    // Validate number of files
    if (files.length > maxNumberOfFiles) {
      toast({
        title: "Too Many Files",
        description: `Maximum ${maxNumberOfFiles} files allowed`,
        variant: "destructive"
      });
      return;
    }

    // Validate file sizes
    const oversizedFiles = files.filter(file => file.size > maxFileSize);
    if (oversizedFiles.length > 0) {
      toast({
        title: "File Too Large",
        description: `Maximum file size is ${Math.round(maxFileSize / 1024 / 1024)}MB`,
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      const uploadedFiles = [];
      
      for (const file of files) {
        try {
          const { url } = await onGetUploadParameters();
          
          // Upload file to the presigned URL
          const uploadResponse = await fetch(url, {
            method: 'PUT',
            body: file,
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
            },
          });

          if (uploadResponse.ok) {
            uploadedFiles.push({
              uploadURL: url.split('?')[0], // Remove query parameters
              name: file.name
            });
          }
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
        }
      }

      if (uploadedFiles.length > 0) {
        onComplete?.({ successful: uploadedFiles });
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload files. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div>
      <Button 
        onClick={handleFileSelect} 
        className={buttonClassName}
        disabled={isUploading}
      >
        {isUploading ? "Uploading..." : children}
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.txt,.mp4,.mov,.avi"
        style={{ display: 'none' }}
      />
    </div>
  );
}