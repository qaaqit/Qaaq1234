import { MessageCircle } from 'lucide-react';

export default function QBOTWelcomeState() {
  return (
    <div className="h-full flex items-center justify-center p-8 animate-in fade-in duration-500">
      <div className="text-center max-w-sm">
        {/* Large Chat Bubble Icon */}
        <div className="flex justify-center mb-6">
          <MessageCircle 
            size={60} 
            className="text-gray-400" 
            strokeWidth={1.5}
          />
        </div>
        
        {/* Welcome Text */}
        <h3 className="text-2xl font-semibold text-gray-700 mb-3">
          Welcome!
        </h3>
        
        {/* Description */}
        <p className="text-sm text-gray-500 leading-relaxed">
          Start a conversation with our merchant navy community.
        </p>
      </div>
    </div>
  );
}