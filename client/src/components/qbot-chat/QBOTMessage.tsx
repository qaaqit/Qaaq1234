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
          {message.text}
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