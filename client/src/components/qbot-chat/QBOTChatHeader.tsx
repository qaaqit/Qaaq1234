import { Trash2 } from 'lucide-react';

interface QBOTChatHeaderProps {
  onClear?: () => void;
}

export default function QBOTChatHeader({ onClear }: QBOTChatHeaderProps) {
  return (
    <div className="relative z-10 h-[50px] bg-gradient-to-r from-red-500 to-orange-500 shadow-lg flex items-center justify-between px-4 flex-shrink-0">
      {/* Left: Clear/Trash Icon */}
      <button
        onClick={onClear}
        className="p-2 rounded-full hover:bg-white/10 transition-colors"
        aria-label="Clear chat"
        title="Clear chat history"
      >
        <Trash2 size={18} className="text-white" />
      </button>

      {/* Center: QBOT AI Text */}
      <h2 className="text-white font-bold text-lg tracking-wide">
        QBOT AI Assistant
      </h2>

      {/* Right: Spacer for symmetry */}
      <div className="w-10" />
    </div>
  );
}