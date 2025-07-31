import WebSocket, { WebSocketServer } from 'ws';
import { Server } from 'http';

interface AISProxyOptions {
  server: Server;
}

interface ClientConnection {
  id: string;
  ws: WebSocket;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export class AISProxy {
  private clients: Map<string, ClientConnection> = new Map();
  private aisConnection: WebSocket | null = null;
  private wss: WebSocketServer;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private isConnecting = false;

  constructor(options: AISProxyOptions) {
    this.wss = new WebSocketServer({ 
      server: options.server,
      path: '/api/ais-stream'
    });

    this.wss.on('connection', this.handleClientConnection.bind(this));
    this.connectToAIS();
  }

  private generateClientId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private handleClientConnection(ws: WebSocket) {
    const clientId = this.generateClientId();
    console.log(`🚢 AIS Client connected: ${clientId}`);

    const client: ClientConnection = {
      id: clientId,
      ws,
    };

    this.clients.set(clientId, client);

    // Handle client messages (e.g., bounds updates)
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'setBounds' && message.bounds) {
          client.bounds = message.bounds;
          console.log(`📍 Client ${clientId} set bounds:`, message.bounds);
        }
      } catch (error) {
        console.error('Error parsing client message:', error);
      }
    });

    ws.on('close', () => {
      console.log(`🚢 AIS Client disconnected: ${clientId}`);
      this.clients.delete(clientId);
    });

    ws.on('error', (error) => {
      console.error(`AIS Client error (${clientId}):`, error);
      this.clients.delete(clientId);
    });

    // Send connection status
    this.sendToClient(clientId, {
      type: 'status',
      connected: !!this.aisConnection && this.aisConnection.readyState === WebSocket.OPEN,
      clientId
    });
  }

  private connectToAIS() {
    if (this.isConnecting || (this.aisConnection && this.aisConnection.readyState === WebSocket.OPEN)) {
      return;
    }

    const apiKey = process.env.AISSTREAM_API_KEY;
    if (!apiKey) {
      console.error('❌ AISSTREAM_API_KEY not found in environment');
      this.scheduleReconnect();
      return;
    }

    this.isConnecting = true;
    console.log('🚢 Connecting to AISStream.io...');

    try {
      this.aisConnection = new WebSocket('wss://stream.aisstream.io/v0/stream');

      this.aisConnection.on('open', () => {
        console.log('✅ Connected to AISStream.io');
        this.isConnecting = false;

        // Subscribe to AIS messages with broader filter to get more ships
        const subscription = {
          APIKey: apiKey,
          FilterMessageTypes: ["PositionReport"],
          FiltersShipAndCargo: {
            MessageTypes: [1, 2, 3, 4, 5] // Include more message types
          }
        };

        this.aisConnection?.send(JSON.stringify(subscription));
        console.log('📡 Subscribed to AIS position reports with filter:', JSON.stringify(subscription, null, 2));
        
        // Monitor connection status
        setTimeout(() => {
          console.log('📊 AIS Status: Connected and monitoring global ship traffic...');
        }, 30000);

        // Notify all clients of connection
        this.broadcastToClients({
          type: 'status',
          connected: true
        });
      });

      this.aisConnection.on('message', (data) => {
        try {
          const aisMessage = JSON.parse(data.toString());
          console.log('📡 Received AIS message:', aisMessage.MessageType || 'Unknown type');
          
          if (aisMessage.MessageType === "PositionReport") {
            const message = aisMessage.Message;
            const metadata = aisMessage.MetaData;
            
            console.log('🚢 Processing ship position:', {
              mmsi: metadata?.MMSI,
              name: metadata?.ShipName,
              lat: message?.Latitude,
              lng: message?.Longitude
            });
            
            if (message && metadata && message.Latitude && message.Longitude) {
              const shipData = {
                type: 'shipUpdate',
                ship: {
                  id: metadata.MMSI?.toString() || `ship_${Date.now()}`,
                  name: metadata.ShipName || 'Unknown Vessel',
                  latitude: message.Latitude,
                  longitude: message.Longitude,
                  speed: message.Sog || 0,
                  course: message.Cog || 0,
                  heading: message.Heading || 0,
                  mmsi: metadata.MMSI?.toString() || '',
                  shipType: metadata.ShipType || 0,
                  destination: metadata.Destination || '',
                  eta: metadata.Eta || '',
                  callSign: metadata.CallSign || '',
                  imo: metadata.Imo?.toString() || '',
                  timestamp: Date.now()
                }
              };

              console.log(`📤 Broadcasting ship data to ${this.clients.size} clients`);

              // Filter by client bounds if specified
              this.broadcastToClients(shipData, (client) => {
                if (!client.bounds) return true;
                
                const { latitude, longitude } = shipData.ship;
                const { north, south, east, west } = client.bounds;
                
                return latitude >= south && latitude <= north && 
                       longitude >= west && longitude <= east;
              });
            }
          }
        } catch (error) {
          console.error('Error processing AIS message:', error);
        }
      });

      this.aisConnection.on('error', (error) => {
        console.error('❌ AISStream connection error:', error);
        this.isConnecting = false;
        this.broadcastToClients({
          type: 'status',
          connected: false,
          error: 'Connection error'
        });
        this.scheduleReconnect();
      });

      this.aisConnection.on('close', () => {
        console.log('🔌 AISStream connection closed');
        this.isConnecting = false;
        this.aisConnection = null;
        this.broadcastToClients({
          type: 'status',
          connected: false
        });
        this.scheduleReconnect();
      });

    } catch (error) {
      console.error('❌ Failed to connect to AISStream:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
    }

    this.reconnectInterval = setTimeout(() => {
      console.log('🔄 Attempting to reconnect to AISStream...');
      this.connectToAIS();
    }, 10000); // Reconnect after 10 seconds
  }

  private sendToClient(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  private broadcastToClients(message: any, filter?: (client: ClientConnection) => boolean) {
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        if (!filter || filter(client)) {
          client.ws.send(JSON.stringify(message));
        }
      }
    });
  }

  public close() {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
    }

    if (this.aisConnection) {
      this.aisConnection.close();
    }

    this.wss.close();
  }
}