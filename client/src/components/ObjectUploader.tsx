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

          console.log(`📤 Starting upload for ${file.name}...`);
          
          // Get upload parameters
          const uploadParams = await onGetUploadParameters();
          console.log(`🔗 Got upload URL for ${file.name}`);
          console.log(`🔍 Upload params:`, uploadParams);
          
          if (!uploadParams.url) {
            throw new Error('Upload URL is missing from server response');
          }
          
          // Upload file with better error handling
          // Note: Don't set Content-Type header for signed URLs as it may not be included in the signature
          const uploadResponse = await fetch(uploadParams.url, {
            method: uploadParams.method,
            body: file,
          });

          if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
          }

          console.log(`✅ Upload successful for ${file.name}`);

          // Create file data object
          const fileData = {
            uploadURL: uploadParams.url ? uploadParams.url.split('?')[0] : '', // Remove query parameters, handle undefined
            name: file.name,
            type: file.type,
            size: file.size,
            data: file // Include original file data
          };
          
          uploadedFiles.push(fileData);
          console.log(`📋 Added ${file.name} to upload results`);
          
        } catch (error) {
          console.error(`❌ Error uploading ${file.name}:`, error);
          // Log detailed error information
          if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
          } else {
            console.error('Unknown error type:', typeof error, error);
          }
          throw error; // Re-throw to show user the error
        }
      }

      if (uploadedFiles.length > 0) {
        console.log(`🎉 Calling onComplete with ${uploadedFiles.length} files`);
        onComplete?.({ successful: uploadedFiles });
      } else {
        console.warn('⚠️ No files were uploaded successfully');
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
        variant="ghost"
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