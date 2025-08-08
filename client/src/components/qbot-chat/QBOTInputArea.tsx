import { useState, useRef, KeyboardEvent, useEffect } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_CHATBOT_INVITES = [
  "Trick Question or Engine Room Reality?",
  "Brainstorm Before Rainstorm?", 
  "Ever Heard the Chief Say This?",
  "Guess Before It Sinks!",
  "Bridge or Bluff?",
  "Sailor's Pop Quiz! Ready?",
  "Sea Logic or Ship Magic?",
  "This One's Hotter Than E/R on Fire Watch!",
  "Smarter Than Your 2/E? Prove It.",
  "Don't Let the Cadet Answer First!",
  "Main Engine Trick or Treat?",
  "Radar's On… But Are You?",
  "Purifier Puzzle! Swipe to Solve.",
  "One Alarm… A Hundred Theories.",
  "This Ain't in Your DG Approved Notes.",
  "Ship Roll or Role Confusion?",
  "Code 710? Or Just A Galley Rumor?",
  "Log Book Says One Thing… Reality Another?",
  "Can You Solve This Before UMS Buzzer Rings?",
  "Chai Break Mein Ye Socho…",
  "2nd Engineer Bolega: Kya Samjha Iska Matlab?",
  "Galley Ka Chana Garam Se Tez Hai Ye Sawal!",
  "Ustad Bole – Answer Bata, Varna Line Mein Lag.",
  "DG Shipping Is Watching... Think Fast!",
  "Ship Mein Wifi Nahi, Dimaag Toh On Rakho!",
  "Aur Batao, Ye Doubt Kisko Dena Hai?",
  "Boss Chief Asks: Can You Answer This?",
  "No Signal? Still Got This Puzzle!",
  "Kapag Hindi Mo Alam… Lagot Ka Sa Bosun!",
  "Midwatch Thinking? Try This!",
  "Before Your Karaoke Turn, Try Solving This!",
  "Galley Gossip or Nautical Fact?",
  "PO3 Says Only Smart Guys Know This!",
  "Guess What?",
  "You Think You Know?",
  "Wait, Really?",
  "Spot the Mistake?",
  "Ever Wondered Why?",
  "Sounds Easy, Right?",
  "Let's Test That Brain!",
  "Pop Quiz!",
  "Not What You Think!",
  "Challenge Accepted?",
  "Bug or Feature?",
  "Logic Says One Thing…",
  "Ctrl + Z That Thought!",
  "CPU Says No. You Say Yes?",
  "It Works on My Machine!",
  "One Line of Code… One Big Mess.",
  "Compiled… But Not Complied!",
  "This One's Hotter Than Your Maggi.",
  "Better Than Spicy Paneer Momos.",
  "More Twisted Than Desi Chinese.",
  "Click Before It Gets Cold!",
  "Masala for Your Monday.",
  "Brain Fry > French Fry.",
  "Too Good to Scroll Past."
];

interface QBOTInputAreaProps {
  onSendMessage: (message: string, attachments?: string[]) => void;
  disabled?: boolean;
}

export default function QBOTInputArea({ onSendMessage, disabled = false }: QBOTInputAreaProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [currentPlaceholder, setCurrentPlaceholder] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Get random placeholder from chatbot invites
  const getRandomPlaceholder = () => {
    const saved = localStorage.getItem('chatbotInvites');
    const invites = saved ? JSON.parse(saved) : DEFAULT_CHATBOT_INVITES;
    return invites[Math.floor(Math.random() * invites.length)];
  };

  // Initialize and update placeholder
  useEffect(() => {
    setCurrentPlaceholder(getRandomPlaceholder());

    // Listen for chatbot invites updates
    const handleInvitesUpdate = () => {
      setCurrentPlaceholder(getRandomPlaceholder());
    };

    window.addEventListener('chatbotInvitesUpdated', handleInvitesUpdate);
    
    // Set interval to change placeholder every 10 seconds
    const interval = setInterval(() => {
      setCurrentPlaceholder(getRandomPlaceholder());
    }, 10000);

    return () => {
      window.removeEventListener('chatbotInvitesUpdated', handleInvitesUpdate);
      clearInterval(interval);
    };
  }, []);

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
          toast({
            title: "Image Too Large",
            description: "Maximum image size is 50MB",
            variant: "destructive"
          });
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
            
            toast({
              title: "Image Pasted",
              description: "Image uploaded successfully from clipboard",
            });
          } else {
            throw new Error('Upload failed');
          }
        } catch (error) {
          console.error('Error uploading pasted image:', error);
          toast({
            title: "Upload Error",
            description: "Failed to upload pasted image. Please try again.",
            variant: "destructive"
          });
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
    <div className="border-t border-gray-200 bg-white p-4">
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
      
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onInput={handleInput}
          onKeyPress={handleKeyPress}
          onPaste={handlePaste}
          placeholder={currentPlaceholder}
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