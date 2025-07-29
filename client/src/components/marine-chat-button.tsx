import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface MarineChatButtonProps {
  receiverId: string;
  receiverName: string;
  receiverRank?: string;
  size?: "sm" | "md" | "lg";
  variant?: "marine" | "ocean";
}

export default function MarineChatButton({ 
  receiverId, 
  receiverName, 
  receiverRank,
  size = "md",
  variant = "marine"
}: MarineChatButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();

  const connectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/chat/connect', 'POST', { receiverId });
    },
    onSuccess: () => {
      toast({
        title: "Chat Request Sent! ⚓",
        description: `Your message request has been sent to ${receiverName}. They can accept to start chatting.`,
        duration: 5000,
        className: "maritime-toast"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/connections'] });
      // Navigate to QChat page after sending connection request
      setTimeout(() => {
        setLocation('/qhf');
      }, 500);
    },
    onError: (error: any) => {
      toast({
        title: "Connection Issue 🌊",
        description: error.response?.data?.message || "Unable to send chat request. Please try again.",
        variant: "destructive",
        duration: 4000
      });
    },
    onSettled: () => {
      setIsConnecting(false);
    }
  });

  const handleConnect = async () => {
    setIsConnecting(true);
    connectMutation.mutate();
  };

  const getButtonSize = () => {
    switch (size) {
      case "sm": return "h-8 px-3 text-xs";
      case "lg": return "h-12 px-6 text-base";
      default: return "h-10 px-4 text-sm";
    }
  };

  const getIconSize = () => {
    switch (size) {
      case "sm": return 14;
      case "lg": return 20;
      default: return 16;
    }
  };

  const marineTheme = variant === "marine" 
    ? "bg-gradient-to-r from-navy to-blue-800 hover:from-blue-800 hover:to-navy text-white border-blue-900" 
    : "bg-gradient-to-r from-ocean-teal to-cyan-600 hover:from-cyan-600 hover:to-ocean-teal text-white border-cyan-700";

  return (
    <Button
      onClick={handleConnect}
      disabled={isConnecting || connectMutation.isPending}
      className={`
        ${marineTheme}
        ${getButtonSize()}
        font-semibold shadow-lg hover:shadow-xl 
        transition-all duration-300 transform hover:scale-105
        maritime-chat-button relative overflow-hidden
        group disabled:opacity-70 disabled:cursor-not-allowed
        border-2 backdrop-blur-sm
      `}
    >
      {/* Animated wave background effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent 
                     -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      
      <div className="relative flex items-center space-x-2">
        {isConnecting || connectMutation.isPending ? (
          <div className="animate-spin">
            <MessageCircle size={getIconSize()} />
          </div>
        ) : (
          <MessageCircle size={getIconSize()} />
        )}
        
        <span className="hidden sm:inline">
          {isConnecting || connectMutation.isPending ? "Connecting..." : "QChat"}
        </span>
        
        {receiverRank && size !== "sm" && (
          <Badge 
            variant="secondary" 
            className="bg-white/20 text-white border-white/30 text-xs ml-1"
          >
            {receiverRank}
          </Badge>
        )}
      </div>

      {/* Maritime anchor decoration */}
      <div className="absolute -top-1 -right-1 text-white/30 transform rotate-12">
        ⚓
      </div>
    </Button>
  );
}