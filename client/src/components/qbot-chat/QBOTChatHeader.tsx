import { Trash2, ChevronUp, ChevronDown } from 'lucide-react';

interface QBOTChatHeaderProps {
  onClear?: () => void;
  onToggleMinimize?: () => void;
  isMinimized?: boolean;
}

export default function QBOTChatHeader({ 
  onClear, 
  onToggleMinimize, 
  isMinimized = false 
}: QBOTChatHeaderProps) {
  return (
    <div className="relative z-10 h-[60px] bg-gradient-to-r from-red-500 to-orange-500 shadow-lg flex items-center justify-between px-4 flex-shrink-0 pointer-events-none">
      {/* Left: Clear/Trash Icon - Hide when minimized */}
      {!isMinimized && (
        <button
          onClick={onClear}
          className="p-2 rounded-full hover:bg-white/10 transition-colors pointer-events-auto"
          aria-label="Clear chat"
          title="Clear chat history"
        >
          <Trash2 size={20} className="text-white" />
        </button>
      )}
      {isMinimized && <div className="w-10" />}

      {/* Center: QBOT AI Text */}
      <h2 className="text-white font-bold text-lg tracking-wide">
        QBOT AI
      </h2>

      {/* Right: Minimize Toggle Icon */}
      <button
        onClick={onToggleMinimize}
        className="p-2 rounded-full hover:bg-white/10 transition-colors z-20 pointer-events-auto"
        aria-label={isMinimized ? "Expand chat" : "Minimize chat"}
        title={isMinimized ? "Expand chat" : "Minimize chat"}
      >
        {isMinimized ? (
          <ChevronUp size={20} className="text-white" />
        ) : (
          <ChevronDown size={20} className="text-white" />
        )}
      </button>
    </div>
  );
}