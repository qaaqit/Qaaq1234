// WebSocket service for real-time messaging
export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private token: string | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private connectionHandlers: Set<(connected: boolean) => void> = new Set();

  constructor() {
    this.token = localStorage.getItem('token');
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.authenticate();
        this.notifyConnectionHandlers(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data.type);
          
          // Handle different message types
          const handler = this.messageHandlers.get(data.type);
          if (handler) {
            handler(data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.notifyConnectionHandlers(false);
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.attemptReconnect();
    }
  }

  private authenticate() {
    if (!this.token || !this.ws) return;

    this.send({
      type: 'auth',
      token: this.token
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectInterval);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected, message not sent:', data);
    }
  }

  // Send a chat message
  sendMessage(connectionId: string, message: string) {
    this.send({
      type: 'send_message',
      connectionId,
      message
    });
  }

  // Send typing indicator
  sendTypingIndicator(connectionId: string, isTyping: boolean) {
    this.send({
      type: 'typing',
      connectionId,
      isTyping
    });
  }

  // Add message handler
  onMessage(type: string, handler: (data: any) => void) {
    this.messageHandlers.set(type, handler);
  }

  // Remove message handler
  offMessage(type: string) {
    this.messageHandlers.delete(type);
  }

  // Add connection status handler
  onConnectionChange(handler: (connected: boolean) => void) {
    this.connectionHandlers.add(handler);
  }

  // Remove connection status handler
  offConnectionChange(handler: (connected: boolean) => void) {
    this.connectionHandlers.delete(handler);
  }

  private notifyConnectionHandlers(connected: boolean) {
    this.connectionHandlers.forEach(handler => handler(connected));
  }

  // Update token
  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  // Check if connected
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();