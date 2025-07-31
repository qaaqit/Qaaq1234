import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface MessageNotificationDotProps {
  userId: string;
  className?: string;
}

export default function MessageNotificationDot({ userId, className = "" }: MessageNotificationDotProps) {
  const { user } = useAuth();

  // Fetch unread message counts
  const { data: unreadCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ['/api/chat/unread-counts'],
    refetchInterval: 3000, // Check for new messages every 3 seconds
    enabled: !!user?.id,
  });

  const unreadCount = unreadCounts[userId] || 0;

  if (unreadCount === 0) return null;

  return (
    <div className={`absolute -top-1 -right-1 z-20 ${className}`}>
      <div className="relative">
        {/* Pulsing background animation */}
        <div className="absolute inset-0 w-5 h-5 bg-red-500 rounded-full animate-ping opacity-75" />
        
        {/* Main notification dot */}
        <div className="relative w-5 h-5 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
          <span className="text-[10px] font-bold text-white leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        </div>
      </div>
    </div>
  );
}