import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageSquare, Phone, Send } from 'lucide-react';

interface WhatsAppStatus {
  connected: boolean;
  status: string;
}

export default function WhatsAppTestPanel() {
  const [isStarting, setIsStarting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('9029010070');
  const [message, setMessage] = useState('🤖 Test message from QBOTwa Maritime Assistant!\n\nHello! This is a test message to verify your WhatsApp Business (+905363694997) connection is working properly.\n\n⚡ Ready to serve maritime professionals with AI-powered assistance!');
  const { toast } = useToast();

  const startBot = async () => {
    setIsStarting(true);
    try {
      const response = await fetch('/api/whatsapp-start', {
        method: 'POST',
      });
      
      if (response.ok) {
        toast({
          title: "WhatsApp Bot Started",
          description: "QBOTwa is initializing. Check the console for QR code if needed.",
        });
      } else {
        throw new Error('Failed to start bot');
      }
    } catch (error) {
      toast({
        title: "Start Failed",
        description: "Could not start WhatsApp bot. Check server logs.",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp-status');
      if (response.ok) {
        const statusData = await response.json();
        setStatus(statusData);
      }
    } catch (error) {
      console.error('Failed to check status:', error);
    }
  };

  const forceQRGeneration = async () => {
    setIsGeneratingQR(true);
    try {
      const response = await fetch('/api/whatsapp-force-qr', {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "QR Generation Started",
          description: "Check server console for QR code in 5-10 seconds",
        });
      } else {
        throw new Error(result.error || 'Failed to generate QR');
      }
    } catch (error) {
      toast({
        title: "QR Generation Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const sendTestMessage = async () => {
    setIsSending(true);
    try {
      const response = await fetch('/api/whatsapp-test-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          message: message,
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        toast({
          title: "Message Sent Successfully!",
          description: `Test message sent to +91${phoneNumber}`,
        });
      } else {
        throw new Error(result.error || 'Failed to send message');
      }
    } catch (error) {
      toast({
        title: "Send Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  React.useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            QBOTwa WhatsApp Test Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Section */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <p className="text-sm font-medium">Connection Status</p>
              <p className="text-xs text-muted-foreground">
                {status ? status.status : 'Loading...'}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={checkStatus}
              >
                Refresh Status
              </Button>
              <Button
                onClick={startBot}
                disabled={isStarting}
                size="sm"
              >
                {isStarting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Start Bot
              </Button>
              <Button
                onClick={forceQRGeneration}
                disabled={isGeneratingQR}
                size="sm"
                variant="secondary"
              >
                {isGeneratingQR && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Force QR Code
              </Button>
            </div>
          </div>

          {/* Test Message Section */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="phone">Test Phone Number (India)</Label>
              <div className="flex">
                <div className="flex items-center px-3 bg-slate-100 border border-r-0 rounded-l-md text-sm">
                  <Phone className="h-4 w-4 mr-1" />
                  +91
                </div>
                <Input
                  id="phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="9029010070"
                  className="rounded-l-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Test Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                placeholder="Enter your test message..."
              />
            </div>

            <Button
              onClick={sendTestMessage}
              disabled={isSending}
              className="w-full"
            >
              {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Send className="mr-2 h-4 w-4" />
              Send Test Message
            </Button>
          </div>

          {/* Instructions */}
          <div className="p-3 bg-blue-50 rounded-lg text-sm">
            <p className="font-medium text-blue-900 mb-1">Instructions:</p>
            <ul className="text-blue-800 space-y-1 list-disc list-inside">
              <li>Start the bot first (it will show QR code in server console)</li>
              <li>Scan QR code with WhatsApp Business +905363694997</li>
              <li>Status may show "Disconnected" due to container limitations</li>
              <li>Test messages will still work if your phone shows "ACTIVE"</li>
              <li>Default test number is +919029010070</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}