import { useState, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";


interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (result: any) => void;
  buttonClassName?: string;
  children: ReactNode;
}

/**
 * Enhanced file uploader with video validation and better error handling
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 524288000, // 500MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate video duration (max 90 seconds)
  const validateVideoDuration = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('video/')) {
        resolve(true); // Not a video, skip validation
        return;
      }

      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      
      video.onloadedmetadata = () => {
        const duration = video.duration;
        URL.revokeObjectURL(video.src);
        
        if (duration > 90) {
          console.error(`Video too long: ${duration}s exceeds 90 second limit`);
          resolve(false);
        } else {
          resolve(true);
        }
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        console.error('Failed to load video for validation');
        resolve(false);
      };
    });
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;
    
    // Validate number of files
    if (files.length > maxNumberOfFiles) {
      console.error(`Too many files selected. Maximum ${maxNumberOfFiles} allowed.`);
      return;
    }

    // Validate file sizes
    const oversizedFiles = files.filter(file => file.size > maxFileSize);
    if (oversizedFiles.length > 0) {
      console.error(`File too large. Maximum size is ${Math.round(maxFileSize / 1024 / 1024)}MB`);
      return;
    }

    setIsUploading(true);

    try {
      const uploadedFiles = [];
      
      for (const file of files) {
        try {
          // Validate video duration first
          const isValidDuration = await validateVideoDuration(file);
          if (!isValidDuration) {
            console.error(`Video ${file.name} exceeds 90 second limit`);
            continue;
          }

          // Get upload parameters
          const uploadParams = await onGetUploadParameters();
          
          // Upload file with better error handling
          const uploadResponse = await fetch(uploadParams.url, {
            method: uploadParams.method,
            body: file,
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
            },
          });

          if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
          }

          // Create file data object
          const fileData = {
            uploadURL: uploadParams.url.split('?')[0], // Remove query parameters
            name: file.name,
            type: file.type,
            size: file.size,
            data: file // Include original file data
          };
          
          uploadedFiles.push(fileData);
          
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          throw error; // Re-throw to show user the error
        }
      }

      if (uploadedFiles.length > 0) {
        onComplete?.({ successful: uploadedFiles });
      }

    } catch (error) {
      console.error('Upload failed:', error);
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
        multiple={maxNumberOfFiles > 1}
        onChange={handleFileChange}
        accept="video/*,image/*,.pdf"
        style={{ display: 'none' }}
      />
    </div>
  );
}