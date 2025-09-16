import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Paperclip, 
  X, 
  File, 
  Image, 
  Video, 
  FileText,
  Upload,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface FileWithPreview {
  url: string;
  name: string;
  type: string;
  size: number;
}

interface EnhancedFileUploadProps {
  value: string;
  onChange: (value: string) => void;
  attachments: string[];
  onAttachmentsChange: (attachments: string[]) => void;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  placeholder?: string;
  rows?: number;
  maxFiles?: number;
  maxFileSize?: number;
  label?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

const SUPPORTED_TYPES = {
  'image/': ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
  'video/': ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'],
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'text/': ['txt', 'csv']
};

export function EnhancedFileUpload({
  value,
  onChange,
  attachments,
  onAttachmentsChange,
  onGetUploadParameters,
  placeholder = "Describe your requirements...",
  rows = 5,
  maxFiles = 5,
  maxFileSize = 52428800, // 50MB
  label,
  required = false,
  className = "",
  disabled = false
}: EnhancedFileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Get file icon based on type
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-4 h-4 text-blue-500" />;
    if (type.startsWith('video/')) return <Video className="w-4 h-4 text-purple-500" />;
    if (type.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />;
    if (type.includes('word') || type.includes('doc')) return <FileText className="w-4 h-4 text-blue-600" />;
    if (type.includes('excel') || type.includes('sheet')) return <FileText className="w-4 h-4 text-green-600" />;
    return <File className="w-4 h-4 text-gray-500" />;
  };

  // Validate file type
  const isValidFileType = (file: File): boolean => {
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    
    // Check MIME type
    for (const [supportedType, extensions] of Object.entries(SUPPORTED_TYPES)) {
      if (fileType.startsWith(supportedType.replace('/', ''))) {
        return true;
      }
    }
    
    // Check file extension as fallback
    const extension = fileName.split('.').pop() || '';
    for (const extensions of Object.values(SUPPORTED_TYPES)) {
      if (extensions.includes(extension)) {
        return true;
      }
    }
    
    return false;
  };

  // Validate file size
  const isValidFileSize = (file: File): boolean => {
    return file.size <= maxFileSize;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Upload files
  const uploadFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    // Check if adding these files would exceed the limit
    if (attachments.length + files.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `Maximum ${maxFiles} files allowed. You can attach ${maxFiles - attachments.length} more file(s).`,
        variant: "destructive",
      });
      return;
    }

    // Validate files
    const invalidFiles: { file: File; reason: string }[] = [];
    const validFiles: File[] = [];

    files.forEach(file => {
      if (!isValidFileType(file)) {
        invalidFiles.push({ file, reason: 'Unsupported file type' });
      } else if (!isValidFileSize(file)) {
        invalidFiles.push({ file, reason: `File too large (max ${formatFileSize(maxFileSize)})` });
      } else {
        validFiles.push(file);
      }
    });

    // Show validation errors
    if (invalidFiles.length > 0) {
      invalidFiles.forEach(({ file, reason }) => {
        toast({
          title: "Upload failed",
          description: `${file.name}: ${reason}`,
          variant: "destructive",
        });
      });
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    const newAttachments: string[] = [];

    try {
      for (const file of validFiles) {
        try {
          setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
          
          // Get upload parameters
          const uploadParams = await onGetUploadParameters();
          
          setUploadProgress(prev => ({ ...prev, [file.name]: 25 }));
          
          // Upload file
          const uploadResponse = await fetch(uploadParams.url, {
            method: uploadParams.method,
            body: file,
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
            },
          });

          setUploadProgress(prev => ({ ...prev, [file.name]: 75 }));

          if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
          }

          // Store the upload URL
          const fileUrl = uploadParams.url.split('?')[0];
          newAttachments.push(fileUrl);
          
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
          
          toast({
            title: "File uploaded",
            description: `${file.name} uploaded successfully`,
          });

        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          toast({
            title: "Upload failed",
            description: `Failed to upload ${file.name}`,
            variant: "destructive",
          });
        }
      }

      // Update attachments if any uploads succeeded
      if (newAttachments.length > 0) {
        onAttachmentsChange([...attachments, ...newAttachments]);
      }

    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  }, [attachments, maxFiles, maxFileSize, onGetUploadParameters, onAttachmentsChange, toast]);

  // Handle file selection
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      uploadFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle drag and drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set drag over to false if we're leaving the textarea itself
    if (e.currentTarget === e.target) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      uploadFiles(files);
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const files = items
      .filter(item => item.kind === 'file')
      .map(item => item.getAsFile())
      .filter((file): file is File => file !== null);

    if (files.length > 0) {
      e.preventDefault();
      uploadFiles(files);
    }
  };

  // Remove attachment
  const removeAttachment = (fileUrl: string) => {
    onAttachmentsChange(attachments.filter(url => url !== fileUrl));
    toast({
      title: "File removed",
      description: "File attachment has been removed",
    });
  };

  // Get filename from URL
  const getFilenameFromUrl = (url: string): string => {
    try {
      const pathname = new URL(url).pathname;
      return decodeURIComponent(pathname.split('/').pop() || 'Unknown file');
    } catch {
      return url.split('/').pop() || 'Unknown file';
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {label && (
        <Label htmlFor="enhanced-textarea" className="text-sm font-medium">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      
      <div className="relative">
        {/* Enhanced Textarea with drag and drop */}
        <div className="relative">
          <Textarea
            ref={textareaRef}
            id="enhanced-textarea"
            placeholder={placeholder}
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onPaste={handlePaste}
            disabled={disabled}
            className={`
              border-orange-200 focus:border-orange-500 resize-none
              ${isDragOver ? 'border-orange-500 bg-orange-50 border-2 border-dashed' : ''}
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            data-testid="textarea-enhanced-description"
          />
          
          {/* Drag overlay */}
          {isDragOver && (
            <div className="absolute inset-0 bg-orange-50 bg-opacity-90 border-2 border-dashed border-orange-500 rounded-md flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <Upload className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <p className="text-orange-600 font-medium">Drop files here to upload</p>
                <p className="text-orange-500 text-sm">Images, videos, documents</p>
              </div>
            </div>
          )}

          {/* Upload button positioned near textarea */}
          <div className="absolute top-2 right-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleFileSelect}
              disabled={disabled || isUploading}
              className="p-2 h-auto bg-white hover:bg-orange-50 border border-orange-200 hover:border-orange-400 text-orange-600 hover:text-orange-700 shadow-sm"
              data-testid="button-upload-files"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* File input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          style={{ display: 'none' }}
          data-testid="input-file-hidden"
        />
      </div>

      {/* Upload progress */}
      {isUploading && Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([filename, progress]) => (
            <div key={filename} className="flex items-center gap-2 text-sm">
              <Upload className="w-4 h-4 text-orange-500 animate-pulse" />
              <span className="flex-1 truncate">{filename}</span>
              <span className="text-orange-600">{progress}%</span>
            </div>
          ))}
        </div>
      )}

      {/* File attachments */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Attachments ({attachments.length}/{maxFiles})
          </p>
          <div className="space-y-2">
            {attachments.map((fileUrl, index) => {
              const filename = getFilenameFromUrl(fileUrl);
              const fileExtension = filename.split('.').pop()?.toLowerCase() || '';
              let fileType = 'application/octet-stream';
              
              // Guess file type from extension
              if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExtension)) {
                fileType = 'image/' + fileExtension;
              } else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(fileExtension)) {
                fileType = 'video/' + fileExtension;
              } else if (fileExtension === 'pdf') {
                fileType = 'application/pdf';
              } else if (['doc', 'docx'].includes(fileExtension)) {
                fileType = 'application/msword';
              }

              return (
                <div
                  key={`attachment-${index}-${fileUrl}`}
                  className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg group hover:bg-orange-100 transition-colors"
                  data-testid={`attachment-item-${index}`}
                >
                  <div className="flex-shrink-0">
                    {getFileIcon(fileType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {filename}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAttachment(fileUrl)}
                    className="p-1 h-auto text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    data-testid={`button-remove-attachment-${index}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Help text */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Drag and drop files over the text area or use Ctrl+V to paste</p>
        <p>• Supported: Images, videos, PDF, Word, Excel, text files</p>
        <p>• Maximum {maxFiles} files, {formatFileSize(maxFileSize)} each</p>
      </div>
    </div>
  );
}