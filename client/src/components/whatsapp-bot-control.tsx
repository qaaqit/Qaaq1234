import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Power, PowerOff, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppStatus {
  connected: boolean;
  status: string;
}

export default function WhatsAppBotControl() {
  const [status, setStatus] = useState<WhatsAppStatus>({ connected: false, status: 'Disconnected' });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp-status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to check WhatsApp status:', error);
    }
  };

  const startBot = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/whatsapp-start', { method: 'POST' });
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "WhatsApp Bot Starting",
          description: "Check the server console for QR code to scan with WhatsApp",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to start WhatsApp bot",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start WhatsApp bot",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setTimeout(checkStatus, 2000);
    }
  };

  const stopBot = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/whatsapp-stop', { method: 'POST' });
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "WhatsApp Bot Stopped",
          description: data.message,
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to stop WhatsApp bot",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to stop WhatsApp bot",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setTimeout(checkStatus, 1000);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-green-600" />
          Discover Bot Assistant
        </CardTitle>
        <CardDescription>
          Help users discover nearby maritime professionals via WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <Badge variant={status.connected ? "default" : "secondary"}>
            {status.status}
          </Badge>
        </div>

        <div className="flex gap-2">
          {!status.connected ? (
            <Button 
              onClick={startBot} 
              disabled={isLoading}
              className="flex-1"
              size="sm"
            >
              <Power className="h-4 w-4 mr-2" />
              {isLoading ? 'Starting...' : 'Start Bot'}
            </Button>
          ) : (
            <Button 
              onClick={stopBot} 
              disabled={isLoading}
              variant="outline"
              className="flex-1"
              size="sm"
            >
              <PowerOff className="h-4 w-4 mr-2" />
              {isLoading ? 'Stopping...' : 'Stop Bot'}
            </Button>
          )}
        </div>

        {status.connected && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Smartphone className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-xs text-green-800 dark:text-green-200">
                <p className="font-medium">Bot is active!</p>
                <p>Users can discover maritime professionals nearby</p>
              </div>
            </div>
          </div>
        )}

        {!status.connected && (
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <p><strong>How to connect:</strong></p>
            <p>1. Click "Start Bot"</p>
            <p>2. Scan QR code in server console with WhatsApp</p>
            <p>3. Bot will help users discover maritime professionals</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}