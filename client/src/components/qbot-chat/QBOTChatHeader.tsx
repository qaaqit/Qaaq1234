import { Trash2, Maximize2, Minimize2 } from 'lucide-react';

interface QBOTChatHeaderProps {
  onClear?: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

export default function QBOTChatHeader({ 
  onClear, 
  onToggleFullscreen, 
  isFullscreen = false 
}: QBOTChatHeaderProps) {
  return (
    <div className="relative h-[60px] bg-gradient-to-r from-red-500 to-orange-500 shadow-lg flex items-center justify-between px-4 sm:rounded-t-lg">
      {/* Left: Clear/Trash Icon */}
      <button
        onClick={onClear}
        className="p-2 rounded-full hover:bg-white/10 transition-colors"
        aria-label="Clear chat"
        title="Clear chat history"
      >
        <Trash2 size={20} className="text-white" />
      </button>

      {/* Center: QBOT AI Text */}
      <h2 className="text-white font-bold text-lg tracking-wide">
        QBOT AI
      </h2>

      {/* Right: Fullscreen Toggle Icon */}
      <button
        onClick={onToggleFullscreen}
        className="p-2 rounded-full hover:bg-white/10 transition-colors"
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFullscreen ? (
          <Minimize2 size={20} className="text-white" />
        ) : (
          <Maximize2 size={20} className="text-white" />
        )}
      </button>
    </div>
  );
}