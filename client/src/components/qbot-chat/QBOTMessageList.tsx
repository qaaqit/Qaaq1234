import { useEffect, useRef } from 'react';
import QBOTMessage from './QBOTMessage';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  attachments?: string[];
}

interface QBOTMessageListProps {
  messages: Message[];
}

export default function QBOTMessageList({ messages }: QBOTMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 scrollbar-hide"
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitScrollbar: { display: 'none' }
      }}
    >
      {messages.map((message) => (
        <QBOTMessage 
          key={message.id} 
          message={message} 
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}