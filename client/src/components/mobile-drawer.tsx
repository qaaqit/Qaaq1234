
import React, { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useSwipe } from '../hooks/use-touch';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  position?: 'bottom' | 'right';
}

export function MobileDrawer({ 
  isOpen, 
  onClose, 
  children, 
  title,
  position = 'bottom' 
}: MobileDrawerProps) {
  const { swipeDirection, onTouchStart, onTouchMove, onTouchEnd } = useSwipe(100);

  React.useEffect(() => {
    if (swipeDirection.direction === 'down' && position === 'bottom') {
      onClose();
    } else if (swipeDirection.direction === 'right' && position === 'right') {
      onClose();
    }
  }, [swipeDirection, onClose, position]);

  if (!isOpen) return null;

  const drawerClasses = position === 'bottom' 
    ? 'bottom-0 left-0 right-0 rounded-t-3xl max-h-[85vh]'
    : 'top-0 right-0 bottom-0 w-full sm:w-96 rounded-l-3xl';

  return (
    <div className="fixed inset-0 z-[9999] lg:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className={`absolute bg-white shadow-2xl transform transition-transform duration-300 ${drawerClasses}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Handle indicator for bottom drawer */}
        {position === 'bottom' && (
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full swipe-indicator" />
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          {title && (
            <h2 className="text-lg font-semibold text-gray-900 mobile-text-lg">
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors touch-manipulation"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto mobile-nav-safe">
          {children}
        </div>
      </div>
    </div>
  );
}
