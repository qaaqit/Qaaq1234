import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";

interface QBOTInputAreaProps {
  onSendMessage: (message: string, attachments?: string[]) => void;
  disabled?: boolean;
}

export default function QBOTInputArea({ onSendMessage, disabled = false }: QBOTInputAreaProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const handleSend = () => {
    if ((message.trim() || attachments.length > 0) && !disabled) {
      onSendMessage(message.trim() || "📎 Attachment(s) sent", attachments);
      setMessage('');
      setAttachments([]);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleGetUploadParameters = async () => {
    try {
      const response = await fetch('/api/objects/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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
      toast({
        title: "Upload Error",
        description: "Failed to prepare file upload. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleUploadComplete = (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const fileUrls = result.successful.map((file: any) => file.name);
      setAttachments(prev => [...prev, ...fileUrls]);
      
      toast({
        title: "Upload Successful",
        description: `${result.successful.length} file(s) uploaded successfully`,
      });
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set height to scrollHeight, max 120px (about 5 lines)
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="mb-3 p-2 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600 mb-2">Attachments ({attachments.length}):</div>
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment, index) => (
              <div key={index} className="flex items-center gap-2 bg-white px-2 py-1 rounded border text-xs">
                <Paperclip size={12} />
                <span className="max-w-20 truncate">File {index + 1}</span>
                <button
                  onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onInput={handleInput}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          disabled={disabled}
          className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-2 
                   focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                   disabled:opacity-50 disabled:cursor-not-allowed
                   placeholder:text-gray-400 text-gray-700
                   min-h-[40px] max-h-[120px] overflow-y-auto"
          rows={1}
        />
        
        {/* Attachment Button */}
        <ObjectUploader
          maxNumberOfFiles={5}
          maxFileSize={52428800} // 50MB
          onGetUploadParameters={handleGetUploadParameters}
          onComplete={handleUploadComplete}
          buttonClassName="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-all duration-200"
        >
          <Paperclip size={20} className="text-gray-600" />
        </ObjectUploader>
        
        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={disabled || (!message.trim() && attachments.length === 0)}
          className={`
            p-2 rounded-lg transition-all duration-200
            ${(message.trim() || attachments.length > 0) && !disabled
              ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}