import { format } from 'date-fns';
import type { Message } from './QBOTMessageList';

interface QBOTMessageProps {
  message: Message;
}

export default function QBOTMessage({ message }: QBOTMessageProps) {
  const isUser = message.sender === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'} animate-in zoom-in-95 duration-200`}>
        {/* Message Bubble */}
        <div 
          className={`
            px-4 py-2 rounded-2xl break-words
            ${isUser 
              ? 'bg-blue-500 text-white rounded-br-sm' 
              : 'bg-gray-100 text-gray-800 rounded-bl-sm'
            }
          `}
        >
          {/* Display attachments (images) */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-2 space-y-2">
              {message.attachments.map((attachment, index) => (
                <div key={index} className="max-w-xs">
                  {attachment.includes('image') || attachment.startsWith('pasted-image') ? (
                    <img
                      src={`/objects/${attachment}`}
                      alt="Uploaded image"
                      className="rounded-lg max-w-full h-auto border border-gray-200"
                      style={{ maxHeight: '200px' }}
                      onError={(e) => {
                        // Fallback if image fails to load
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
                      <span>📄 {attachment}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {message.text && message.text.trim() && (
            <div>{message.text}</div>
          )}
        </div>
        
        {/* Timestamp */}
        <div 
          className={`
            text-xs text-gray-400 mt-1 px-1
            ${isUser ? 'text-right' : 'text-left'}
          `}
        >
          {format(message.timestamp, 'HH:mm')}
        </div>
      </div>
    </div>
  );
}