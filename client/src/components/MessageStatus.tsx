import React from 'react';
import { Check, CheckCheck } from 'lucide-react';

interface MessageStatusProps {
  isRead?: boolean;
  isDelivered?: boolean;
  readAt?: string | Date | null;
  deliveredAt?: string | Date | null;
  className?: string;
}

export default function MessageStatus({
  isRead = false,
  isDelivered = false,
  readAt,
  deliveredAt,
  className = ""
}: MessageStatusProps) {
  // Determine status based on timestamps and flags
  const hasBeenRead = isRead || readAt;
  const hasBeenDelivered = isDelivered || deliveredAt;

  if (hasBeenRead) {
    // Double tick (blue) - Message has been read
    return (
      <div className={`flex items-center ${className}`} title="Read">
        <CheckCheck className="w-4 h-4 text-blue-500" />
      </div>
    );
  } else if (hasBeenDelivered) {
    // Single tick (gray) - Message has been delivered but not read
    return (
      <div className={`flex items-center ${className}`} title="Delivered">
        <Check className="w-4 h-4 text-gray-400" />
      </div>
    );
  }

  // No status (message pending/sending)
  return (
    <div className={`flex items-center ${className}`} title="Sending...">
      <div className="w-4 h-4 border border-gray-300 rounded-full animate-pulse" />
    </div>
  );
}