import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Trash2 } from 'lucide-react';

interface QBOTInputAreaProps {
  onSendMessage: (message: string) => void;
  onClearHistory?: () => void;
  disabled?: boolean;
}

export default function QBOTInputArea({ onSendMessage, onClearHistory, disabled = false }: QBOTInputAreaProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
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
    <div className="border-t border-gray-200 bg-gradient-to-r from-red-500 to-orange-500 p-4">
      <div className="flex items-end gap-2">
        {/* Clear Chat History Icon */}
        {onClearHistory && (
          <button
            onClick={onClearHistory}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
            aria-label="Clear chat history"
            title="Clear chat history"
          >
            <Trash2 size={20} className="text-white" />
          </button>
        )}
        
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onInput={handleInput}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          disabled={disabled}
          className="flex-1 resize-none rounded-lg border border-white/20 px-4 py-2 
                   bg-white/90 backdrop-blur-sm
                   focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent
                   disabled:opacity-50 disabled:cursor-not-allowed
                   placeholder:text-gray-500 text-gray-700
                   min-h-[40px] max-h-[120px] overflow-y-auto"
          rows={1}
        />
        
        <button
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          className={`
            p-2 rounded-lg transition-all duration-200 flex-shrink-0
            ${message.trim() && !disabled
              ? 'bg-white text-red-500 hover:bg-white/90 shadow-sm' 
              : 'bg-white/30 text-white/50 cursor-not-allowed'
            }
          `}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}