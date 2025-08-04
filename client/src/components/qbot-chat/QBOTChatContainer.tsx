import { useEffect } from 'react';
import { X } from 'lucide-react';

interface QBOTChatContainerProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}

export default function QBOTChatContainer({ isOpen, onClose, children }: QBOTChatContainerProps) {
  // Handle escape key to close chat
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when chat is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - click to close on desktop */}
      <div 
        className="fixed inset-0 bg-black/50 z-[9999] transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Chat Container */}
      <div 
        className="fixed z-[10000] transition-all duration-300 transform
          sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
          inset-0 sm:inset-auto
          sm:w-[400px] sm:h-[600px] sm:rounded-lg
          w-full h-full
          bg-white shadow-xl sm:border sm:border-gray-200
          flex flex-col
          animate-in fade-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 sm:zoom-in-95"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="QBOT Chat"
      >
        {/* Chat content */}
        {children}
      </div>
    </>
  );
}