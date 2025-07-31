import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, MessageCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SingleMessageChatProps {
  receiverId: string;
  receiverName: string;
  receiverRank?: string;
  onClose?: () => void;
}

export default function SingleMessageChat({ 
  receiverId, 
  receiverName, 
  receiverRank,
  onClose
}: SingleMessageChatProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      // First create connection if it doesn't exist
      await apiRequest('/api/chat/connect', 'POST', { receiverId });
      
      // Then send the message (this will be handled by the backend)
      return await apiRequest('/api/chat/send-initial', 'POST', { 
        receiverId, 
        message: message.trim() 
      });
    },
    onSuccess: () => {
      setMessageSent(true);
      setMessage("");
      toast({
        title: "Message Sent! ⚓",
        description: `Your message has been sent to ${receiverName}. They'll see it when they accept your chat request.`,
        duration: 5000,
        className: "maritime-toast"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/connections'] });
      
      // Auto close after successful send
      setTimeout(() => {
        onClose?.();
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Message Failed 🌊",
        description: error.response?.data?.message || "Unable to send message. Please try again.",
        variant: "destructive",
        duration: 4000
      });
    },
    onSettled: () => {
      setIsSending(false);
    }
  });

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    setIsSending(true);
    sendMessageMutation.mutate();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (messageSent) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="font-semibold text-gray-900 mb-2">Message Sent!</h3>
        <p className="text-sm text-gray-600">
          {receiverName} will see your message when they accept your chat request.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Send a message to {receiverName}
          {receiverRank && ` (${receiverRank})`}
        </label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message here... (Press Enter to send)"
          className="min-h-[100px] resize-none"
          maxLength={500}
          disabled={isSending}
        />
        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-500">
            {message.length}/500 characters
          </p>
          <p className="text-xs text-gray-500">
            One message until they accept
          </p>
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button
          onClick={onClose}
          variant="outline"
          className="flex-1"
          disabled={isSending}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSendMessage}
          disabled={!message.trim() || isSending}
          className="flex-1 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white"
        >
          {isSending ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send Message
            </>
          )}
        </Button>
      </div>
    </div>
  );
}