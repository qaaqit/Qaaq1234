import { useEffect } from 'react';
import { X } from 'lucide-react';

interface QBOTChatContainerProps {
  isOpen: boolean;
  onClose: () => void;
  isMinimized?: boolean;
  children?: React.ReactNode;
}

export default function QBOTChatContainer({ isOpen, onClose, isMinimized = false, children }: QBOTChatContainerProps) {
  // Handle escape key to close chat
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isMinimized) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, isMinimized]);

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed top-16 left-0 right-0 z-10 transition-all duration-300 transform
        ${isMinimized 
          ? 'h-[30px] overflow-hidden'
          : 'h-[calc(100vh-4rem-70px)] overflow-visible'
        }
        bg-white shadow-xl border-b-2 border-orange-400
        flex flex-col`}
      role="dialog"
      aria-modal="true"
      aria-label="QBOT Chat"
    >
      {/* Chat content */}
      {children}
    </div>
  );
}