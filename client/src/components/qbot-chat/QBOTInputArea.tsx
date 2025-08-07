import { useState, useRef, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface QBOTInputAreaProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export default function QBOTInputArea({ onSendMessage, disabled = false }: QBOTInputAreaProps) {
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
    <div className="border-t border-gray-200 bg-white p-4">
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
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   disabled:opacity-50 disabled:cursor-not-allowed
                   placeholder:text-gray-400 text-gray-700
                   min-h-[40px] max-h-[120px] overflow-y-auto"
          rows={1}
        />
        
        <button
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          className={`
            p-2 rounded-lg transition-all duration-200
            ${message.trim() && !disabled
              ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm' 
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