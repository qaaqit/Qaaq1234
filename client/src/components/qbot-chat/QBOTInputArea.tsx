import { useState, useRef, KeyboardEvent, useEffect } from 'react';
import { Paperclip, Send, Crown, Shield, ShieldCheck } from 'lucide-react';
import { ObjectUploader } from "@/components/ObjectUploader";
import { PremiumSubscriptionDialog } from "@/components/PremiumSubscriptionDialog";

import { useQuery } from "@tanstack/react-query";

const DEFAULT_CHATBOT_INVITES = [
  "Engine trouble? Ask away!",
  "Pump problem? Fire away!",
  "Boiler blues? Let's chat!",
  "Ship system issue?",
  "Maritime emergency?",
  "Technical question?",
  "Equipment doubt?",
  "Maintenance query?",
  "Safety concern?",
  "Navigation puzzle?",
  "Cargo confusion?",
  "Fuel system query?",
  "Generator glitch?",
  "Valve vexation?",
  "Pipe puzzle?",
  "Motor malfunction?",
  "Control confusion?",
  "System stumped?",
  "Machine mystery?",
  "Tool trouble?",
  "Part problem?",
  "Quick question?",
  "Need help?",
  "Ask QBOT!",
  "Maritime doubt?",
  "Ship query?",
  "Tech trouble?",
  "Equipment help?",
  "System support?",
  "Expert advice?"
];

interface QBOTInputAreaProps {
  onSendMessage: (message: string, attachments?: string[], isPrivate?: boolean) => void;
  disabled?: boolean;
}

interface User {
  isAdmin?: boolean;
  isPremium?: boolean;
}

export default function QBOTInputArea({ onSendMessage, disabled = false }: QBOTInputAreaProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [currentPlaceholder, setCurrentPlaceholder] = useState('');
  const [isPremiumMode, setIsPremiumMode] = useState(false);
  const [isPrivateMode, setIsPrivateMode] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch user subscription status
  const { data: userStatus } = useQuery({
    queryKey: ['/api/user/subscription-status'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get random placeholder from chatbot invites
  const getRandomPlaceholder = () => {
    const saved = localStorage.getItem('chatbotInvites');
    const invites = saved ? JSON.parse(saved) : DEFAULT_CHATBOT_INVITES;
    return invites[Math.floor(Math.random() * invites.length)];
  };

  // Initialize placeholder once per login session
  useEffect(() => {
    // Check if we already have a session placeholder
    const sessionPlaceholder = sessionStorage.getItem('qbotSessionPlaceholder');
    
    if (sessionPlaceholder) {
      setCurrentPlaceholder(sessionPlaceholder);
    } else {
      // Generate new placeholder for this session
      const newPlaceholder = getRandomPlaceholder();
      setCurrentPlaceholder(newPlaceholder);
      sessionStorage.setItem('qbotSessionPlaceholder', newPlaceholder);
    }

    // Listen for chatbot invites updates (admin changes)
    const handleInvitesUpdate = () => {
      const newPlaceholder = getRandomPlaceholder();
      setCurrentPlaceholder(newPlaceholder);
      sessionStorage.setItem('qbotSessionPlaceholder', newPlaceholder);
    };

    window.addEventListener('chatbotInvitesUpdated', handleInvitesUpdate);

    return () => {
      window.removeEventListener('chatbotInvitesUpdated', handleInvitesUpdate);
    };
  }, []);

  const handleSend = () => {
    if ((message.trim() || attachments.length > 0) && !disabled) {
      onSendMessage(message.trim() || "📎 Attachment(s) sent", attachments, isPrivateMode);
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
          'Authorization': `Bearer ${localStorage.getItem('qaaq_token')}`
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
      const fileUrls = result.successful.map((file: any) => file.name);
      setAttachments(prev => [...prev, ...fileUrls]);
      
      console.log(`${result.successful.length} file(s) uploaded successfully`);
    }
  };

  // Handle crown click for premium mode toggle
  const togglePremiumMode = () => {
    const isUserPremium = (userStatus as any)?.isPremium || (userStatus as any)?.isSuperUser || false;
    const isUserAdmin = localStorage.getItem('isAdmin') === 'true';

    if (!isUserPremium && !isUserAdmin) {
      // Show subscription dialog for non-premium users
      setShowSubscriptionDialog(true);
    } else {
      // Toggle premium mode for premium/admin users
      setIsPremiumMode(!isPremiumMode);
    }
  };

  // Handle privacy mode toggle (only for premium/admin users)
  const togglePrivacyMode = () => {
    const isUserPremium = (userStatus as any)?.isPremium || (userStatus as any)?.isSuperUser || false;
    const isUserAdmin = localStorage.getItem('isAdmin') === 'true';

    if (isUserPremium || isUserAdmin) {
      setIsPrivateMode(!isPrivateMode);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !disabled) {
      e.preventDefault();
      handleSend();
    }
    // Shift+Enter creates a new line (default behavior)
  };



  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Check if the pasted item is an image
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault(); // Prevent default paste behavior for images
        
        const file = item.getAsFile();
        if (!file) continue;
        
        // Validate file size (50MB limit)
        if (file.size > 52428800) {
          console.error("Image too large: Maximum image size is 50MB");
          continue;
        }
        
        try {
          // Get upload URL
          const { url } = await handleGetUploadParameters();
          
          // Upload the pasted image
          const uploadResponse = await fetch(url, {
            method: 'PUT',
            body: file,
            headers: {
              'Content-Type': file.type || 'image/png',
            },
          });

          if (uploadResponse.ok) {
            const fileName = `pasted-image-${Date.now()}.${file.type.split('/')[1] || 'png'}`;
            setAttachments(prev => [...prev, fileName]);
            
            console.log("Image pasted and uploaded successfully from clipboard");
          } else {
            throw new Error('Upload failed');
          }
        } catch (error) {
          console.error('Error uploading pasted image:', error);
        }
      }
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
    <div className="p-4 bg-transparent">
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="mb-3 p-2 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600 mb-2">Attachments ({attachments.length}):</div>
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment, index) => (
              <div key={index} className="flex items-center gap-2 bg-white px-2 py-1 rounded border text-xs">
                <Paperclip size={12} />
                <span className="max-w-20 truncate" title={attachment}>
                  {attachment.startsWith('pasted-image') ? '🖼️ Pasted Image' : `📄 ${attachment}`}
                </span>
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
      
      {/* Chat input container with icons inside */}
      <div className="relative">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onInput={handleInput}
            onKeyPress={handleKeyPress}
            onPaste={handlePaste}
            placeholder={currentPlaceholder}
            disabled={disabled}
            className="w-full resize-none rounded-lg border border-gray-300 pl-12 pr-20 pt-3 pb-3
                     focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                     disabled:opacity-50 disabled:cursor-not-allowed
                     placeholder:text-gray-400 text-gray-700
                     min-h-[64px] max-h-[120px] overflow-y-auto"
            style={{ resize: 'none' }}
            rows={2}
          />
          
          {/* Left side icons - Privacy and Crown */}
          <div className="absolute left-3 top-1 flex flex-col items-center gap-1">
            {/* Privacy Shield (only for premium/admin users) */}
            {((userStatus as any)?.isPremium || (userStatus as any)?.isSuperUser || localStorage.getItem('isAdmin') === 'true') && (
              <button
                onClick={togglePrivacyMode}
                className="p-1 rounded transition-all duration-200 text-gray-400 hover:bg-gray-100"
                title={isPrivateMode ? "Private Mode: Chat not stored in database" : "Enable Private Mode"}
              >
                {isPrivateMode ? (
                  <ShieldCheck size={14} className="fill-current text-green-600" />
                ) : (
                  <Shield size={14} className="text-gray-400" />
                )}
              </button>
            )}
            
            {/* Crown icon */}
            <button
              onClick={togglePremiumMode}
              className="p-1 rounded transition-all duration-200 text-gray-400 hover:bg-gray-100"
              title={isPremiumMode ? "Premium Mode Active" : "Enable Premium Mode"}
            >
              <Crown size={16} className={isPremiumMode ? "fill-current text-yellow-600" : ""} />
            </button>
          </div>

          {/* Right side icons inside text box - Attach and Send */}
          <div className="absolute right-3 top-1 flex items-center gap-1">
            {/* Attachment Button */}
            <ObjectUploader
              maxNumberOfFiles={5}
              maxFileSize={52428800} // 50MB
              onGetUploadParameters={handleGetUploadParameters}
              onComplete={handleUploadComplete}
              buttonClassName="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-all duration-200"
            >
              <Paperclip size={16} />
            </ObjectUploader>
            
            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={disabled || (!message.trim() && attachments.length === 0)}
              className={`
                p-2 rounded-lg transition-all duration-200 flex-shrink-0
                ${(message.trim() || attachments.length > 0) && !disabled
                  ? 'text-gray-400 hover:bg-gray-100' 
                  : 'text-gray-300 cursor-not-allowed'
                }
              `}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Premium Subscription Dialog */}
      <PremiumSubscriptionDialog 
        open={showSubscriptionDialog}
        onOpenChange={setShowSubscriptionDialog}
        defaultPlanType="premium"
      />
    </div>
  );
}